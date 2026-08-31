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
