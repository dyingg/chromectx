import type { ChromeSession, ChromeTab } from "../../browser/index.js";
import type { Session, SessionWindow } from "./types.js";

export function buildSessionFromChromeSession(
  chromeSession: ChromeSession,
  tabs: ChromeTab[],
): Session {
  const orderedTabs = [...tabs].sort((left, right) => left.index - right.index);

  const window: SessionWindow = {
    activeTabIndex: chromeSession.activeTabIndex,
    mode: chromeSession.mode,
    tabs: orderedTabs.map((tab) => ({
      title: tab.title,
      url: tab.url,
    })),
  };

  return {
    capturedAt: new Date().toISOString(),
    name: chromeSession.name,
    profile: null,
    version: 1,
    windows: [window],
  };
}
