const fs = require('fs');
const path = require('path');
const file = path.resolve(__dirname, '../admin-frontend/index.html');
let html = fs.readFileSync(file, 'utf8');
html = html.replace(/<title[\s\S]*?<\/head>/i, (m)=>{
  // ensure proper title tag
  return m.replace(/<title[\s\S]*?(?=<link|<meta|<script|<\/head>)/i, '<title>??????</title>\n    ');
});
fs.writeFileSync(file, html);
console.log('index.html title fixed');
