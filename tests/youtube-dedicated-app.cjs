const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");
const html = read("neo-os", "index.html");
const apps = read("neo-os", "neo-apps.js");
const browser = read("neo-os", "NEO-BROWSER", "index.html");
const appMode = read("neo-os", "NEO-BROWSER", "assets", "app-mode.js");

new vm.Script(apps, { filename: "neo-apps.js" });
new vm.Script(appMode, { filename: "app-mode.js" });

assert.match(html, /neo-apps\.js\?v=20260901-youtube-proxy-app-v1/);
assert.match(apps, /"youtube-app":\s*\{[\s\S]*?route: "\.\/NEO-BROWSER\/index\.html\?neo-app-mode=1&neo-app-target=https%3A%2F%2Fwww\.youtube\.com%2F"/);
assert.doesNotMatch(apps, /"youtube-app":\s*\{[\s\S]*?template: "browser-template"[\s\S]*?\n\s*\}/);
assert.match(browser, /html\.neo-app-mode \.titlebar,[\s\S]*?html\.neo-app-mode \.navbar,[\s\S]*?html\.neo-app-mode \.bookmarks-bar-wrap \{ display: none !important; \}/);
assert.match(appMode, /params\.get\("neo-app-mode"\) !== "1"/);
assert.match(appMode, /params\.get\("neo-app-target"\)/);

console.log("Dedicated proxied YouTube app checks passed.");
