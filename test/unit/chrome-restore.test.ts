import { describe, expect, mock, test } from "bun:test";

import { buildChromeOpenArgs, restoreSession } from "../../src/platform/macos/chrome/restore.js";

describe("buildChromeOpenArgs", () => {
  test("builds launch arguments for a normal window with a profile", () => {
    const args = buildChromeOpenArgs(
      "/Applications/Google Chrome.app",
      {
        activeTabIndex: 1,
        mode: "normal",
        tabs: [
          { title: "Docs", url: "https://example.com/docs" },
          { title: "Blog", url: "https://example.com/blog" },
        ],
      },
      "Profile 1",
    );

    expect(args).toEqual([
      "open",
      "-na",
      "/Applications/Google Chrome.app",
      "--args",
      "--new-window",
      "--profile-directory=Profile 1",
      "https://example.com/docs",
      "https://example.com/blog",
    ]);
  });

  test("uses incognito and about:blank when needed", () => {
    const args = buildChromeOpenArgs("/Applications/Google Chrome.app", {
      activeTabIndex: 1,
      mode: "incognito",
      tabs: [],
    });

    expect(args).toEqual([
      "open",
      "-na",
      "/Applications/Google Chrome.app",
      "--args",
      "--new-window",
      "--incognito",
      "about:blank",
    ]);
  });
});

describe("restoreSession", () => {
  test("launches one Chrome window per stored window", async () => {
    const openChrome = mock(async (_args: string[]) => {});

    const result = await restoreSession(
      {
        capturedAt: "2026-03-31T12:00:00.000Z",
        name: "work",
        profile: null,
        version: 1,
        windows: [
          {
            activeTabIndex: 1,
            mode: "normal",
            tabs: [{ title: "Docs", url: "https://example.com/docs" }],
          },
          {
            activeTabIndex: 1,
            mode: "incognito",
            tabs: [{ title: "Mail", url: "https://example.com/mail" }],
          },
        ],
      },
      {
        deps: {
          detectChromeInstallation: () => ({
            installed: true,
            path: "/Applications/Google Chrome.app",
          }),
          openChrome,
        },
        profileDirectory: "Profile 1",
      },
    );

    expect(openChrome).toHaveBeenCalledTimes(2);
    expect(openChrome.mock.calls[0]?.[0]).toContain("--profile-directory=Profile 1");
    expect(openChrome.mock.calls[1]?.[0]).toContain("--incognito");
    expect(result).toEqual({
      profileDirectory: "Profile 1",
      tabCount: 2,
      windowCount: 2,
    });
  });

  test("fails when Chrome is not installed", async () => {
    await expect(
      restoreSession(
        {
          capturedAt: "2026-03-31T12:00:00.000Z",
          name: "work",
          profile: null,
          version: 1,
          windows: [
            {
              activeTabIndex: 1,
              mode: "normal",
              tabs: [{ title: "Docs", url: "https://example.com/docs" }],
            },
          ],
        },
        {
          deps: {
            detectChromeInstallation: () => ({
              installed: false,
              path: null,
            }),
            openChrome: async () => {},
          },
        },
      ),
    ).rejects.toThrow("Google Chrome is not installed.");
  });
});
