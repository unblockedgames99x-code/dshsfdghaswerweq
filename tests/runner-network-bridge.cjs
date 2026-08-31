const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const sourcePath = path.resolve(__dirname, "../neo-os/neo-runner-network.js");
const source = fs.readFileSync(sourcePath, "utf8");
const messages = [];
const listeners = new Map();
let nativeFetches = 0;
let createdMediaBlob = null;
const mediaRanges = [];
const fullSongBytes = Buffer.from("FULL-SONG-CONTENT");

class MockURL extends URL {}
MockURL.createObjectURL = blob => {
  createdMediaBlob = blob;
  return "blob:neo-full-song";
};
MockURL.revokeObjectURL = () => {};

class MockMediaElement {
  constructor() {
    this._src = "";
    this.loadCalls = 0;
  }

  load() {
    this.loadCalls += 1;
  }
}

Object.defineProperty(MockMediaElement.prototype, "src", {
  configurable: true,
  enumerable: true,
  get() { return this._src; },
  set(value) { this._src = String(value); }
});

class MockAudioElement extends MockMediaElement {}

function emit(type, event) {
  for (const listener of listeners.get(type) || []) listener(event);
}

const parent = {
  postMessage(message) {
    messages.push(message);
    const request = message.request;
    let body = "";
    let headers = { "content-type": "application/json" };
    if (request.url.includes("getGJLevels21.php")) {
      body = "1:Example level";
      headers = { "content-type": "text/plain" };
    } else if (request.url.includes("/api/yt/astream/")) {
      const range = String(request.headers.range || "bytes=0-");
      mediaRanges.push(range);
      const start = Number((range.match(/bytes=(\d+)-/) || [])[1] || 0);
      const bytes = fullSongBytes.subarray(start, Math.min(start + 7, fullSongBytes.length));
      body = bytes;
      headers = {
        "content-type": "video/mp4",
        "content-range": `bytes ${start}-${start + bytes.length - 1}/${fullSongBytes.length}`
      };
    } else {
      body = JSON.stringify({ tracks: [{ id: "full-track", duration: 263 }] });
    }
    queueMicrotask(() => emit("message", {
      source: parent,
      data: {
        type: "neo:network:response",
        id: message.id,
        payload: {
          ok: true,
          result: {
            status: request.url.includes("/api/yt/astream/") ? 206 : 200,
            headers,
            bodyBase64: Buffer.from(body).toString("base64")
          }
        }
      }
    }));
  }
};

const sandbox = {
  AbortController,
  Blob,
  DOMException,
  Map,
  Request,
  Response,
  URL: MockURL,
  Uint8Array,
  atob,
  btoa,
  clearTimeout,
  console,
  document: { baseURI: "https://script.googleusercontent.com/neo/" },
  HTMLAudioElement: MockAudioElement,
  HTMLMediaElement: MockMediaElement,
  fetch: async () => {
    nativeFetches += 1;
    return new Response("native", { status: 200 });
  },
  parent,
  queueMicrotask,
  setTimeout
};
sandbox.window = sandbox;
sandbox.addEventListener = (type, listener) => {
  if (!listeners.has(type)) listeners.set(type, []);
  listeners.get(type).push(listener);
};

const context = vm.createContext(sandbox);
vm.runInContext(source, context, { filename: sourcePath });

(async () => {
  const music = await context.fetch(
    "https://proxy.cors.sh/https://vcsa.huangqirui.xyz/api/music/search?q=how%20to%20save%20a%20life"
  );
  const musicJson = await music.json();
  assert.equal(musicJson.tracks[0].id, "full-track");
  assert.equal(messages[0].request.url, "https://vcsa.huangqirui.xyz/api/music/search?q=how%20to%20save%20a%20life");
  assert.equal(nativeFetches, 0);

  const gd = await context.fetch("https://gd-proxy.gmdc.workers.dev/getGJLevels21.php", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: "str=featured&page=0"
  });
  assert.equal(await gd.text(), "1:Example level");
  assert.equal(Buffer.from(messages[1].request.bodyBase64, "base64").toString(), "str=featured&page=0");

  const cdn = await context.fetch("https://cdn.jsdelivr.net/npm/example/index.js");
  assert.equal(await cdn.text(), "native");
  assert.equal(nativeFetches, 1);
  assert.equal(context.__NEO_RUNNER_NETWORK__.supports("https://vcsa.huangqirui.xyz/api/yt/astream/ae7AACP1-R0"), true);
  assert.equal(context.__NEO_RUNNER_NETWORK__.supports("https://example.com/"), false);

  const audio = new MockAudioElement();
  audio.src = "https://vcsa.huangqirui.xyz/api/yt/astream/ae7AACP1-R0";
  for (let attempt = 0; attempt < 20 && audio.src !== "blob:neo-full-song"; attempt += 1) {
    await new Promise(resolve => setTimeout(resolve, 0));
  }
  assert.equal(audio.src, "blob:neo-full-song");
  assert.ok(mediaRanges.length > 1, "full songs must continue requesting ranges until complete");
  assert.equal(createdMediaBlob.size, fullSongBytes.length);
  assert.deepEqual(Buffer.from(await createdMediaBlob.arrayBuffer()), fullSongBytes);
  assert.equal(audio.loadCalls, 1);

  console.log("Google runner bridge routes full Music tracks and Geometry Dash safely.");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
