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
})();
