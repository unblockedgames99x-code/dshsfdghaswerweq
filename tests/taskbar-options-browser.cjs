const assert = require("node:assert/strict");
const { chromium } = require("playwright");

const url = process.env.NEO_TASKBAR_TEST_URL || "http://127.0.0.1:3091/neo-os/?test=taskbar-options-browser-v1";
const positions = ["top", "right", "bottom", "left"];
const styles = ["current", "transparent", "typical"];

async function run() {
  const browser = await chromium.launch({
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    headless: true
  });
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });

  try {
    await page.goto(url, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => window.NEO_SHELL && document.documentElement.dataset.boot === "complete", null, { timeout: 20000 });

    await page.evaluate(() => window.NEO_SHELL.openApp("control"));
    const settingsWindow = page.locator('.neo-window[data-app-id="control"]');
    await settingsWindow.locator('[data-taskbar-position-option="top"]').click();
    await settingsWindow.locator('[data-taskbar-style-option="transparent"]').click();
    await settingsWindow.locator('[data-taskbar-tint-preset="#000000"]').click();
    await settingsWindow.locator('[data-setting="taskbarTintStrength"]').evaluate((input) => {
      input.value = "24";
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await page.waitForFunction(() => (
      window.NEO_SHELL.getSetting("taskbarPosition") === "top"
      && window.NEO_SHELL.getSetting("taskbarStyle") === "transparent"
      && window.NEO_SHELL.getSetting("taskbarTint") === "#000000"
      && window.NEO_SHELL.getSetting("taskbarTintStrength") === 24
    ));

    for (const position of positions) {
      for (const style of styles) {
        await page.evaluate(({ position, style }) => {
          window.NEO_SHELL.setSetting("taskbarPosition", position);
          window.NEO_SHELL.setSetting("taskbarStyle", style);
        }, { position, style });
        await page.waitForFunction(({ position, style }) => {
          const root = document.documentElement;
          return root.dataset.taskbarPosition === position && root.dataset.taskbarStyle === style;
        }, { position, style });
        await page.waitForTimeout(220);

        const state = await page.locator(".taskbar").evaluate((taskbar) => {
          const rect = taskbar.getBoundingClientRect();
          const dock = taskbar.querySelector(".dock");
          return {
            rect: { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height },
            direction: dock ? getComputedStyle(dock).flexDirection : "",
            background: getComputedStyle(taskbar).backgroundColor,
            radius: getComputedStyle(taskbar).borderRadius,
            viewport: { width: innerWidth, height: innerHeight }
          };
        });

        const { rect, viewport } = state;
        assert.ok(rect.left >= -1 && rect.top >= -1 && rect.right <= viewport.width + 1 && rect.bottom <= viewport.height + 1, `${position}/${style} must stay on screen`);
        if (position === "left" || position === "right") {
          assert.equal(state.direction, "column", `${position}/${style} must use a vertical dock`);
          assert.ok(rect.height > rect.width, `${position}/${style} must remain a vertical rail`);
        } else {
          assert.equal(state.direction, "row", `${position}/${style} must use a horizontal dock`);
          assert.ok(rect.width > rect.height, `${position}/${style} must remain a horizontal bar`);
        }
        if (style === "transparent") assert.match(state.background, /rgba\([^)]*,\s*0\)/);
        if (style === "typical") assert.equal(state.radius, "0px");
      }
    }

    await page.evaluate(() => {
      window.NEO_SHELL.setSetting("taskbarPosition", "right");
      window.NEO_SHELL.setSetting("taskbarStyle", "typical");
      window.NEO_SHELL.setSetting("taskbarTint", "#e8e8e8");
      window.NEO_SHELL.setSetting("taskbarTintStrength", 72);
    });
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => window.NEO_SHELL && document.documentElement.dataset.boot === "complete", null, { timeout: 20000 });
    const persisted = await page.evaluate(() => ({
      position: window.NEO_SHELL.getSetting("taskbarPosition"),
      style: window.NEO_SHELL.getSetting("taskbarStyle"),
      tint: window.NEO_SHELL.getSetting("taskbarTint"),
      strength: window.NEO_SHELL.getSetting("taskbarTintStrength"),
      tone: document.documentElement.dataset.taskbarTone
    }));
    assert.deepEqual(persisted, { position: "right", style: "typical", tint: "#e8e8e8", strength: 72, tone: "light" });
  } finally {
    await browser.close();
  }
}

run().then(() => {
  console.log("Taskbar browser matrix passed (12 combinations plus persistence).");
}).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
