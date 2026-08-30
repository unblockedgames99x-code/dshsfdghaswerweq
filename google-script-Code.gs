function doGet(event) {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('NEO OS')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, viewport-fit=cover')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
