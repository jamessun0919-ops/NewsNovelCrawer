const cheerio = require('cheerio');

function absoluteUrl(href) {
  if (!href) return null;
  return href.startsWith('http') ? href : `https://www.52shuku.net${href}`;
}

function parseChapterList(html) {
  const $ = cheerio.load(html);
  const chapters = [];

  // The book intro page doubles as the full chapter directory; the site
  // labels entries "第N页" (page-based, no per-chapter titles exist), so we
  // relabel to "第N章" to match the other novel sources in this app.
  $('ul.list.clearfix li.mulu a').each((i, el) => {
    const url = absoluteUrl($(el).attr('href'));
    if (url) chapters.push({ title: `第${i + 1}章`, url });
  });

  return chapters;
}

function parseChapter(html) {
  const $ = cheerio.load(html);
  // Page title ends in "(N)" where N is the page number; page N is chapter N-1
  // (page 1 is the book intro, chapter 1 starts at page 2). Reformat to match
  // the "第N章" labeling used in parseChapterList and by other novel sources.
  const pageMatch = $('title').text().match(/\((\d+)\)/);
  const title = pageMatch ? `第${parseInt(pageMatch[1], 10) - 1}章` : '';

  const contentEl = $('article.article-content');
  const paragraphs = contentEl
    .find('p')
    .map((_, p) => $(p).html())
    .get()
    .filter((p) => p && p.trim())
    // Every chapter page ends with a "follow our domain" promo paragraph mixed
    // into the content, not real story text.
    .filter((p) => !p.includes('52书库'));
  const contentHtml = paragraphs.map((p) => `<p>${p}</p>`).join('');

  let prevUrl = null;
  let nextUrl = null;
  $('a').each((_, a) => {
    const text = $(a).text().trim();
    const href = $(a).attr('href');
    // First chapter's "prev" link points back to the book intro page
    // (e.g. h74i.html), not a real chapter page (h74i_N.html).
    if (text === '上一页' && href && /_\d+\.html$/.test(href)) prevUrl = absoluteUrl(href);
    if (text === '下一页' && href) nextUrl = absoluteUrl(href);
  });

  return { title, contentHtml, nextUrl, prevUrl };
}

module.exports = { parseChapterList, parseChapter };
