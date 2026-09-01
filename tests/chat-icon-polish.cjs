const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const svg = fs.readFileSync(path.join(root, "neo-os", "assets", "chat-circle.svg"), "utf8");
const html = fs.readFileSync(path.join(root, "neo-os", "index.html"), "utf8");
const script = fs.readFileSync(path.join(root, "neo-os", "neo-os.js"), "utf8");

assert.match(svg, /viewBox="0 0 64 64"/);
assert.match(svg, /<circle cx="32" cy="32" r="30"/);
assert.match(svg, /stroke-width="3\.1"/);
assert.match(svg, /stroke-linecap="round"/);
assert.match(svg, /stroke-linejoin="round"/);
assert.doesNotMatch(svg, /<path[^>]+fill="#fff"/);

const revision = "chat-circle.svg?v=20260901-chat-icon-polish-v1";
assert.ok(html.includes(revision), "HTML should load the polished chat icon revision");
assert.ok(script.includes(revision), "Dynamic app icons should load the polished chat icon revision");

console.log("Chat icon polish contract passed.");
