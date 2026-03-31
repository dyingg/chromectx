import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { runJxa } from "../../src/platform/macos/chrome/jxa.js";
import {
  getSessions,
  getSourceForTab,
  getTabsInSession,
} from "../../src/platform/macos/chrome/sessions.js";

const TEST_URL = "https://github.com/dyingg/chrome-spill";
let chromeReady = false;
let skipReason: string | undefined;
let testWindowId: string | undefined;

// ---- helpers (JXA setup / teardown) ----------------------------------------

async function openTestWindow(url: string): Promise<string> {
  return runJxa(`(() => {
    const chrome = Application("Google Chrome");
    const win = chrome.Window().make();
    win.activeTab().url = "${url}";
    return win.id();
  })()`);
}

async function closeWindowById(windowId: string): Promise<void> {
  await runJxa(`(() => {
    const chrome = Application("Google Chrome");
    const winCount = chrome.windows.length;
    for (let i = 0; i < winCount; i++) {
      if (chrome.windows[i].id() === "${windowId}") {
        chrome.windows[i].close();
        return;
      }
    }
  })()`);
}

// ---- tests -----------------------------------------------------------------

describe("Chrome integration", () => {
  beforeAll(async () => {
    try {
      testWindowId = await openTestWindow(TEST_URL);
      chromeReady = true;
      await Bun.sleep(5_000);
    } catch (error) {
      skipReason = error instanceof Error ? error.message : "Chrome JXA setup failed";
    }
  }, 15_000);

  afterAll(async () => {
    if (testWindowId !== undefined) {
      await closeWindowById(testWindowId);
    }
  });

  test("getSessions finds the test window", async () => {
    if (!chromeReady) {
      expect(skipReason).toBeDefined();
      return;
    }

    const sessions = await getSessions();
    const ours = sessions.find((s) => s.id === testWindowId);

    expect(ours).toBeDefined();
    expect(ours!.mode).toBe("normal");
    expect(ours!.tabCount).toBeGreaterThanOrEqual(1);
  });

  test("getTabsInSession returns the GitHub tab", async () => {
    if (!chromeReady) {
      expect(skipReason).toBeDefined();
      return;
    }

    const tabs = await getTabsInSession(testWindowId!);

    expect(tabs.length).toBeGreaterThanOrEqual(1);

    const ghTab = tabs.find((t) => t.url.includes("github.com/dyingg/chrome-spill"));
    expect(ghTab).toBeDefined();
    expect(ghTab!.title).toContain("chrome-spill");
    expect(ghTab!.loading).toBe(false);
    expect(ghTab!.active).toBe(true);
  });

  test("getSourceForTab returns valid HTML from GitHub", async () => {
    if (!chromeReady) {
      expect(skipReason).toBeDefined();
      return;
    }

    const tabs = await getTabsInSession(testWindowId!);
    const ghTab = tabs.find((t) => t.url.includes("github.com/dyingg/chrome-spill"))!;

    const source = await getSourceForTab(ghTab.id);

    expect(source.url).toContain("github.com/dyingg/chrome-spill");
    expect(source.title).toContain("chrome-spill");
    expect(source.html).toContain("<html");
    expect(source.html).toContain("</html>");
    expect(source.html).toContain("chrome-spill");
  }, 15_000);
});
