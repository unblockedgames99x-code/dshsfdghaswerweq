(function initialiseNeoInterface() {
  'use strict';

  const $all = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const labelFallbacks = {
    tabScrollLeft: 'Scroll tabs left', tabScrollRight: 'Scroll tabs right', addTab: 'New tab',
    back: 'Back', fwd: 'Forward', reload: 'Reload', stop: 'Stop loading', home: 'Home',
    go: 'Go', settingsBtn: 'Settings', devToggle: 'Request log', codeBtn: 'Page inspector',
    aiBtn: 'NEO Assistant', blockToggle: 'Privacy protection', ntWallpaperBtn: 'Change home background'
  };

  function accessibleName(control) {
    if (control.getAttribute('aria-label') || control.getAttribute('aria-labelledby')) return;
    const visible = control.textContent.replace(/\s+/g, ' ').trim();
    if (visible) return;
    const name = control.title || labelFallbacks[control.id] || control.id.replace(/([a-z])([A-Z])/g, '$1 $2');
    if (name) control.setAttribute('aria-label', name);
  }

  function enhanceControls(root = document) {
    $all('button', root).forEach(button => { if (!button.type) button.type = 'button'; accessibleName(button); });

    $all('input, select, textarea', root).forEach(input => {
      if (input.type === 'hidden' || input.getAttribute('aria-label') || input.getAttribute('aria-labelledby')) return;
      if (input.id && document.querySelector(`label[for="${CSS.escape(input.id)}"]`)) return;
      const scope = input.closest('.settings-card-body,.bookmark-modal-content,.find-bar,.nt-search') || input.parentElement;
      const label = scope?.querySelector('.settings-label,.settings-switch-label,label');
      const name = label?.textContent.trim() || input.placeholder || input.name || input.id;
      if (name) input.setAttribute('aria-label', name.replace(/([a-z])([A-Z])/g, '$1 $2'));
    });

    $all('.settings-switch', root).forEach(toggle => {
      toggle.setAttribute('role', 'switch');
      toggle.tabIndex = toggle.hasAttribute('disabled') ? -1 : 0;
      toggle.setAttribute('aria-checked', String(toggle.classList.contains('on')));
      if (!toggle.getAttribute('aria-label')) {
        const row = toggle.closest('.settings-switch-row');
        const label = row?.querySelector('.settings-switch-label')?.textContent.trim();
        toggle.setAttribute('aria-label', label || 'Setting');
      }
      if (!toggle.dataset.neoKeyboard) {
        toggle.dataset.neoKeyboard = '1';
        toggle.addEventListener('keydown', event => {
          if (event.key === ' ' || event.key === 'Enter') { event.preventDefault(); toggle.click(); }
        });
        new MutationObserver(() => toggle.setAttribute('aria-checked', String(toggle.classList.contains('on'))))
          .observe(toggle, { attributes:true, attributeFilter:['class'] });
      }
    });

    $all('.settings-nav-item', root).forEach(tab => {
      tab.setAttribute('role', 'tab');
      tab.setAttribute('aria-selected', String(tab.classList.contains('active')));
    });
    document.querySelector('.settings-sidebar nav')?.setAttribute('role', 'tablist');

    $all('.bookmark-modal,.adblock-modal,#metricsModal,#tutorialOverlay,.site-info-popup', root).forEach(dialog => {
      dialog.setAttribute('role', 'dialog');
      dialog.setAttribute('aria-modal', 'true');
    });
    $all('.settings-hint[id],.find-status,.progress-wrap,.overlay-message,#titlebarStatus', root)
      .forEach(status => status.setAttribute('aria-live', 'polite'));
  }

  function sanitisePromotionalLinks(root = document) {
    const selector = 'a[href*="discord" i],a[href*="github.com" i],a[href*="twitter.com" i],a[href*="x.com" i],a[href*="facebook.com" i],a[href*="instagram.com" i]';
    const links = [];
    if (root.nodeType === 1 && root.matches?.(selector)) links.push(root);
    links.push(...$all(selector, root));
    links.forEach(link => link.replaceWith(document.createTextNode(link.textContent.trim())));
  }

  function syncNavigationState() {
    $all('.settings-nav-item').forEach(tab => tab.setAttribute('aria-selected', String(tab.classList.contains('active'))));
  }

  function initBrowserChromeAutohide() {
    const root = document.documentElement;
    const finePointer = window.matchMedia?.('(hover: hover) and (pointer: fine)');
    if (root.classList.contains('neo-app-mode') || (finePointer && !finePointer.matches)) return;

    const app = document.querySelector('.app');
    const chrome = document.getElementById('browserChrome');
    const edge = document.getElementById('browserChromeEdge');
    if (!app || !chrome || !edge || app.dataset.chromeAutohideReady) return;

    app.dataset.chromeAutohideReady = '1';
    app.classList.add('is-browser-chrome-autohide');
    let timer = 0;
    let shellChromeVisible = false;
    const cancel = () => {
      if (!timer) return;
      clearTimeout(timer);
      timer = 0;
    };
    const reveal = () => {
      if (shellChromeVisible) return;
      cancel();
      app.classList.add('is-browser-chrome-revealed');
    };
    const chromeLocked = () => Boolean(
      document.querySelector('#historyPopup.open,#siteInfoPopup.open,#adblockModal.open,#tabContextMenu.active,#extPanel.open,#extPopupWrap.open,.tab.tab-dragging')
    );
    const hideSoon = () => {
      cancel();
      timer = setTimeout(() => {
        timer = 0;
        if (chrome.matches(':hover') || chrome.contains(document.activeElement) || chromeLocked()) return;
        app.classList.remove('is-browser-chrome-revealed');
      }, 260);
    };
    edge.addEventListener('pointerenter', reveal);
    chrome.addEventListener('pointerenter', reveal);
    chrome.addEventListener('pointerleave', hideSoon);
    chrome.addEventListener('focusin', reveal);
    chrome.addEventListener('focusout', hideSoon);
    window.addEventListener('blur', hideSoon);
    window.addEventListener('message', event => {
      if (event.source !== window.parent || event.data?.type !== 'neo-shell:window-chrome') return;
      shellChromeVisible = event.data.visible === true;
      app.classList.toggle('is-shell-window-chrome-visible', shellChromeVisible);
      if (shellChromeVisible) {
        cancel();
        app.classList.remove('is-browser-chrome-revealed');
      }
    });

    const popupObserver = new MutationObserver(() => {
      if (chromeLocked()) reveal();
      else hideSoon();
    });
    ['historyPopup', 'siteInfoPopup', 'adblockModal', 'tabContextMenu', 'extPanel', 'extPopupWrap'].forEach(id => {
      const popup = document.getElementById(id);
      if (popup) popupObserver.observe(popup, { attributes: true, attributeFilter: ['class'] });
    });
  }

  function boot() {
    document.title = 'NEO BROWSER';
    document.documentElement.removeAttribute('data-skin');
    document.body.removeAttribute('data-skin');
    enhanceControls();
    sanitisePromotionalLinks();
    initBrowserChromeAutohide();

    const engine = document.getElementById('ntEngine');
    if (engine) {
      engine.setAttribute('role', 'button');
      engine.setAttribute('aria-haspopup', 'listbox');
      engine.tabIndex = 0;
      engine.addEventListener('keydown', event => {
        if (event.key === ' ' || event.key === 'Enter') { event.preventDefault(); engine.click(); }
      });
    }

    const navObserver = new MutationObserver(syncNavigationState);
    $all('.settings-nav-item').forEach(item => navObserver.observe(item, { attributes:true, attributeFilter:['class'] }));

    let queued = false;
    new MutationObserver(records => {
      if (queued) return;
      queued = true;
      queueMicrotask(() => {
        queued = false;
        records.forEach(record => record.addedNodes.forEach(node => {
          if (node.nodeType !== 1) return;
          enhanceControls(node);
          sanitisePromotionalLinks(node);
        }));
      });
    }).observe(document.body, { childList:true, subtree:true });

    requestAnimationFrame(() => document.documentElement.dataset.neoReady = 'true');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once:true });
  else boot();
})();
