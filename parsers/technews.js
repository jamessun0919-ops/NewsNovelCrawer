const cheerio = require('cheerio');

function parseList(html) {
  const $ = cheerio.load(html);
  const articles = [];

  $('h1.entry-title > a').each((_, el) => {
    const title = $(el).text().trim();
    const url = $(el).attr('href');
    if (title && url) articles.push({ title, url });
  });

  let nextPageUrl = null;
  let prevPageUrl = null;
  $('div.pagination a').each((_, el) => {
    const text = $(el).text().trim();
    const href = $(el).attr('href');
    if (!href) return;
    if (text.includes('下一頁')) nextPageUrl = href;
    if (text.includes('上一頁')) prevPageUrl = href;
  });

  return { articles, nextPageUrl, prevPageUrl };
}

function parseArticle(html) {
  const $ = cheerio.load(html);
  const title = $('h1.entry-title').first().text().trim();
  const content = $('div.entry-content').first();

  // "延伸閱讀" and everything after it is related-link/ad clutter, not article body.
  const extendedReading = content.find('.extended-reading-section').first();
  if (extendedReading.length) {
    extendedReading.nextAll().remove();
    extendedReading.remove();
  }
  // Widgets/modals (coffee-tip, AI Q&A, ad slots) are hidden by the site's own CSS/JS
  // and only make sense there; scraped as static HTML they'd otherwise render inline.
  content.find([
    '.no-ad-env',
    '.newsLetter_articleContent',
    '#_popIn_recommend',
    '.tn-modal',
    '[style*="display:none"]',
    '[style*="display: none"]',
    'script',
    'style',
  ].join(', ')).remove();

  return { title, contentHtml: content.html() || '' };
}

module.exports = { parseList, parseArticle };
