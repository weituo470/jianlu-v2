const fs = require('fs');
const path = require('path');

const file = path.resolve(__dirname, '../admin-frontend/js/router.js');
let src = fs.readFileSync(file, 'utf8');
const lines = src.split(/\r?\n/);
const out = lines.map((l) => {
  const m = l.match(/^\s*title:\s*'/);
  if (!m) return l;
  const firstQuote = l.indexOf("'");
  const commaIdx = l.indexOf(',');
  if (firstQuote >= 0 && commaIdx > firstQuote) {
    const closingQuoteIdx = l.indexOf("'", firstQuote + 1);
    if (closingQuoteIdx === -1 || closingQuoteIdx > commaIdx) {
      return l.slice(0, commaIdx) + "'" + l.slice(commaIdx);
    }
  }
  return l;
});
fs.writeFileSync(file, out.join('\r\n'));
console.log('router.js title lines normalized');
