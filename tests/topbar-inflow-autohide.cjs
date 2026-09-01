const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");
const index = read("neo-os", "index.html");
const shell = read("neo-os", "neo-os.js");
const bars = read("neo-os", "neo-topbar-autohide.css");
const barRuntime = read("neo-os", "neo-topbar-autohide.js");
const fullBrowser = read("neo-os", "NEO-BROWSER", "index.html");
const fullBrowserStyles = read("neo-os", "NEO-BROWSER", "assets", "neo-autohide.css");
const fullBrowserRuntime = read("neo-os", "NEO-BROWSER", "assets", "neo.js");

assert.match(index, /neo-topbar-autohide\.css\?v=20260831-inflow-bars-v1/);
assert.match(index, /neo-topbar-autohide\.js\?v=20260831-inflow-bars-v1/);
assert.match(shell, /route:\s*"\.\/NEO-BROWSER\/index\.html\?v=20260831-inflow-autohide-v1"/);

assert.match(bars, /grid-template-rows:\s*0 minmax\(0, 1fr\)/);
assert.match(bars, /\.neo-window\.is-chrome-revealed[\s\S]*grid-template-rows:\s*var\(--neo-window-chrome-height\)/);
assert.match(bars, /\.neo-window > \.window-chrome \{[\s\S]*position:\s*relative !important/);
assert.doesNotMatch(bars, /\.neo-window > \.window-chrome \{[\s\S]{0,180}position:\s*absolute !important/);
assert.match(bars, /\.neo-window::before[\s\S]*height:\s*11px[\s\S]*pointer-events:\s*auto/);
assert.match(barRuntime, /root\.classList\.add\("neo-auto-hide-bars"\)/);
assert.doesNotMatch(barRuntime, /function performanceActive/);
assert.match(barRuntime, /document\.addEventListener\("pointerout"[\s\S]*chrome\.contains\(next\)[\s\S]*hideWindowSoon/);
assert.match(barRuntime, /lockedWindow = null;[\s\S]*activeWindow\.classList\.remove\("is-chrome-revealed"\)/);

assert.match(fullBrowser, /id="browserChromeEdge"/);
assert.match(fullBrowser, /id="browserChrome"/);
assert.match(fullBrowser, /neo-autohide\.css\?v=20260831-inflow-autohide-v1/);
assert.match(fullBrowserStyles, /\.browser-chrome \{[\s\S]*grid-template-rows:\s*1fr/);
assert.match(fullBrowserStyles, /\.is-browser-chrome-autohide \.browser-chrome \{[\s\S]*grid-template-rows:\s*0fr/);
assert.match(fullBrowserStyles, /\.is-browser-chrome-revealed \.browser-chrome[\s\S]*grid-template-rows:\s*1fr/);
assert.match(fullBrowserStyles, /\.browser-chrome-edge[\s\S]*height:\s*10px/);
assert.match(fullBrowserRuntime, /function initBrowserChromeAutohide\(\)/);
assert.match(fullBrowserRuntime, /app\.classList\.add\('is-browser-chrome-autohide'\)/);
assert.match(fullBrowserRuntime, /edge\.addEventListener\('pointerenter', reveal\)/);
assert.match(fullBrowserRuntime, /#extPanel\.open,#extPopupWrap\.open/);

console.log("In-flow auto-hide bar checks passed.");
