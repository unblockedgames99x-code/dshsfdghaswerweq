function doGet(event) {
  var template = HtmlService.createTemplateFromFile('Index');
  var query = event && event.queryString ? String(event.queryString) : '';
  var startValue = event && event.parameter ? String(event.parameter.startNeo || '') : '';
  template.launchMode = startValue === '1' || /(?:^|&)startNeo=1(?:&|$)/.test(query);

  return template.evaluate()
    .setTitle('NEO OS')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, viewport-fit=cover')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function neoNetworkFetch(request) {
  request = request || {};
  var target = validateNeoNetworkUrl_(String(request.url || ''));
  var method = String(request.method || 'GET').toLowerCase();
  if (['get', 'post', 'put', 'patch', 'delete'].indexOf(method) === -1) {
    throw new Error('This request method is not supported.');
  }

  var headers = sanitizeNeoNetworkHeaders_(request.headers || {});
  var options = {
    method: method,
    headers: headers,
    muteHttpExceptions: true,
    followRedirects: false,
    validateHttpsCertificates: true
  };
  if (method !== 'get' && request.bodyBase64) {
    options.payload = Utilities.base64Decode(String(request.bodyBase64));
  }

  var response;
  for (var redirect = 0; redirect < 5; redirect += 1) {
    response = UrlFetchApp.fetch(target, options);
    var status = response.getResponseCode();
    var responseHeaders = response.getAllHeaders();
    var location = responseHeaders.Location || responseHeaders.location;
    if (status < 300 || status >= 400 || !location) break;
    target = validateNeoNetworkUrl_(resolveNeoNetworkUrl_(target, String(location)));
    if (status === 303 || ((status === 301 || status === 302) && method === 'post')) {
      method = 'get';
      options.method = 'get';
      delete options.payload;
    }
  }

  var blob = response.getBlob();
  var bytes = blob.getBytes();
  if (bytes.length > 6 * 1024 * 1024) {
    throw new Error('The network response is too large. Use a ranged request.');
  }

  return {
    status: response.getResponseCode(),
    statusText: '',
    headers: normalizeNeoNetworkHeaders_(response.getAllHeaders()),
    bodyBase64: Utilities.base64Encode(bytes),
    url: target
  };
}

function validateNeoNetworkUrl_(value) {
  var match = String(value || '').match(/^https:\/\/([^\/?#]+)(\/[^?#]*)?(?:[?#]|$)/i);
  if (!match) throw new Error('Only approved HTTPS requests are supported.');
  var host = match[1].toLowerCase().replace(/:\d+$/, '');
  var path = (match[2] || '/').replace(/\/+$/, '') || '/';

  var allowed = false;
  if (host === 'vcsa.huangqirui.xyz') {
    allowed = path === '/api/music/search' || /^\/api\/yt\/astream\/[A-Za-z0-9_-]+$/.test(path);
  } else if (host === 'gd-proxy.gmdc.workers.dev') {
    allowed = [
      '/getGJLevels21.php',
      '/downloadGJLevel22.php',
      '/getGJSongInfo.php',
      '/audio-proxy'
    ].indexOf(path) !== -1;
  } else if (host === 'fetchsongid.lasokar.workers.dev') {
    allowed = path === '/';
  }

  if (!allowed) throw new Error('This network destination is not approved.');
  return value;
}

function sanitizeNeoNetworkHeaders_(input) {
  var allowed = ['accept', 'accept-language', 'authorization', 'content-type', 'range'];
  var output = {};
  Object.keys(input || {}).forEach(function (key) {
    var normalized = String(key || '').toLowerCase();
    if (allowed.indexOf(normalized) !== -1) output[normalized] = String(input[key]);
  });
  return output;
}

function normalizeNeoNetworkHeaders_(input) {
  var output = {};
  Object.keys(input || {}).forEach(function (key) {
    var value = input[key];
    output[String(key).toLowerCase()] = Array.isArray(value) ? value.join(', ') : String(value);
  });
  return output;
}

function resolveNeoNetworkUrl_(base, location) {
  if (/^https:\/\//i.test(location)) return location;
  var root = String(base).match(/^(https:\/\/[^/]+)/i);
  if (!root) throw new Error('The redirect target is invalid.');
  if (location.charAt(0) === '/') return root[1] + location;
  return String(base).replace(/[^/]*(?:[?#].*)?$/, '') + location;
}
