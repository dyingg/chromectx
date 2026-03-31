import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { AppPaths } from "../../src/lib/config.js";
import {
  listSessions,
  readSession,
  type Session,
  slugify,
  writeSession,
} from "../../src/lib/store/index.js";

function makePaths(tmpDir: string): AppPaths {
  return {
    support: tmpDir,
    cache: path.join(tmpDir, "cache"),
    logs: path.join(tmpDir, "logs"),
    sessions: path.join(tmpDir, "sessions"),
  };
}

function makeSession(overrides: Partial<Session> = {}): Session {
  return {
    version: 1,
    name: "test session",
    profile: null,
    capturedAt: "2026-03-31T12:00:00.000Z",
    windows: [
      {
        mode: "normal",
        activeTabIndex: 1,
        tabs: [
          { title: "Example", url: "https://example.com" },
          { title: "Docs", url: "https://docs.example.com" },
        ],
      },
    ],
    ...overrides,
  };
}

// --- slugify ---

describe("slugify", () => {
  test("lowercases and replaces spaces with hyphens", () => {
    expect(slugify("Morning Tabs")).toBe("morning-tabs");
  });

  test("replaces underscores with hyphens", () => {
    expect(slugify("my_session_v2")).toBe("my-session-v2");
  });

  test("strips non-alphanumeric characters", () => {
    expect(slugify("hello!@#world")).toBe("helloworld");
  });

  test("collapses consecutive hyphens", () => {
    expect(slugify("a---b")).toBe("a-b");
  });

  test("trims leading and trailing hyphens", () => {
    expect(slugify("--hello--")).toBe("hello");
  });

  test("handles empty string", () => {
    expect(slugify("")).toBe("");
  });

  test("handles string that becomes empty after stripping", () => {
    expect(slugify("!!!")).toBe("");
  });
});

// --- writeSession / readSession round-trip ---

describe("writeSession and readSession", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "chrome-spill-test-"));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  test("writes and reads back identical session data", async () => {
    const paths = makePaths(tmpDir);
    const session = makeSession();

    const filePath = await writeSession(paths, session);
    const loaded = await readSession(filePath);

    expect(loaded).toEqual(session);
  });

  test("creates sessions directory if missing", async () => {
    const paths = makePaths(tmpDir);
    const session = makeSession();

    await writeSession(paths, session);

    const stat = await fs.stat(path.join(tmpDir, "sessions"));
    expect(stat.isDirectory()).toBe(true);
  });

  test("derives filename from session name", async () => {
    const paths = makePaths(tmpDir);
    const session = makeSession({ name: "Morning Tabs" });

    const filePath = await writeSession(paths, session);
    expect(path.basename(filePath)).toBe("morning-tabs.json");
  });

  test("falls back to capturedAt slug when name is empty after slugify", async () => {
    const paths = makePaths(tmpDir);
    const session = makeSession({ name: "!!!" });

    const filePath = await writeSession(paths, session);
    expect(path.basename(filePath)).toBe("2026-03-31t120000000z.json");
  });

  test("rejects unsupported version on read", async () => {
    const paths = makePaths(tmpDir);
    const session = makeSession();

    const filePath = await writeSession(paths, session);

    // Tamper the version
    const raw = JSON.parse(await Bun.file(filePath).text());
    raw.version = 99;
    await Bun.write(filePath, JSON.stringify(raw));

    expect(readSession(filePath)).rejects.toThrow("Unsupported session version");
  });
});

// --- listSessions ---

describe("listSessions", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "chrome-spill-test-"));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  test("returns empty array when sessions dir does not exist", async () => {
    const paths = makePaths(tmpDir);
    const result = await listSessions(paths);
    expect(result).toEqual([]);
  });

  test("lists session files sorted alphabetically", async () => {
    const paths = makePaths(tmpDir);

    await writeSession(paths, makeSession({ name: "zebra" }));
    await writeSession(paths, makeSession({ name: "alpha" }));

    const result = await listSessions(paths);
    expect(result.map((f) => path.basename(f))).toEqual(["alpha.json", "zebra.json"]);
  });

  test("ignores non-json files", async () => {
    const paths = makePaths(tmpDir);
    const dir = path.join(tmpDir, "sessions");
    await fs.mkdir(dir, { recursive: true });

    await writeSession(paths, makeSession({ name: "real" }));
    await Bun.write(path.join(dir, "notes.txt"), "not a session");

    const result = await listSessions(paths);
    expect(result).toHaveLength(1);
    expect(path.basename(result[0])).toBe("real.json");
  });
});
