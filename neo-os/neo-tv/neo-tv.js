(() => {
  const blockedScriptTerms = [
    "popunder",
    "adsterra",
    "doubleclick",
    "googlesyndication",
    "rybbit",
    "pungplaice",
    "maybeoneday.ch",
  ];
  const nativeScriptSrc = Object.getOwnPropertyDescriptor(HTMLScriptElement.prototype, "src");

  if (nativeScriptSrc?.set && nativeScriptSrc.get) {
    Object.defineProperty(HTMLScriptElement.prototype, "src", {
      configurable: nativeScriptSrc.configurable,
      enumerable: nativeScriptSrc.enumerable,
      get: nativeScriptSrc.get,
      set(value) {
        const source = String(value || "").toLowerCase();
        if (blockedScriptTerms.some((term) => source.includes(term))) return;
        nativeScriptSrc.set.call(this, value);
      },
    });
  }
  const originalAppendChild = Node.prototype.appendChild;
  const pictureInPicturePathStart = "M19 7h-8v6h8V7z";
  let shellMuted = false;

  const applyShellMute = () => {
    document.querySelectorAll("audio, video").forEach((media) => {
      media.muted = shellMuted;
      media.defaultMuted = shellMuted;
    });
    document.querySelectorAll("iframe").forEach((frame) => {
      try {
        frame.contentWindow?.postMessage({ type: "neo-shell:set-muted", muted: shellMuted }, "*");
      } catch (_error) {}
    });
  };

  const getPictureInPictureButton = () =>
    Array.from(document.querySelectorAll("button")).find((button) =>
      Array.from(button.querySelectorAll("svg path")).some((path) =>
        (path.getAttribute("d") || "").startsWith(pictureInPicturePathStart),
      ),
    );

  const setFallbackPictureInPicture = (enabled) => {
    document.body?.classList.toggle("neo-picture-in-picture", enabled);
    const button = getPictureInPictureButton();
    if (button) button.setAttribute("aria-pressed", String(enabled));
  };

  const syncPictureInPictureControl = () => {
    const button = getPictureInPictureButton();
    if (!button) {
      if (!document.querySelector("#video-element")) setFallbackPictureInPicture(false);
      return;
    }

    button.dataset.neoPictureInPicture = "true";
    button.setAttribute("aria-label", "Picture in picture");
    button.setAttribute("title", "Picture in picture");
    button.setAttribute(
      "aria-pressed",
      String(Boolean(document.pictureInPictureElement) || document.body.classList.contains("neo-picture-in-picture")),
    );
  };

  const togglePictureInPicture = async () => {
    const video = document.querySelector("#video-element") || document.querySelector("video");
    if (!video) return;

    if (document.body.classList.contains("neo-picture-in-picture")) {
      setFallbackPictureInPicture(false);
      return;
    }

    if (document.pictureInPictureElement) {
      try {
        await document.exitPictureInPicture();
      } catch (_error) {
        setFallbackPictureInPicture(false);
      }
      return;
    }

    if (document.pictureInPictureEnabled && typeof video.requestPictureInPicture === "function") {
      try {
        await video.requestPictureInPicture();
        syncPictureInPictureControl();
        return;
      } catch (_error) {
        // Some embedded browsers expose the API but reject it. Use NEO TV's
        // in-page mini-player so the control remains useful there too.
      }
    }

    setFallbackPictureInPicture(true);
  };

  Node.prototype.appendChild = function appendChild(node) {
    if (node instanceof HTMLScriptElement) {
      const source = (node.src || "").toLowerCase();
      if (blockedScriptTerms.some((term) => source.includes(term)) || node.dataset.zone) {
        return node;
      }
    }
    return originalAppendChild.call(this, node);
  };

  const removePromotions = () => {
    document.title = "NEO TV";

    document.querySelectorAll("script, iframe").forEach((element) => {
      const source = (element.getAttribute("src") || "").toLowerCase();
      if (blockedScriptTerms.some((term) => source.includes(term)) || element.hasAttribute("data-zone")) {
        element.remove();
      }
    });

    const phrases = [
      "join our discord",
      "check out our apps",
      "looking for live tv & sports",
      "support z-stream",
      "tip jar",
      "download z-stream",
    ];

    document.querySelectorAll("p, h1, h2, h3").forEach((element) => {
      const text = (element.textContent || "").trim().toLowerCase();
      if (!phrases.some((phrase) => text === phrase || text.startsWith(phrase))) return;

      let candidate = element.parentElement;
      for (let depth = 0; candidate && candidate !== document.body && depth < 5; depth += 1) {
        if (candidate.querySelector("button")) {
          candidate.setAttribute("data-neo-removed", "true");
          break;
        }
        candidate = candidate.parentElement;
      }
    });

    document.querySelectorAll("a, button, section, aside").forEach((element) => {
      const text = (element.textContent || "").trim().toLowerCase();
      const href = (element.getAttribute("href") || "").toLowerCase();
      if (
        element.getAttribute("data-neo-removed") !== "true" &&
        (href.includes("discord.gg") || phrases.some((phrase) => text === phrase || text.startsWith(phrase)))
      ) {
        element.setAttribute("data-neo-removed", "true");
      }
    });

    document.querySelectorAll("h1, h2, h3, p, span").forEach((element) => {
      const text = element.textContent || "";
      if (/z-stream/i.test(text) && element.children.length === 0) {
        element.textContent = text.replace(/z-stream/gi, "NEO TV");
      }
    });

    syncPictureInPictureControl();
    applyShellMute();
  };

  let cleanupQueued = false;
  const scheduleCleanup = () => {
    if (cleanupQueued) return;
    cleanupQueued = true;
    window.requestAnimationFrame(() => {
      cleanupQueued = false;
      removePromotions();
    });
  };

  const observer = new MutationObserver(scheduleCleanup);
  window.addEventListener("DOMContentLoaded", () => {
    scheduleCleanup();
    observer.observe(document.documentElement, { childList: true, subtree: true });
  });

  window.addEventListener("message", (event) => {
    if (!event.data || event.data.type !== "neo-shell:set-muted") return;
    shellMuted = Boolean(event.data.muted);
    applyShellMute();
  });

  document.addEventListener(
    "click",
    (event) => {
      const button = event.target.closest?.("[data-neo-picture-in-picture='true']");
      if (!button) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      void togglePictureInPicture();
    },
    true,
  );

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && document.body.classList.contains("neo-picture-in-picture")) {
      setFallbackPictureInPicture(false);
    }
  });

  document.addEventListener("enterpictureinpicture", syncPictureInPictureControl, true);
  document.addEventListener("leavepictureinpicture", syncPictureInPictureControl, true);
})();
