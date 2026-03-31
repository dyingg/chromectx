import { type JxaRunner, runJxa } from "./jxa.js";

function focusTabScript(windowId: string, tabId: string): string {
  return `(() => {
  const chrome = Application("Google Chrome");
  const winCount = chrome.windows.length;
  for (let i = 0; i < winCount; i++) {
    const w = chrome.windows[i];
    if (String(w.id()) === "${windowId}") {
      const tabCount = w.tabs.length;
      for (let j = 0; j < tabCount; j++) {
        const t = w.tabs[j];
        if (String(t.id()) === "${tabId}") {
          w.activeTabIndex = j + 1;
          w.index = 1;
          chrome.activate();
          return JSON.stringify({ windowId: "${windowId}", tabId: "${tabId}", tabIndex: j });
        }
      }
      throw new Error("Tab not found: ${tabId}");
    }
  }
  throw new Error("Window not found: ${windowId}");
})()`;
}

/**
 * Bring a Chrome tab to focus by activating its window and selecting the tab.
 *
 * Sets the tab as active in its window, moves the window to front,
 * and activates the Chrome application.
 */
export async function focusTab(
  windowId: string,
  tabId: string,
  run: JxaRunner = runJxa,
): Promise<void> {
  await run(focusTabScript(windowId, tabId));
}
