import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { resolveAppPaths } from "./config.js";
import { APP_NAME, APP_VERSION } from "./meta.js";

interface CachedCheck {
  latest: string;
  checkedAt: number;
}

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const REGISTRY_URL = `https://registry.npmjs.org/${APP_NAME}/latest`;

async function readCache(cachePath: string): Promise<CachedCheck | null> {
  try {
    const raw = await readFile(cachePath, "utf-8");
    const data = JSON.parse(raw) as CachedCheck;
    if (Date.now() - data.checkedAt < CACHE_TTL_MS) return data;
  } catch {
    /* cache miss */
  }
  return null;
}

async function writeCache(cachePath: string, latest: string): Promise<void> {
  try {
    await mkdir(path.dirname(cachePath), { recursive: true });
    await writeFile(cachePath, JSON.stringify({ latest, checkedAt: Date.now() }));
  } catch {
    /* best-effort */
  }
}

async function fetchLatestVersion(): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(REGISTRY_URL, { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const data = (await res.json()) as { version?: string };
    return data.version ?? null;
  } catch {
    return null;
  }
}

function isNewer(latest: string, current: string): boolean {
  const parse = (v: string) => v.split(".").map(Number);
  const [lMaj, lMin, lPatch] = parse(latest);
  const [cMaj, cMin, cPatch] = parse(current);
  if (lMaj !== cMaj) return lMaj > cMaj;
  if (lMin !== cMin) return lMin > cMin;
  return lPatch > cPatch;
}

/**
 * Fire-and-forget update check. Returns a message string if a newer version
 * is available, or null. Never throws — failures are silently ignored.
 */
export async function checkForUpdate(): Promise<string | null> {
  if (APP_VERSION === "0.0.0-dev") return null;

  const paths = resolveAppPaths();
  const cachePath = path.join(paths.cache, "update-check.json");

  const cached = await readCache(cachePath);
  const latest = cached?.latest ?? (await fetchLatestVersion());

  if (!latest) return null;

  if (!cached) {
    await writeCache(cachePath, latest);
  }

  if (isNewer(latest, APP_VERSION)) {
    return `\nUpdate available: ${APP_VERSION} → ${latest}\n` + "Run: npx chromectx install\n";
  }

  return null;
}
