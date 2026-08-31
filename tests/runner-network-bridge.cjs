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
const gdSongBytes = Buffer.from("FULL-GEOMETRY-DASH-SONG");

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
    this.playCalls = 0;
    this.pauseCalls = 0;
  }

  load() {
    this.loadCalls += 1;
  }

  play() {
    this.playCalls += 1;
    return Promise.resolve();
  }

  pause() {
    this.pauseCalls += 1;
  }

  removeAttribute(name) {
    if (String(name).toLowerCase() === "src") this._src = "";
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

const host = {
  postMessage(message) {
    messages.push(message);
    const request = message.request;
    let body = "";
    let status = 200;
    let headers = { "content-type": "application/json" };
    if (request.url.includes("getGJLevels21.php")) {
      body = "1:Example level";
      headers = { "content-type": "text/plain" };
    } else if (request.url.includes("getGJSongInfo.php")) {
      body = "2~|~Full Test Song~|~10~|~https%3A%2F%2Fexample.com%2Fsong.mp3";
      headers = { "content-type": "text/plain" };
    } else if (request.url.includes("/audio-proxy")) {
      const range = String(request.headers.range || "bytes=0-");
      mediaRanges.push(range);
      const start = Number((range.match(/bytes=(\d+)-/) || [])[1] || 0);
      const bytes = gdSongBytes.subarray(start, Math.min(start + 8, gdSongBytes.length));
      body = bytes;
      status = 206;
      headers = {
        "content-type": "audio/mpeg",
        "content-range": `bytes ${start}-${start + bytes.length - 1}/${gdSongBytes.length}`
      };
    } else if (request.url.includes("/api/yt/astream/")) {
      const range = String(request.headers.range || "bytes=0-");
      mediaRanges.push(range);
      const start = Number((range.match(/bytes=(\d+)-/) || [])[1] || 0);
      const bytes = request.url.endsWith("/partial")
        ? Buffer.from("THIRTY-SECOND-PREVIEW")
        : fullSongBytes.subarray(start, Math.min(start + 7, fullSongBytes.length));
      body = bytes;
      if (request.url.endsWith("/partial")) {
        status = 200;
        headers = { "content-type": "video/mp4", "content-length": String(bytes.length) };
      } else {
        status = 206;
        const rangeStart = request.url.endsWith("/malformed") ? start + 1 : start;
        const rangeTotal = request.url.endsWith("/oversize") ? 49 * 1024 * 1024 : fullSongBytes.length;
        headers = {
          "content-type": "video/mp4",
          "content-range": `bytes ${rangeStart}-${rangeStart + bytes.length - 1}/${rangeTotal}`
        };
      }
    } else {
      body = JSON.stringify({ tracks: [{ id: "full-track", duration: 263 }] });
    }
    queueMicrotask(() => emit("message", {
      source: host,
      data: {
        type: "neo:network:response",
        id: message.id,
        payload: {
          ok: true,
          result: {
            status,
            headers,
            bodyBase64: Buffer.from(body).toString("base64")
          }
        }
      }
    }));
  }
};
const popup = { opener: host };

const sandbox = {
  AbortController,
  Blob,
  DOMException,
  Headers,
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
  parent: popup,
  top: popup,
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

  const shortcutMessageCount = messages.length;
  const shortcut = await context.fetch("https://fetchsongid.lasokar.workers.dev/?id=1372771");
  assert.equal(shortcut.status, 200);
  assert.deepEqual(Buffer.from(await shortcut.arrayBuffer()), gdSongBytes);
  assert.ok(messages.length - shortcutMessageCount > 2, "the download button must assemble the complete song from ranges");

  const gdAudio = await context.fetch(
    "https://gd-proxy.gmdc.workers.dev/audio-proxy?url=https%3A%2F%2Fexample.com%2Fsong.mp3"
  );
  assert.equal(gdAudio.status, 200);
  assert.deepEqual(Buffer.from(await gdAudio.arrayBuffer()), gdSongBytes);

  const cdn = await context.fetch("https://cdn.jsdelivr.net/npm/example/index.js");
  assert.equal(await cdn.text(), "native");
  assert.equal(nativeFetches, 1);
  assert.equal(context.__NEO_RUNNER_NETWORK__.supports("https://vcsa.huangqirui.xyz/api/yt/astream/ae7AACP1-R0"), true);
  assert.equal(context.__NEO_RUNNER_NETWORK__.supports("https://example.com/"), false);

  const audio = new MockAudioElement();
  audio.src = "https://vcsa.huangqirui.xyz/api/yt/astream/ae7AACP1-R0";
  audio.load();
  const playPromise = audio.play();
  assert.equal(audio.loadCalls, 0, "the native player must wait for the complete relayed file");
  assert.equal(audio.playCalls, 0, "playback must not start from an empty or partial source");
  await playPromise;
  assert.equal(audio.src, "blob:neo-full-song");
  assert.ok(mediaRanges.length > 1, "full songs must continue requesting ranges until complete");
  assert.equal(createdMediaBlob.size, fullSongBytes.length);
  assert.deepEqual(Buffer.from(await createdMediaBlob.arrayBuffer()), fullSongBytes);
  assert.equal(audio.loadCalls, 1);
  assert.equal(audio.playCalls, 1);

  for (const id of ["partial", "malformed", "oversize"]) {
    createdMediaBlob = null;
    const guardedAudio = new MockAudioElement();
    const fullUrl = `https://vcsa.huangqirui.xyz/api/yt/astream/${id}`;
    const beforeRequests = messages.length;
    guardedAudio.src = fullUrl;
    await assert.rejects(guardedAudio.play(), /verified byte range|mismatched byte range|too large/);
    assert.equal(guardedAudio.src, "", `${id} relay data must not be assigned to the player`);
    assert.equal(createdMediaBlob, null, `${id} relay data must never become a partial audio blob`);
    assert.equal(guardedAudio.playCalls, 0, `${id} relay data must never start native playback`);
    if (id === "oversize") {
      assert.equal(messages.length - beforeRequests, 1, "oversize songs must reject before wasting Chromebook memory");
    }
  }

  createdMediaBlob = null;
  const cancelledAudio = new MockAudioElement();
  cancelledAudio.src = "https://vcsa.huangqirui.xyz/api/yt/astream/cancel";
  cancelledAudio.removeAttribute("src");
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.equal(cancelledAudio.src, "");
  assert.equal(createdMediaBlob, null, "a discarded song must not be restored after its download finishes");

  console.log("Google runner bridge routes full Music tracks and Geometry Dash safely.");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
