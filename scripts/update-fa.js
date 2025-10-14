const fs = require("fs");
const path = require("path");
const file = path.join(__dirname, "..", "admin-frontend", "index.html");
let lines = fs.readFileSync(file, "utf8").split(/\r?\n/);
const target = "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css";
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes(target)) {
    lines[i] = "    <link rel=\"stylesheet\" href=\"" + target + "\" onerror=\"this.onerror=null;this.href='/css/fa-local.min.css';\">";
    break;
  }
}
fs.writeFileSync(file, lines.join("\n"), "utf8");
console.log("Font Awesome link updated");
