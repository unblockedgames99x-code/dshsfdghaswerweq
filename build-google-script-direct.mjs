import { readFile, writeFile } from "node:fs/promises";

const sourcePath = new URL("./neo-os/index.html", import.meta.url);
const outputPath = new URL("./google-script-direct.html", import.meta.url);
const revision = "6fe8159";
const cdnRoot = `https://cdn.jsdelivr.net/gh/unblockedgames99x-code/dshsfdghaswerweq@${revision}/neo-os/`;
const pageRoot = cdnRoot;

let html = await readFile(sourcePath, "utf8");
html = html.replace(
  /<head([^>]*)>/i,
  `<head$1>\n  <base href="${pageRoot}">\n  <meta name="neo-runner" content="google-apps-script">`
);
html = html.replace(/(<script\b[^>]*\bsrc=["'])\.\/([^"']+)(["'])/gi, `$1${cdnRoot}$2$3`);
html = html.replace(/(<link\b[^>]*\bhref=["'])\.\/([^"']+)(["'])/gi, `$1${cdnRoot}$2$3`);

const bootStyle = String.raw`
<style id="neo-direct-boot-style">
html.neo-direct-booting,html.neo-direct-booting body{overflow:hidden!important}
#neo-direct-boot{position:fixed;inset:0;z-index:2147483647;display:grid;place-items:center;background:#080b10;color:#fff;font:600 14px/1.4 Inter,Arial,sans-serif}
#neo-direct-boot .neo-direct-card{text-align:center}
#neo-direct-boot .neo-direct-actions{display:flex;justify-content:center;gap:12px}
#neo-direct-boot button{appearance:none;border:1px solid #2b3038;border-radius:9px;background:#242932;color:#fff;padding:12px 18px;font:700 13px Inter,Arial,sans-serif;cursor:pointer}
#neo-direct-boot button:first-child{background:#fff;color:#080b10;border-color:#fff}
#neo-direct-boot button:hover{filter:brightness(1.12)}
#neo-direct-boot p{margin:14px 0 0;color:#78879a;font-size:12px;font-weight:500}
</style>`;

html = html.replace(/<\/head>/i, `${bootStyle}\n</head>`);

const bootBody = String.raw`
<div id="neo-direct-boot" role="dialog" aria-label="Launch NEO OS">
  <div class="neo-direct-card">
    <div class="neo-direct-actions">
      <button id="neo-open-blank" type="button">Open in about:blank</button>
      <button id="neo-fullscreen" type="button">Full screen</button>
    </div>
    <p>Choose how to launch NEO OS</p>
  </div>
</div>
<script>
(function () {
  document.documentElement.classList.add('neo-direct-booting');
  var boot = document.getElementById('neo-direct-boot');
  function start() {
    document.documentElement.classList.remove('neo-direct-booting');
    if (boot) boot.remove();
  }
  if (document.body && document.body.getAttribute('data-neo-autostart') === '1') {
    start();
    return;
  }
  document.getElementById('neo-fullscreen').addEventListener('click', function () {
    start();
    var root = document.documentElement;
    if (root.requestFullscreen) root.requestFullscreen().catch(function () {});
  });
  document.getElementById('neo-open-blank').addEventListener('click', function () {
    var popup = window.open('about:blank', 'neo-os-' + Date.now());
    if (!popup) return;
    var copy = '<!doctype html>' + document.documentElement.outerHTML;
    copy = copy.replace(/<body([^>]*)>/i, '<body$1 data-neo-autostart="1">');
    popup.document.open();
    popup.document.write(copy);
    popup.document.close();
  });
}());
</script>`;

html = html.replace(/<body([^>]*)>/i, `<body$1>\n${bootBody}`);
await writeFile(outputPath, html, "utf8");

console.log(JSON.stringify({
  output: outputPath.pathname,
  bytes: Buffer.byteLength(html),
  jsdelivrScripts: (html.match(/cdn\.jsdelivr\.net\/gh[^"']+\.js/gi) || []).length,
  jsdelivrStyles: (html.match(/cdn\.jsdelivr\.net\/gh[^"']+\.css/gi) || []).length,
  bootScreen: html.includes('neo-direct-boot')
}, null, 2));
