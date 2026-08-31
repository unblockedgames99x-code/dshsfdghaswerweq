(function () {
  "use strict";

  if (window.__NEO_RUNNER_NETWORK__) return;

  var nativeFetch = window.fetch.bind(window);
  var pending = new Map();
  var nextRequestId = 0;
  var MEDIA_CHUNK_BYTES = 4 * 1024 * 1024;
  var MAX_MEDIA_BYTES = 48 * 1024 * 1024;

  function parseUrl(value) {
    try { return new URL(String(value || ""), document.baseURI); } catch (_error) { return null; }
  }

  function unwrapMusicProxy(url) {
    if (!url) return url;
    try {
      if (url.hostname === "proxy.cors.sh") {
        var rawTarget = decodeURIComponent(url.pathname.replace(/^\//, "")) + url.search;
        var parsedTarget = parseUrl(rawTarget);
        if (parsedTarget && parsedTarget.hostname === "vcsa.huangqirui.xyz") return parsedTarget;
      }
      if (url.hostname === "api.allorigins.win" && /\/raw\/?$/i.test(url.pathname)) {
        var queryTarget = parseUrl(url.searchParams.get("url"));
        if (queryTarget && queryTarget.hostname === "vcsa.huangqirui.xyz") return queryTarget;
      }
    } catch (_error) {}
    return url;
  }

  function isAllowedRelayUrl(url) {
    if (!url || url.protocol !== "https:") return false;
    var path = url.pathname.replace(/\/+$/, "") || "/";
    if (url.hostname === "vcsa.huangqirui.xyz") {
      return path === "/api/music/search" || /^\/api\/yt\/astream\/[A-Za-z0-9_-]+$/.test(path);
    }
    if (url.hostname === "gd-proxy.gmdc.workers.dev") {
      return [
        "/getGJLevels21.php",
        "/downloadGJLevel22.php",
        "/getGJSongInfo.php",
        "/audio-proxy"
      ].indexOf(path) !== -1;
    }
    return url.hostname === "fetchsongid.lasokar.workers.dev" && path === "/";
  }

  function isGdAudioProxyUrl(url) {
    return Boolean(url && url.hostname === "gd-proxy.gmdc.workers.dev" && url.pathname.replace(/\/+$/, "") === "/audio-proxy");
  }

  function isGdSongShortcutUrl(url) {
    return Boolean(url && url.hostname === "fetchsongid.lasokar.workers.dev" && (url.pathname.replace(/\/+$/, "") || "/") === "/");
  }

  function requestHasRange(input, init) {
    try {
      var headers = new Headers(init && init.headers || input instanceof Request && input.headers || {});
      return headers.has("range");
    } catch (_error) {
      return false;
    }
  }

  function responseFromAudioBlob(blob) {
    return new Response(blob, {
      status: 200,
      headers: {
        "content-type": blob.type || "audio/mpeg",
        "content-length": String(blob.size)
      }
    });
  }

  async function downloadGdSongShortcut(url, signal) {
    var songId = String(url.searchParams.get("id") || "");
    if (!/^\d+$/.test(songId)) throw new Error("The Geometry Dash song ID is invalid.");
    var metadata = await relayFetch("https://gd-proxy.gmdc.workers.dev/getGJSongInfo.php", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: "songID=" + encodeURIComponent(songId) + "&secret=Wmfd2893gb7",
      signal: signal
    });
    if (!metadata.ok) throw new Error("Geometry Dash song metadata returned HTTP " + metadata.status + ".");
    var parts = (await metadata.text()).split("~|~");
    var fields = {};
    for (var index = 0; index + 1 < parts.length; index += 2) fields[parts[index]] = parts[index + 1];
    var songUrl = String(fields["10"] || "").trim();
    try { songUrl = decodeURIComponent(songUrl); } catch (_error) {}
    if (!/^https?:\/\//i.test(songUrl)) throw new Error("The full Geometry Dash song URL is unavailable.");
    var proxyUrl = new URL("https://gd-proxy.gmdc.workers.dev/audio-proxy");
    proxyUrl.searchParams.set("url", songUrl);
    return responseFromAudioBlob(await downloadRelayedMedia(proxyUrl, signal));
  }

  function encodeBytes(bytes) {
    var view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes || 0);
    var parts = [];
    for (var offset = 0; offset < view.length; offset += 0x8000) {
      parts.push(String.fromCharCode.apply(null, view.subarray(offset, offset + 0x8000)));
    }
    return btoa(parts.join(""));
  }

  function decodeBytes(value) {
    var binary = atob(String(value || ""));
    var bytes = new Uint8Array(binary.length);
    for (var index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
    return bytes;
  }

  function getHostWindow() {
    var direct = window.parent;
    try {
      if (direct && direct.google && direct.google.script && direct.google.script.run) return direct;
    } catch (_error) {}
    try {
      var popup = window.top;
      if (popup && popup.opener && !popup.opener.closed) return popup.opener;
    } catch (_error) {}
    return direct;
  }

  function sendToHost(request, signal) {
    return new Promise(function (resolve, reject) {
      if (signal && signal.aborted) {
        reject(new DOMException("Aborted", "AbortError"));
        return;
      }

      var id = "neo-network-" + Date.now().toString(36) + "-" + (++nextRequestId).toString(36);
      var timer = window.setTimeout(function () {
        pending.delete(id);
        reject(new Error("The Google network bridge timed out."));
      }, 45000);
      var abort = function () {
        window.clearTimeout(timer);
        pending.delete(id);
        reject(new DOMException("Aborted", "AbortError"));
      };

      pending.set(id, {
        resolve: function (value) {
          window.clearTimeout(timer);
          if (signal) signal.removeEventListener("abort", abort);
          resolve(value);
        },
        reject: function (error) {
          window.clearTimeout(timer);
          if (signal) signal.removeEventListener("abort", abort);
          reject(error);
        }
      });
      if (signal) signal.addEventListener("abort", abort, { once: true });

      try {
        getHostWindow().postMessage({ type: "neo:network:request", id: id, request: request }, "*");
      } catch (error) {
        window.clearTimeout(timer);
        pending.delete(id);
        if (signal) signal.removeEventListener("abort", abort);
        reject(error);
      }
    });
  }

  window.addEventListener("message", function (event) {
    var message = event.data;
    if (!message || message.type !== "neo:network:response" || !message.id) return;
    var task = pending.get(message.id);
    if (!task) return;
    pending.delete(message.id);
    if (message.payload && message.payload.ok) task.resolve(message.payload.result);
    else task.reject(new Error(String(message.payload && message.payload.error || "The Google network request failed.")));
  });

  async function serializeRequest(input, init, targetUrl) {
    var request = input instanceof Request ? new Request(input, init || {}) : new Request(targetUrl.href, init || {});
    var headers = {};
    request.headers.forEach(function (value, key) { headers[key] = value; });
    var bodyBase64 = "";
    if (request.method !== "GET" && request.method !== "HEAD") {
      bodyBase64 = encodeBytes(await request.clone().arrayBuffer());
    }
    return {
      url: targetUrl.href,
      method: request.method,
      headers: headers,
      bodyBase64: bodyBase64
    };
  }

  async function relayFetch(input, init) {
    var originalUrl = parseUrl(input instanceof Request ? input.url : input);
    var targetUrl = unwrapMusicProxy(originalUrl);
    if (!isAllowedRelayUrl(targetUrl)) return nativeFetch(input, init);

    var request = await serializeRequest(input, init, targetUrl);
    var signal = init && init.signal || (input instanceof Request ? input.signal : undefined);
    var result = await sendToHost(request, signal);
    var status = Number(result && result.status) || 502;
    var responseInit = {
      status: Math.max(200, Math.min(status, 599)),
      statusText: String(result && result.statusText || ""),
      headers: result && result.headers || {}
    };
    var body = request.method === "HEAD" || status === 204 || status === 304
      ? null
      : decodeBytes(result && result.bodyBase64);
    return new Response(body, responseInit);
  }

  window.fetch = function (input, init) {
    var url = unwrapMusicProxy(parseUrl(input instanceof Request ? input.url : input));
    if (isGdSongShortcutUrl(url)) {
      var shortcutSignal = init && init.signal || (input instanceof Request ? input.signal : undefined);
      return downloadGdSongShortcut(url, shortcutSignal);
    }
    if (isGdAudioProxyUrl(url) && !requestHasRange(input, init)) {
      var signal = init && init.signal || (input instanceof Request ? input.signal : undefined);
      return downloadRelayedMedia(url, signal).then(responseFromAudioBlob);
    }
    if (!isAllowedRelayUrl(url)) return nativeFetch(input, init);
    return relayFetch(input, init).catch(function (error) {
      if (error && error.name === "AbortError") throw error;
      return nativeFetch(input, init);
    });
  };

  async function downloadRelayedMedia(url, signal) {
    var chunks = [];
    var total = null;
    var start = 0;
    var contentType = "audio/mp4";

    while (start < MAX_MEDIA_BYTES && (total === null || start < total)) {
      var end = start + MEDIA_CHUNK_BYTES - 1;
      var response = await relayFetch(url.href, {
        cache: "no-store",
        headers: { Range: "bytes=" + start + "-" + end },
        signal: signal
      });
      if (!response.ok) throw new Error("Music relay returned HTTP " + response.status + ".");
      if (response.status !== 206) throw new Error("Music relay did not return a verified byte range.");
      contentType = response.headers.get("content-type") || contentType;
      var bytes = new Uint8Array(await response.arrayBuffer());
      var range = response.headers.get("content-range");
      var match = range && range.match(/bytes\s+(\d+)-(\d+)\/(\d+)/i);
      if (!match) throw new Error("Music relay returned an invalid byte range.");
      var rangeStart = Number(match[1]);
      var rangeEnd = Number(match[2]);
      var rangeTotal = Number(match[3]);
      if (
        !Number.isSafeInteger(rangeStart) ||
        !Number.isSafeInteger(rangeEnd) ||
        !Number.isSafeInteger(rangeTotal) ||
        rangeStart !== start ||
        rangeEnd < rangeStart ||
        rangeEnd >= rangeTotal ||
        bytes.length !== rangeEnd - rangeStart + 1
      ) {
        throw new Error("Music relay returned a mismatched byte range.");
      }
      if (rangeTotal > MAX_MEDIA_BYTES) throw new Error("This song is too large for the Chromebook relay.");
      if (total !== null && total !== rangeTotal) throw new Error("Music relay changed the song length during download.");
      total = rangeTotal;
      chunks.push(bytes);
      start = rangeEnd + 1;
    }

    if (total === null || start !== total) throw new Error("Music relay did not return the complete song.");
    return new Blob(chunks, { type: contentType });
  }

  function installMediaRelay() {
    if (typeof HTMLMediaElement !== "function" || typeof HTMLAudioElement !== "function") return;
    var descriptor = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, "src");
    var nativeLoad = HTMLMediaElement.prototype.load;
    var nativePlay = HTMLMediaElement.prototype.play;
    var nativePause = HTMLMediaElement.prototype.pause;
    var nativeRemoveAttribute = HTMLMediaElement.prototype.removeAttribute;
    if (!descriptor || !descriptor.get || !descriptor.set || descriptor.configurable === false) return;

    var state = new WeakMap();

    function clear(element) {
      var current = state.get(element);
      if (!current) return;
      current.controller.abort();
      if (current.objectUrl) URL.revokeObjectURL(current.objectUrl);
      state.delete(element);
    }

    Object.defineProperty(HTMLMediaElement.prototype, "src", {
      configurable: true,
      enumerable: descriptor.enumerable,
      get: descriptor.get,
      set: function (value) {
        clear(this);
        var target = unwrapMusicProxy(parseUrl(value));
        if (!(this instanceof HTMLAudioElement) || !isAllowedRelayUrl(target) || !/^\/api\/yt\/astream\//.test(target.pathname)) {
          descriptor.set.call(this, value);
          return;
        }

        var element = this;
        var current = {
          controller: new AbortController(),
          objectUrl: "",
          pending: true,
          playRequested: false,
          error: null,
          ready: null
        };
        state.set(element, current);
        nativeRemoveAttribute.call(element, "src");
        current.ready = downloadRelayedMedia(target, current.controller.signal).then(function (blob) {
          if (state.get(element) !== current) return;
          current.objectUrl = URL.createObjectURL(blob);
          current.pending = false;
          descriptor.set.call(element, current.objectUrl);
          nativeLoad.call(element);
        }).catch(function (error) {
          if (state.get(element) !== current) return;
          current.pending = false;
          current.error = error instanceof Error ? error : new Error("The full song could not be verified.");
          nativeRemoveAttribute.call(element, "src");
        });
      }
    });

    HTMLMediaElement.prototype.load = function () {
      var current = state.get(this);
      if (current && current.pending) return;
      return nativeLoad.call(this);
    };

    HTMLMediaElement.prototype.play = function () {
      var element = this;
      var current = state.get(element);
      if (!current || !current.pending) return nativePlay.call(element);
      current.playRequested = true;
      return current.ready.then(function () {
        if (state.get(element) !== current || !current.playRequested) {
          throw new DOMException("Playback was cancelled.", "AbortError");
        }
        if (current.error) throw current.error;
        return nativePlay.call(element);
      });
    };

    HTMLMediaElement.prototype.pause = function () {
      var current = state.get(this);
      if (current && current.pending) current.playRequested = false;
      return nativePause.call(this);
    };

    HTMLMediaElement.prototype.removeAttribute = function (name) {
      if (String(name || "").toLowerCase() === "src") clear(this);
      return nativeRemoveAttribute.call(this, name);
    };
  }

  installMediaRelay();
  window.__NEO_RUNNER_NETWORK__ = Object.freeze({
    fetch: relayFetch,
    supports: function (value) { return isAllowedRelayUrl(unwrapMusicProxy(parseUrl(value))); }
  });
})();
