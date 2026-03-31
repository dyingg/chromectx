/** Schema version for forward-compatible migration. */
export type SessionVersion = 1;

export interface SessionTab {
  title: string;
  url: string;
}

export interface SessionWindow {
  mode: "normal" | "incognito";
  activeTabIndex: number;
  tabs: SessionTab[];
}

export interface Session {
  version: SessionVersion;
  name: string;
  profile: string | null;
  capturedAt: string;
  windows: SessionWindow[];
}
