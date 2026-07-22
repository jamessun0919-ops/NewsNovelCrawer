const cheerio = require('cheerio');

function absoluteUrl(href, sourceUrl) {
  if (!href) return null;
  return new URL(href, sourceUrl).href;
}

function parseChapterList(html, sourceUrl) {
  const $ = cheerio.load(html);
  const chapters = [];

  $('div.catalog ul li a').each((_, a) => {
    const title = $(a).text().trim();
    const url = absoluteUrl($(a).attr('href'), sourceUrl);
    if (title && url) chapters.push({ title, url });
  });

  return chapters;
}

function parseChapter(html, sourceUrl) {
  const $ = cheerio.load(html);
  const title = $('h1').first().text().trim();
  const contentHtml = $('#mycontent').html() || '';

  let prevUrl = null;
  let nextUrl = null;
  $('div.mPage a').each((_, a) => {
    const text = $(a).text().trim();
    const href = $(a).attr('href');
    if (text === '上一节') prevUrl = absoluteUrl(href, sourceUrl);
    if (text === '下一节') nextUrl = absoluteUrl(href, sourceUrl);
  });
  // On the last section, "下一节" points back to the current page instead of
  // being absent (site bug), which would otherwise loop the reader in place.
  if (nextUrl === sourceUrl) nextUrl = null;

  return { title, contentHtml, nextUrl, prevUrl };
}

module.exports = { parseChapterList, parseChapter };
