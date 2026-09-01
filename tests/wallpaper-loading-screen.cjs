const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const index = fs.readFileSync(path.join(root, "neo-os", "index.html"), "utf8");
const engine = fs.readFileSync(path.join(root, "neo-os", "neo-wallpaper-engine.js"), "utf8");
const styles = fs.readFileSync(path.join(root, "neo-os", "neo-wallpaper-engine.css"), "utf8");

assert.match(index, /id="wallpaper-loading"[^>]+data-wallpaper-loading/);
assert.match(index, /Loading wallpaper/);
assert.match(index, /Preparing video/);
assert.match(index, /neo-wallpaper-engine\.css\?v=20260901-wallpaper-loading-v1/);
assert.match(index, /neo-wallpaper-engine\.js\?v=20260901-wallpaper-loading-v1/);

assert.match(styles, /\.wallpaper-loading\.is-visible/);
assert.match(styles, /\.wallpaper-loading-spinner/);
assert.match(styles, /@keyframes wallpaperLoadingSpin/);
assert.match(styles, /data-performance-mode="ultimate"[^\n]+\.wallpaper-loading/);

assert.match(engine, /function setLoadingScreen\(visible\)/);
assert.match(engine, /youtubeData\.event === "onStateChange"/);
assert.match(engine, /youtubeState === 1/);
assert.match(engine, /event: "listening", id: "neo-wallpaper"/);
assert.match(engine, /media\.addEventListener\("waiting"/);
assert.match(engine, /media\.addEventListener\("playing", playing\)/);
assert.match(engine, /setLoadingScreen\(false\)/);

console.log("Wallpaper loading-screen checks passed.");
