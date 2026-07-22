const cheerio = require('cheerio');

function absoluteUrl(href) {
  if (!href) return null;
  const trimmed = href.trim();
  return trimmed.startsWith('http') ? trimmed : `https://www.xbanxia.cc${trimmed}`;
}

function parseChapterList(html) {
  const $ = cheerio.load(html);
  const chapters = [];

  $('div.book-list ul li a').each((_, el) => {
    const title = $(el).attr('title') || $(el).text().trim();
    const url = absoluteUrl($(el).attr('href'));
    if (title && url) chapters.push({ title, url });
  });

  return chapters;
}

function parseChapter(html) {
  const $ = cheerio.load(html);
  const title = $('#nr_title').first().text().trim();
  const contentEl = $('#nr1');

  // Placeholder wrapper div the site injects before the real text.
  contentEl.find('div[style*="height: 0"]').remove();
  // Site tagline appended after the real content ends.
  contentEl.find('span').filter((_, el) => $(el).text().trim() === '半夏小說，快樂很多').remove();

  // The chapter title is repeated as a bare text node (not a <p>) right before
  // the real content; strip it and the <br> immediately after it.
  const nodes = contentEl.contents().toArray();
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    if (node.type === 'text' && $(node).text().trim() === title) {
      const next = nodes[i + 1];
      $(node).remove();
      if (next && next.tagName === 'br') $(next).remove();
      break;
    }
  }

  const contentHtml = contentEl.html() || '';

  const prevA = $('li.prev a[rel="prev"]').first();
  const nextA = $('li.next a[rel="next"]').first();
  const prevUrl = prevA.length ? absoluteUrl(prevA.attr('href')) : null;
  const nextUrl = nextA.length ? absoluteUrl(nextA.attr('href')) : null;

  return { title, contentHtml, nextUrl, prevUrl };
}

module.exports = { parseChapterList, parseChapter };
