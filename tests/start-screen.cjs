const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(root, "neo-os", "index.html"), "utf8");
const css = fs.readFileSync(path.join(root, "neo-os", "neo-os.css"), "utf8");
const shell = fs.readFileSync(path.join(root, "neo-os", "neo-os.js"), "utf8");

assert.match(html, /id="neo-start-screen"/);
assert.match(html, />How do you want to start\?</);
assert.match(html, /data-start-mode="laptop"/);
assert.match(html, /data-start-mode="mobile"/);
assert.match(html, /data-start-fullscreen/);
assert.match(html, /data-start-blank/);
assert.doesNotMatch(html, /Laptop Lite|Mobile Lite|Master Copier/i);
assert.match(css, /\.neo-start-screen[\s\S]*?background: #050505;/);
assert.match(css, /\.neo-start-panel[\s\S]*?justify-items: center;/);
assert.match(shell, /function initStartScreen\(onComplete\)/);
assert.match(shell, /initStartScreen\(initAccountGate\);/);
assert.match(shell, /root\.dataset\.startMode = mode/);

console.log("NEO start-screen checks passed.");
