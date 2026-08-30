function doGet(event) {
  if (event && event.parameter && event.parameter.mode === 'music-search') {
    return neoMusicSearch_(event.parameter.q, event.parameter.callback);
  }
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('NEO OS')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, viewport-fit=cover')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function neoMusicSearch_(query, callback) {
  query = String(query || '').trim();
  callback = String(callback || 'neoMusicResult');
  if (!/^[A-Za-z_$][0-9A-Za-z_$]*$/.test(callback)) callback = 'neoMusicResult';
  var payload;
  if (!query || query.length > 120) {
    payload = { tracks: [], error: 'Enter a valid search' };
  } else {
    try {
      var response = UrlFetchApp.fetch(
        'https://vcsa.huangqirui.xyz/api/music/search?q=' + encodeURIComponent(query),
        { headers: { Accept: 'application/json' }, muteHttpExceptions: true, followRedirects: true }
      );
      payload = response.getResponseCode() === 200
        ? JSON.parse(response.getContentText() || '{}')
        : { tracks: [], error: 'Music search is unavailable' };
    } catch (error) {
      payload = { tracks: [], error: 'Music search is unavailable' };
    }
  }
  return ContentService.createTextOutput(callback + '(' + JSON.stringify(payload) + ');')
    .setMimeType(ContentService.MimeType.JAVASCRIPT);
}
