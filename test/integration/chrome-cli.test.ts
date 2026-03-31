import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { runJxa } from "../../src/platform/macos/chrome/jxa.js";
import { spawnCli, waitForExit } from "../helpers/process.js";

const TEST_URL = "https://github.com/dyingg/chromectx";
let chromeReady = false;
let skipReason: string | undefined;
let testWindowId: string | undefined;

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

describe("Chrome CLI integration", () => {
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

  test("list sessions returns the open Chrome window in json mode", async () => {
    if (!chromeReady) {
      expect(skipReason).toBeDefined();
      return;
    }

    const child = spawnCli(["list", "sessions", "--json"]);
    const result = await waitForExit(child);

    expect(result.code).toBe(0);

    const sessions = JSON.parse(result.stdout) as Array<{ id: string }>;
    expect(sessions.some((session) => session.id === testWindowId)).toBe(true);
  });

  test("list tabs returns tabs for a session in json mode", async () => {
    if (!chromeReady) {
      expect(skipReason).toBeDefined();
      return;
    }

    const child = spawnCli(["list", "tabs", testWindowId!, "--json"]);
    const result = await waitForExit(child);

    expect(result.code).toBe(0);

    const tabs = JSON.parse(result.stdout) as Array<{ url: string; windowId: string }>;
    expect(tabs.some((tab) => tab.windowId === testWindowId)).toBe(true);
    expect(tabs.some((tab) => tab.url.includes("github.com/dyingg/chromectx"))).toBe(true);
  });
});
