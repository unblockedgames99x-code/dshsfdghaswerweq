function doGet(event) {
  var template = HtmlService.createTemplateFromFile('Index');
  template.launchMode = Boolean(event && event.parameter && event.parameter.launch === '1');

  return template.evaluate()
    .setTitle('NEO OS')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, viewport-fit=cover')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
