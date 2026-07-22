const cheerio = require('cheerio');

function escapeHtml(text) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Old static site: chapter list has no pagination, but chapter labels repeat
// per volume ("第一章", "第二章", ...20+ times), so the volume heading is
// prefixed onto each chapter title to keep them distinguishable.
function parseChapterList(html, sourceUrl) {
  const $ = cheerio.load(html);
  const chapters = [];

  // cellspacing="0" excludes the page's outer wrapper table, which also has
  // border="1" and would otherwise match too (double-counting every chapter).
  $('table[border="1"][cellspacing="0"]').each((_, table) => {
    const volumeTitle = $(table).find('td[colspan]').first().text().trim();
    $(table).find('a').each((_, a) => {
      const chapterLabel = $(a).text().trim();
      const href = $(a).attr('href');
      if (!chapterLabel || !href) return;
      const url = new URL(href, sourceUrl).href;
      chapters.push({ title: `${volumeTitle} ${chapterLabel}`, url });
    });
  });

  return chapters;
}

// Content is plain text inside a <pre> block (no <p>/<br> markup at all).
// The site never provides a "prev chapter" link, and its "next chapter" link
// is a dead link on the last chapter of every volume (site bug, not ours).
function parseChapter(html, sourceUrl) {
  const $ = cheerio.load(html);
  const pre = $('pre').first();
  const lines = pre.text().split('\n');

  let titleIdx = -1;
  let title = '';
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/【(.+?)】/);
    if (m) {
      titleIdx = i;
      title = m[1].trim();
      break;
    }
  }

  let endIdx = lines.length;
  for (let i = titleIdx + 1; i < lines.length; i++) {
    if (lines[i].includes('踴躍購買')) {
      endIdx = i;
      break;
    }
  }

  const contentHtml = lines
    .slice(titleIdx + 1, endIdx)
    .map((line) => escapeHtml(line.trim()))
    .join('<br>');

  let nextUrl = null;
  pre.find('a').each((_, a) => {
    if ($(a).text().trim() === '下一章') nextUrl = new URL($(a).attr('href'), sourceUrl).href;
  });

  return { title, contentHtml, nextUrl, prevUrl: null };
}

module.exports = { parseChapterList, parseChapter };
