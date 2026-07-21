require('dotenv').config();
const express = require('express');
const path = require('path');
const { execFile } = require('child_process');
const { promisify } = require('util');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const { loadTargets } = require('./targetParser');
const technews = require('./parsers/technews');
const czbooks = require('./parsers/czbooks');
const hjwzw = require('./parsers/hjwzw');

const execFileAsync = promisify(execFile);

const app = express();
const PORT = process.env.PORT || 3000;

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const articleCache = new Map(); // url -> { title, contentHtml, ... }
const chapterListCache = new Map(); // novelUrl -> [{ title, url }]

async function fetchHtml(url) {
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

// czbooks.net sits behind Cloudflare bot detection that fingerprints Node's
// fetch (undici) and blocks it with 403, even with identical headers to curl.
// Shelling out to curl passes the same check, so czbooks requests use this instead.
async function fetchHtmlViaCurl(url) {
  const { stdout } = await execFileAsync('curl', ['-s', '-A', UA, url], {
    maxBuffer: 20 * 1024 * 1024,
  });
  if (!stdout) throw new Error('empty response');
  return stdout;
}

// Per-site adapter lookup for novel sources: each site has its own HTML
// structure and its own bot-detection quirks (see fetchHtmlViaCurl above).
function getNovelSite(url) {
  const hostname = new URL(url).hostname;
  if (hostname.endsWith('czbooks.net')) return { parser: czbooks, fetchHtml: fetchHtmlViaCurl };
  if (hostname.endsWith('hjwzw.com')) return { parser: hjwzw, fetchHtml };
  throw new Error('不支援的小說來源網站');
}

app.set('trust proxy', 1);
app.use(express.json());

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: 'auto',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 天
  },
}));

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: '登入嘗試次數過多，請 15 分鐘後再試' },
});

// 登入頁與其樣式表在驗證前即可存取
app.get('/login.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});
app.get('/style.css', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'style.css'));
});

app.post('/api/login', loginLimiter, async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: '請輸入帳號與密碼' });
  }
  const validUsername = username === process.env.AUTH_USERNAME;
  const validPassword = validUsername
    ? await bcrypt.compare(password, process.env.AUTH_PASSWORD_HASH)
    : false;
  if (!validUsername || !validPassword) {
    return res.status(401).json({ error: '帳號或密碼錯誤' });
  }
  req.session.regenerate((err) => {
    if (err) return res.status(500).json({ error: '登入失敗，請重試' });
    req.session.authenticated = true;
    res.json({ ok: true });
  });
});

app.post('/api/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.json({ ok: true });
  });
});

function requireAuth(req, res, next) {
  if (req.session && req.session.authenticated) return next();
  if (req.path.startsWith('/api/')) return res.status(401).json({ error: '未登入' });
  return res.redirect('/login.html');
}

app.use(requireAuth);

app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/sources', (req, res) => {
  const { type } = req.query;
  const all = loadTargets();
  const filtered = type ? all.filter((t) => t.type === type) : all;
  res.json(filtered);
});

app.get('/api/news/list', async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: '缺少網址參數' });
  try {
    const html = await fetchHtml(url);
    const { articles, nextPageUrl, prevPageUrl } = technews.parseList(html);
    res.json({ sourceUrl: url, articles, nextPageUrl, prevPageUrl });
  } catch (err) {
    res.status(502).json({ error: `列表抓取失敗：${err.message}` });
  }
});

app.get('/api/news/article', async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: '缺少網址參數' });
  try {
    if (articleCache.has(url)) return res.json(articleCache.get(url));
    const html = await fetchHtml(url);
    const article = technews.parseArticle(html);
    articleCache.set(url, article);
    res.json(article);
  } catch (err) {
    res.status(502).json({ error: `內文抓取失敗：${err.message}` });
  }
});

app.get('/api/novel/chapters', async (req, res) => {
  const { url, page = '1', pageSize = '50' } = req.query;
  if (!url) return res.status(400).json({ error: '缺少網址參數' });
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const size = Math.max(1, parseInt(pageSize, 10) || 50);
  try {
    let chapters = chapterListCache.get(url);
    if (!chapters) {
      const { parser, fetchHtml: fetchHtmlForSite } = getNovelSite(url);
      const html = await fetchHtmlForSite(url);
      chapters = parser.parseChapterList(html);
      chapterListCache.set(url, chapters);
    }
    const totalChapters = chapters.length;
    const totalPages = Math.max(1, Math.ceil(totalChapters / size));
    const start = (pageNum - 1) * size;
    const pageItems = chapters.slice(start, start + size).map((c, i) => ({
      ...c,
      chapterNumber: start + i + 1,
    }));
    res.json({ chapters: pageItems, page: pageNum, pageSize: size, totalChapters, totalPages });
  } catch (err) {
    res.status(502).json({ error: `章節目錄抓取失敗：${err.message}` });
  }
});

app.get('/api/novel/chapter', async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: '缺少網址參數' });
  try {
    if (articleCache.has(url)) return res.json(articleCache.get(url));
    const { parser, fetchHtml: fetchHtmlForSite } = getNovelSite(url);
    const html = await fetchHtmlForSite(url);
    const chapter = parser.parseChapter(html);
    articleCache.set(url, chapter);
    res.json(chapter);
  } catch (err) {
    res.status(502).json({ error: `章節內文抓取失敗：${err.message}` });
  }
});

app.listen(PORT, () => {
  console.log(`NEWScrawer running at http://localhost:${PORT}`);
});
