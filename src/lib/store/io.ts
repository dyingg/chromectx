import { mkdir } from "node:fs/promises";
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

export async function writeSession(paths: AppPaths, session: Session): Promise<string> {
  await mkdir(paths.sessions, { recursive: true });

  const slug = slugify(session.name) || slugify(session.capturedAt);
  const filePath = path.join(paths.sessions, `${slug}.json`);

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
  const glob = new Bun.Glob("*.json");

  const entries: string[] = [];
  try {
    for await (const file of glob.scan({ cwd: paths.sessions, onlyFiles: true })) {
      entries.push(path.join(paths.sessions, file));
    }
  } catch {
    return [];
  }

  return entries.sort();
}
