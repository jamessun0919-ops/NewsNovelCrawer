const cheerio = require('cheerio');

function absoluteUrl(href) {
  if (!href) return null;
  return href.startsWith('http') ? href : `https://tw.hjwzw.com${href}`;
}

function parseChapterList(html) {
  const $ = cheerio.load(html);
  const chapters = [];

  $('#tbchapterlist a').each((_, el) => {
    const title = $(el).text().trim();
    const url = absoluteUrl($(el).attr('href'));
    if (title && url) chapters.push({ title, url });
  });

  return chapters;
}

function parseChapter(html) {
  const $ = cheerio.load(html);
  const title = $('h1').first().text().trim();

  // The content div's inline style is duplicated by a short "remember our
  // domain" ad div further down the page; the real content is always first.
  const contentEl = $('div[style*="text-indent: 2em"]').first();
  // Leading text + <b> is a "remember our domain" reminder, not wrapped in a <p>.
  contentEl.contents().slice(0, 2).remove();
  // First <p> child left is the book/chapter title repeated as plain text, not article content.
  contentEl.find('p').first().remove();
  const contentHtml = contentEl.html() || '';

  let prevUrl = null;
  let nextUrl = null;
  $('a').each((_, a) => {
    const text = $(a).text().trim();
    const href = $(a).attr('href');
    // First chapter's "prev" link points to chapter id 0 as a dead-end sentinel.
    if (text === '上一章' && href && !/,0$/.test(href)) prevUrl = absoluteUrl(href);
    if (text === '下一章') nextUrl = absoluteUrl(href);
  });

  return { title, contentHtml, nextUrl, prevUrl };
}

module.exports = { parseChapterList, parseChapter };
