const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");
const index = read("neo-os", "index.html");
const shell = read("neo-os", "neo-os.js");
const styles = read("neo-os", "neo-vertical-taskbar.css");
const previews = read("neo-os", "neo-taskbar-preview.js");
const menu = read("neo-os", "neo-taskbar-menu.js");
const resize = read("neo-os", "neo-window-resize.js");

const positions = Array.from(index.matchAll(/data-taskbar-position-option="([^"]+)"/g), (match) => match[1]);
const taskbarStyles = Array.from(index.matchAll(/data-taskbar-style-option="([^"]+)"/g), (match) => match[1]);

assert.deepEqual(positions, ["top", "right", "bottom", "left"]);
assert.deepEqual(taskbarStyles, ["current", "transparent", "typical"]);
assert.match(index, /data-taskbar-position="left" data-taskbar-style="current"/);
assert.match(index, /data-setting="taskbarTint"/);
assert.match(index, /data-setting="taskbarTintStrength"/);
assert.match(index, /data-taskbar-tint-preset="#767c84"/);
assert.doesNotMatch(index, /data-taskbar-material=/);
assert.doesNotMatch(index, /data-setting="taskbar(?:Opacity|Blur)"/);

assert.match(shell, /designVersion: 15/);
assert.match(shell, /taskbarPosition: "left"/);
assert.match(shell, /taskbarStyle: "current"/);
assert.match(shell, /taskbarTint: "#767c84"/);
assert.match(shell, /taskbarTintStrength: 38/);
assert.match(shell, /delete savedSettings\.taskbarMaterial/);
assert.match(shell, /delete savedSettings\.taskbarOpacity/);
assert.match(shell, /delete savedSettings\.taskbarBlur/);
assert.match(shell, /root\.dataset\.taskbarPosition = settings\.taskbarPosition/);
assert.match(shell, /root\.dataset\.taskbarStyle = settings\.taskbarStyle/);
assert.match(shell, /--neo-taskbar-tint-strength/);
assert.match(shell, /new CustomEvent\("neo-taskbar-layout-change"/);

["top", "right", "bottom", "left"].forEach((position) => {
  assert.match(styles, new RegExp(`data-taskbar-position="${position}"`));
});
["current", "transparent", "typical"].forEach((style) => {
  assert.match(styles, new RegExp(`data-taskbar-style="${style}"`));
});
assert.match(styles, /--dock-hit: var\(--vertical-dock-hit\)/);
assert.match(styles, /html\.has-window-snap-mode\[data-taskbar-position="right"\]/);
assert.match(styles, /html\[data-mobile-keyboard="true"\]\[data-taskbar-position="top"\]/);
assert.match(styles, /data-taskbar-position="left"\] \.app-launcher \{[\s\S]*?inset: var\(--topbar-height\) 0 0 var\(--neo-taskbar-vertical-avoid\) !important;/);
assert.match(styles, /data-taskbar-position="right"\] \.app-launcher \{[\s\S]*?inset: var\(--topbar-height\) var\(--neo-taskbar-vertical-avoid\) 0 0 !important;/);
assert.match(styles, /data-taskbar-position="top"\] \.app-launcher \{[\s\S]*?inset: calc\(var\(--topbar-height\) \+ var\(--neo-taskbar-horizontal-avoid\)\) 0 0 0 !important;/);
assert.match(styles, /data-taskbar-position="bottom"\] \.app-launcher \{[\s\S]*?inset: var\(--topbar-height\) 0 var\(--neo-taskbar-horizontal-avoid\) 0 !important;/);
assert.match(shell, /launcher\.setAttribute\("aria-hidden", "false"\);\s+renderLauncher\(\);/);

assert.match(previews, /position === "left"/);
assert.match(previews, /position === "right"/);
assert.match(previews, /position === "top"/);
assert.match(previews, /neo-taskbar-layout-change/);
assert.match(menu, /position === "left"/);
assert.match(menu, /position === "right"/);
assert.match(menu, /position === "top"/);
assert.match(menu, /neo-taskbar-layout-change/);
assert.match(resize, /neo-taskbar-layout-change/);

console.log("Taskbar option checks passed.");
