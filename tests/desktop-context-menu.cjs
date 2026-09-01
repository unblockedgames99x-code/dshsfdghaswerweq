const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const index = fs.readFileSync(path.join(root, "neo-os", "index.html"), "utf8");
const contextMenu = index.match(/<div id="desktop-context-menu"[\s\S]*?<input type="file" data-desktop-import-input[^>]*>/);

assert.ok(contextMenu, "The desktop context menu should still be present.");
assert.doesNotMatch(contextMenu[0], /data-context-submenu="view"|>View</);
assert.doesNotMatch(contextMenu[0], /data-context-submenu="sort"|>Sort icons</);
assert.match(contextMenu[0], /data-context-submenu="new"/);
assert.match(contextMenu[0], /data-context-submenu="widgets"/);
assert.match(contextMenu[0], /data-desktop-action="refresh"/);

console.log("Desktop context-menu cleanup checks passed.");
