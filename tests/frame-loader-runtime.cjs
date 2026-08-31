const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const sourcePath = path.resolve(__dirname, "../neo-os/neo-frame-loader.js");
const source = fs.readFileSync(sourcePath, "utf8");
const sandbox = {
  AbortController,
  Blob,
  DOMException,
  URL,
  WeakMap,
  document: {
    baseURI: "https://script.googleusercontent.com/neo-os/",
    querySelector(selector) {
      return selector === 'meta[name="neo-runner"]' ? {} : null;
    }
  },
  fetch: async () => {
    throw new Error("not used");
  }
};
sandbox.window = sandbox;
vm.runInContext(source, vm.createContext(sandbox), { filename: sourcePath });

const basicHtml = "<!doctype html><html><head></head><body></body></html>";
const music = sandbox.NEOFrameLoader.prepare(
  basicHtml,
  "https://cdn.jsdelivr.net/gh/example/repo@commit/neo-os/music-v3/index.html"
);
assert.match(music, /neo-runner-network\.js/);

const wrapper = sandbox.NEOFrameLoader.prepare(
  basicHtml,
  "https://cdn.jsdelivr.net/gh/example/repo@commit/games/web-dashers.html"
);
assert.match(wrapper, /meta name="neo-runner"/);
assert.doesNotMatch(wrapper, /neo-runner-network\.js/);

const browser = sandbox.NEOFrameLoader.prepare(
  basicHtml,
  "https://cdn.jsdelivr.net/gh/example/repo@commit/neo-os/NEO-BROWSER/index.html"
);
assert.doesNotMatch(browser, /neo-runner-network\.js/);
assert.match(source, /prepareDocument\(html, result\.fetchedUrl \|\| sourceUrl\)/);

console.log("Frame loader installs each nested network runtime exactly once.");
