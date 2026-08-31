(function () {
  "use strict";

  var root = document.documentElement;
  var boot = document.getElementById("neo-direct-boot");
  var openBlankButton = document.getElementById("neo-open-blank");
  var fullscreenButton = document.getElementById("neo-fullscreen");
  var status = document.getElementById("neo-direct-status");

  if (!boot || !openBlankButton || !fullscreenButton) return;

  root.classList.add("neo-direct-booting");

  function setStatus(message) {
    if (status) status.textContent = message;
  }

  function start() {
    root.classList.remove("neo-direct-booting");
    if (boot && boot.isConnected) boot.remove();
  }

  function makePortableCopy() {
    var copy = "<!doctype html>" + document.documentElement.outerHTML;
    return copy.replace(/<body([^>]*)>/i, '<body$1 data-neo-autostart="1">');
  }

  function openInBlank() {
    setStatus("Opening NEO OS...");
    var popup = window.open("about:blank", "_blank");
    if (!popup) {
      setStatus("Pop-ups are blocked. Allow pop-ups, then try again.");
      return;
    }

    try {
      popup.document.open();
      popup.document.write(makePortableCopy());
      popup.document.close();
      popup.focus();
    } catch (error) {
      popup.close();
      setStatus("Could not open the blank window. Try Full screen instead.");
    }
  }

  function enterFullscreen() {
    var request = root.requestFullscreen || root.webkitRequestFullscreen || root.msRequestFullscreen;
    start();
    if (!request) return;

    try {
      var result = request.call(root, { navigationUI: "hide" });
      if (result && typeof result.catch === "function") result.catch(function () {});
    } catch (error) {
      // The OS remains launched even when a browser blocks fullscreen mode.
    }
  }

  openBlankButton.addEventListener("click", openInBlank);
  fullscreenButton.addEventListener("click", enterFullscreen);

  if (document.body && document.body.getAttribute("data-neo-autostart") === "1") start();
})();
