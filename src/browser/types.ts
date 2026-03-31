// ---------------------------------------------------------------------------
// Browser data types — shared across commands, store, and platform layers.
// This module is a leaf: it imports nothing from the project.
// ---------------------------------------------------------------------------

export interface ChromeSession {
  /** Chrome-internal window id (string as returned by JXA). */
  id: string;
  /** Window title (usually the active tab's title). */
  name: string;
  /** "normal" or "incognito". */
  mode: "normal" | "incognito";
  /** Number of tabs in this window. */
  tabCount: number;
  /** Window position and size. */
  bounds: { x: number; y: number; width: number; height: number };
  /** 1-based index of the active tab within this window. */
  activeTabIndex: number;
}

export interface ChromeTab {
  /** Chrome-internal tab id (unique across all windows). */
  id: string;
  /** The window this tab belongs to. */
  windowId: string;
  /** 0-based position within its window. */
  index: number;
  title: string;
  url: string;
  loading: boolean;
  /** Whether this tab is the active tab in its window. */
  active: boolean;
}

export interface TabSource {
  tabId: string;
  windowId: string;
  url: string;
  title: string;
  /** Full outer HTML of the document element. */
  html: string;
}

export interface ChromeProfile {
  /** Directory name in Chrome's user data folder, e.g. "Default", "Profile 1" */
  directoryName: string;
  /** User-set display name for the profile */
  name: string;
  /** Google account email — empty string when not signed in */
  userName: string;
}

export interface ChromeInstallation {
  installed: boolean;
  path: string | null;
}
