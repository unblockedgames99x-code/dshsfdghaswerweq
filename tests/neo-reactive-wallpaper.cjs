const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");
const engine = read("neo-os", "neo-wallpaper-engine.js");
const styles = read("neo-os", "neo-wallpaper-engine.css");
const shell = read("neo-os", "neo-os.js");
const index = read("neo-os", "index.html");

assert.match(engine, /id: "neo-reactive"/);
assert.match(engine, /name: "NEO Reactive"/);
assert.match(engine, /function startNeoReactiveCanvas\(sequence, staticOnly\)/);
assert.match(engine, /logo\.src = "\.\/assets\/neo-logo\.svg"/);
assert.match(engine, /cover:\s*""[\s\S]*?coverReady:\s*false[\s\S]*?coverRevision:\s*0/);
assert.match(engine, /function safeReactiveCover\(value\)/);
assert.match(engine, /className = "wallpaper-neo-reactive-cover"/);
assert.match(engine, /reactiveCoverRefresh = refreshCoverFrame/);
assert.match(engine, /context\.arc\(cx, cy, logoSize \* 0\.5[\s\S]*?context\.clip\(\)/);
assert.match(engine, /window\.addEventListener\("neo-media-state", handleReactiveMediaState\)/);
assert.match(engine, /window\.addEventListener\("neo-media-levels", handleReactiveMediaLevels\)/);
assert.match(engine, /reactiveAudioState\.levels\.reduce/);
assert.match(engine, /formatReactiveTime\(position\)/);
assert.match(engine, /var reactiveStill = performanceActive\(\)/);
assert.match(engine, /startNeoReactiveCanvas\(reactiveSequence, reactiveStill\)/);
assert.match(engine, /var dprCap = lowPowerDevice \|\| width < 720 \? 1 : 1\.35/);
assert.match(engine, /var frameBudget = lowPowerDevice \? 40 : 33/);
assert.doesNotMatch(engine, /createMediaElementSource/);

assert.match(styles, /\.neo-reactive-preview/);
assert.match(styles, /\.wallpaper-neo-reactive-cover\.is-ready\s*\{\s*opacity:\s*0\.92/);
assert.match(styles, /\.wallpaper-neo-reactive-canvas\s*\{[^}]*background:\s*transparent/);
assert.match(styles, /url\("\.\/assets\/neo-logo\.svg"\)/);
assert.match(styles, /html\[data-wallpaper="neo-reactive"\]\[data-performance-mode="normal"\] \.rainmeter-clock/);
assert.match(shell, /selected === "neo-reactive"/);
assert.match(index, /neo-wallpaper-engine\.css\?v=20260901-wallpaper-loading-v1/);
assert.match(index, /neo-wallpaper-engine\.js\?v=20260901-wallpaper-loading-v1/);
assert.match(index, /data-wallpaper-card="neo-reactive"/);
assert.ok(fs.existsSync(path.join(root, "neo-os", "assets", "neo-logo.svg")));

console.log("NEO reactive wallpaper checks passed.");
