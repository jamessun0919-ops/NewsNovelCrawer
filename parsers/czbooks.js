const cheerio = require('cheerio');

function normalizeUrl(href) {
  if (!href) return null;
  return href.startsWith('//') ? `https:${href}` : href;
}

function parseChapterList(html) {
  const $ = cheerio.load(html);
  const chapters = [];

  $('ul#chapter-list > li').each((_, el) => {
    const a = $(el).find('a').first();
    if (!a.length) return; // volume divider <li> has no <a>
    const title = a.text().trim();
    const url = normalizeUrl(a.attr('href'));
    if (title && url) chapters.push({ title, url });
  });

  return chapters;
}

function parseChapter(html) {
  const $ = cheerio.load(html);
  const rawName = $('div.name').first().text().trim();
  const title = rawName.replace(/^《[^》]*》/, '').trim();
  const contentHtml = $('div.content').first().html() || '';
  const nextUrl = normalizeUrl($('a.next-chapter').attr('href'));
  const prevUrl = normalizeUrl($('a.prev-chapter').attr('href'));
  return { title, contentHtml, nextUrl, prevUrl };
}

module.exports = { parseChapterList, parseChapter };
