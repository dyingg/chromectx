import { describe, expect, test } from "bun:test";
import type { ChromeSession, ChromeTab } from "../../src/browser/index.js";
import { buildSessionFromChromeSession } from "../../src/lib/store/index.js";

describe("buildSessionFromChromeSession", () => {
  test("converts a Chrome window and its tabs into the store schema", () => {
    const session: ChromeSession = {
      activeTabIndex: 2,
      bounds: { height: 900, width: 1440, x: 0, y: 0 },
      id: "100",
      mode: "normal",
      name: "Work",
      tabCount: 2,
    };
    const tabs: ChromeTab[] = [
      {
        active: false,
        id: "20",
        index: 1,
        loading: false,
        title: "Docs",
        url: "https://docs.example.com",
        windowId: "100",
      },
      {
        active: true,
        id: "10",
        index: 0,
        loading: false,
        title: "Home",
        url: "https://example.com",
        windowId: "100",
      },
    ];

    const stored = buildSessionFromChromeSession(session, tabs);

    expect(stored.version).toBe(1);
    expect(stored.name).toBe("Work");
    expect(stored.windows).toEqual([
      {
        activeTabIndex: 2,
        mode: "normal",
        tabs: [
          { title: "Home", url: "https://example.com" },
          { title: "Docs", url: "https://docs.example.com" },
        ],
      },
    ]);
  });
});
