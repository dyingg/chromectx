import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { ChromeInstallation } from "../../../browser/types.js";

// Type is defined in src/browser/types.ts and re-exported here for backward compatibility.
export type { ChromeInstallation };

export function detectChromeInstallation(homeDir = os.homedir()): ChromeInstallation {
  const candidates = [
    "/Applications/Google Chrome.app",
    path.join(homeDir, "Applications", "Google Chrome.app"),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return {
        installed: true,
        path: candidate,
      };
    }
  }

  return {
    installed: false,
    path: null,
  };
}
