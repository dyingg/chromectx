import type { AppPaths } from "../../lib/config.js";
import type { RuntimePlatform } from "../guard.js";
import { detectChromeInstallation } from "./chrome/index.js";

interface DoctorSnapshotOptions {
  paths: AppPaths;
  runtime: RuntimePlatform;
}

export interface DoctorSnapshot {
  chrome: {
    installed: boolean;
    path: string | null;
  };
  paths: AppPaths;
  platform: RuntimePlatform;
}

export async function getMacOSDoctorSnapshot(
  options: DoctorSnapshotOptions,
): Promise<DoctorSnapshot> {
  const chrome = detectChromeInstallation();

  return {
    chrome,
    paths: options.paths,
    platform: options.runtime,
  };
}
