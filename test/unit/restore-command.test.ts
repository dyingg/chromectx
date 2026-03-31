import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { parseRestoreArgs, runRestoreCommand } from "../../src/commands/restore.js";
import type { Logger } from "../../src/lib/logger.js";
import type { Output } from "../../src/lib/output.js";
import type { Session } from "../../src/lib/store/index.js";

function createLogger(): Logger {
  return {
    debug: mock(() => {}),
    error: mock(() => {}),
    info: mock(() => {}),
  };
}

function createOutputCapture(): {
  output: Output;
  stderr: string[];
  stdout: string[];
} {
  const stdout: string[] = [];
  const stderr: string[] = [];

  return {
    output: {
      json(value) {
        stdout.push(JSON.stringify(value));
      },
      stderr(message) {
        stderr.push(message);
      },
      stdout(message) {
        stdout.push(message);
      },
    },
    stderr,
    stdout,
  };
}

function makeSession(overrides: Partial<Session> = {}): Session {
  return {
    capturedAt: "2026-03-31T12:00:00.000Z",
    name: "stored session",
    profile: null,
    version: 1,
    windows: [
      {
        activeTabIndex: 1,
        mode: "normal",
        tabs: [{ title: "Example", url: "https://example.com" }],
      },
    ],
    ...overrides,
  };
}

let tempDir = "";
let sessionPath = "";

beforeEach(async () => {
  tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "chrome-spill-restore-unit-"));
  sessionPath = path.join(tempDir, "alpha.json");
  await Bun.write(sessionPath, "{}\n");
});

afterEach(async () => {
  await fs.rm(tempDir, { force: true, recursive: true });
});

describe("parseRestoreArgs", () => {
  test("parses a source and profile", () => {
    expect(parseRestoreArgs(["alpha", "--profile", "Profile 1"])).toEqual({
      profileDirectory: "Profile 1",
      source: "alpha",
    });
  });

  test("parses a profile before the source", () => {
    expect(parseRestoreArgs(["--profile", "Profile 1", "./alpha.json"])).toEqual({
      profileDirectory: "Profile 1",
      source: "./alpha.json",
    });
  });
});

describe("runRestoreCommand", () => {
  test("restores an explicit file and prompts for a profile when interactive", async () => {
    const capture = createOutputCapture();
    const restoreSession = mock(
      async (_session: Session, options?: { profileDirectory?: string }) => ({
        profileDirectory: options?.profileDirectory ?? null,
        tabCount: 1,
        windowCount: 1,
      }),
    );

    const exitCode = await runRestoreCommand({
      args: [sessionPath],
      deps: {
        getProfiles: async () => [
          { directoryName: "Default", name: "Personal", userName: "me@example.com" },
          { directoryName: "Profile 1", name: "Work", userName: "work@example.com" },
        ],
        isInteractiveTerminal: () => true,
        listStoredSessionFiles: async () => [],
        readSession: async () => makeSession(),
        restoreSession,
        selectOne: async ({ message }) =>
          message === "Select a Chrome profile" ? "Profile 1" : sessionPath,
      },
      env: process.env,
      json: false,
      logger: createLogger(),
      output: capture.output,
    });

    expect(exitCode).toBe(0);
    expect(restoreSession).toHaveBeenCalledWith(expect.anything(), {
      profileDirectory: "Profile 1",
    });
    expect(capture.stdout[0]).toContain("profile: Profile 1");
  });

  test("uses the default profile in non-interactive mode when none is specified", async () => {
    const capture = createOutputCapture();
    const restoreSession = mock(
      async (_session: Session, options?: { profileDirectory?: string }) => ({
        profileDirectory: options?.profileDirectory ?? null,
        tabCount: 1,
        windowCount: 1,
      }),
    );

    const exitCode = await runRestoreCommand({
      args: [sessionPath],
      deps: {
        getProfiles: async () => [],
        isInteractiveTerminal: () => false,
        listStoredSessionFiles: async () => [],
        readSession: async () => makeSession(),
        restoreSession,
        selectOne: async () => sessionPath,
      },
      env: process.env,
      json: true,
      logger: createLogger(),
      output: capture.output,
    });

    expect(exitCode).toBe(0);
    expect(restoreSession).toHaveBeenCalledWith(expect.anything(), {
      profileDirectory: undefined,
    });
  });
});
