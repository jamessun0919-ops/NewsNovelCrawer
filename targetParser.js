const fs = require('fs');
const path = require('path');

const TARGET_FILE = path.join(__dirname, 'target.json');

function loadTargets() {
  const raw = fs.readFileSync(TARGET_FILE, 'utf-8');
  const entries = JSON.parse(raw);
  return entries.filter((entry) => entry.type && entry.title && entry.url);
}

module.exports = { loadTargets };
