import fs from "node:fs/promises";
import path from "node:path";
import type { AppPaths } from "../config.js";
import type { Session } from "./types.js";

const CURRENT_VERSION = 1;

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "");
}

function sessionsDir(paths: AppPaths): string {
  return path.join(paths.support, "sessions");
}

export async function writeSession(paths: AppPaths, session: Session): Promise<string> {
  const dir = sessionsDir(paths);
  await fs.mkdir(dir, { recursive: true });

  const slug = slugify(session.name) || slugify(session.capturedAt);
  const filePath = path.join(dir, `${slug}.json`);

  await Bun.write(filePath, `${JSON.stringify(session, null, 2)}\n`);
  return filePath;
}

export async function readSession(filePath: string): Promise<Session> {
  const text = await Bun.file(filePath).text();
  const data = JSON.parse(text) as Session;

  if (data.version !== CURRENT_VERSION) {
    throw new Error(`Unsupported session version: ${data.version} (expected ${CURRENT_VERSION})`);
  }

  return data;
}

export async function listSessions(paths: AppPaths): Promise<string[]> {
  const dir = sessionsDir(paths);

  let entries: string[];
  try {
    entries = await fs.readdir(dir);
  } catch {
    return [];
  }

  return entries
    .filter((f) => f.endsWith(".json"))
    .sort()
    .map((f) => path.join(dir, f));
}
