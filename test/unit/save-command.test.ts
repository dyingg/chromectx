import { describe, expect, mock, test } from "bun:test";

import { parseSaveSessionsArgs, runSaveCommand } from "../../src/commands/save.js";
import type { Logger } from "../../src/lib/logger.js";
import type { Output } from "../../src/lib/output.js";
import type { Session } from "../../src/lib/store/index.js";
import type { ChromeSession, ChromeTab } from "../../src/platform/macos/chrome/index.js";

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

describe("parseSaveSessionsArgs", () => {
  test("parses a session id and output file", () => {
    expect(parseSaveSessionsArgs(["123", "--output", "./session.json"])).toEqual({
      outputFile: "./session.json",
      sessionId: "123",
    });
  });

  test("parses output before the session id", () => {
    expect(parseSaveSessionsArgs(["--output", "./session.json", "123"])).toEqual({
      outputFile: "./session.json",
      sessionId: "123",
    });
  });
});

describe("runSaveCommand", () => {
  test("writes to an explicit output file when requested", async () => {
    const capture = createOutputCapture();
    const sessions: ChromeSession[] = [
      {
        activeTabIndex: 1,
        bounds: { height: 900, width: 1440, x: 0, y: 0 },
        id: "100",
        mode: "normal",
        name: "Work",
        tabCount: 1,
      },
    ];
    const tabs: ChromeTab[] = [
      {
        active: true,
        id: "10",
        index: 0,
        loading: false,
        title: "Example",
        url: "https://example.com",
        windowId: "100",
      },
    ];
    const writeSessionFile = mock(async (filePath: string, _session: Session) => filePath);

    const exitCode = await runSaveCommand({
      args: ["sessions", "100", "--output", "./saved.json"],
      deps: {
        getSessions: async () => sessions,
        getTabsInSession: async () => tabs,
        isInteractiveTerminal: () => true,
        selectOne: async () => "100",
        writeSession: async () => "",
        writeSessionFile,
      },
      env: process.env,
      json: true,
      logger: createLogger(),
      output: capture.output,
    });

    expect(exitCode).toBe(0);
    expect(writeSessionFile).toHaveBeenCalled();
    expect(JSON.parse(capture.stdout[0])).toMatchObject({
      name: "Work",
      sessionId: "100",
      tabCount: 1,
    });
  });
});
