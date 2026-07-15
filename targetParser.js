const fs = require('fs');
const path = require('path');

const TARGET_FILE = path.join(__dirname, 'target.txt');

const FIELD_MAP = {
  '類型': 'type',
  '自訂標題': 'title',
  '網址': 'url',
};

function loadTargets() {
  const raw = fs.readFileSync(TARGET_FILE, 'utf-8');
  const blocks = raw.split(/\r?\n\s*\r?\n/).map((b) => b.trim()).filter(Boolean);

  return blocks.map((block) => {
    const entry = {};
    for (const line of block.split(/\r?\n/)) {
      const idx = line.indexOf('：');
      if (idx === -1) continue;
      const key = line.slice(0, idx).trim();
      const value = line.slice(idx + 1).trim();
      const field = FIELD_MAP[key];
      if (field) entry[field] = value;
    }
    return entry;
  }).filter((entry) => entry.type && entry.title && entry.url);
}

module.exports = { loadTargets };
