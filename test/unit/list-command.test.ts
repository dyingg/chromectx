import { describe, expect, mock, test } from "bun:test";
import type { ChromeSession, ChromeTab } from "../../src/browser/index.js";
import { runListCommand } from "../../src/commands/list.js";
import type { Logger } from "../../src/lib/logger.js";
import type { Output } from "../../src/lib/output.js";

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

function createDependencies(options: {
  savedSessionFiles?: string[];
  selectedSessionId?: string;
  sessions?: ChromeSession[];
  tabs?: ChromeTab[];
}) {
  return {
    getSessions: async () => options.sessions ?? [],
    getTabsInSession: async () => options.tabs ?? [],
    isInteractiveTerminal: () => true,
    listStoredSessionFiles: async () => options.savedSessionFiles ?? [],
    readSession: async () => ({
      capturedAt: "2026-03-31T12:00:00.000Z",
      name: "stored session",
      profile: null,
      version: 1 as const,
      windows: [
        {
          activeTabIndex: 1,
          mode: "normal" as const,
          tabs: [{ title: "Example", url: "https://example.com" }],
        },
      ],
    }),
    selectOne: async () => options.selectedSessionId ?? "",
  };
}

describe("runListCommand", () => {
  test("shows help text when no subcommand is provided", async () => {
    const capture = createOutputCapture();

    const exitCode = await runListCommand({
      args: [],
      json: false,
      logger: createLogger(),
      output: capture.output,
    });

    expect(exitCode).toBe(0);
    expect(capture.stdout[0]).toContain("chromectx list sessions");
  });

  test("lists sessions in json mode", async () => {
    const capture = createOutputCapture();
    const sessions: ChromeSession[] = [
      {
        activeTabIndex: 1,
        bounds: { height: 900, width: 1440, x: 0, y: 0 },
        id: "100",
        mode: "normal",
        name: "GitHub",
        tabCount: 3,
      },
    ];

    const exitCode = await runListCommand({
      args: ["sessions"],
      deps: createDependencies({ sessions }),
      json: true,
      logger: createLogger(),
      output: capture.output,
    });

    expect(exitCode).toBe(0);
    expect(JSON.parse(capture.stdout[0])).toEqual(sessions);
  });

  test("lists tabs for a provided session id", async () => {
    const capture = createOutputCapture();
    const tabs: ChromeTab[] = [
      {
        active: true,
        id: "10",
        index: 0,
        loading: false,
        title: "Chrome Spill",
        url: "https://github.com/dyingg/chromectx",
        windowId: "100",
      },
    ];
    const getTabsInSession = mock(async () => tabs);

    const exitCode = await runListCommand({
      args: ["tabs", "100"],
      deps: {
        ...createDependencies({}),
        getTabsInSession,
      },
      json: true,
      logger: createLogger(),
      output: capture.output,
    });

    expect(exitCode).toBe(0);
    expect(getTabsInSession).toHaveBeenCalledWith("100");
    expect(JSON.parse(capture.stdout[0])).toEqual(tabs);
  });

  test("prompts for a session when list tabs runs interactively without an id", async () => {
    const capture = createOutputCapture();
    const sessions: ChromeSession[] = [
      {
        activeTabIndex: 1,
        bounds: { height: 900, width: 1440, x: 0, y: 0 },
        id: "100",
        mode: "normal",
        name: "Work",
        tabCount: 2,
      },
    ];
    const getTabsInSession = mock(async () => [
      {
        active: true,
        id: "10",
        index: 0,
        loading: false,
        title: "Docs",
        url: "https://example.com",
        windowId: "100",
      },
    ]);

    const exitCode = await runListCommand({
      args: ["tabs"],
      deps: {
        ...createDependencies({ selectedSessionId: "100", sessions }),
        getTabsInSession,
      },
      json: false,
      logger: createLogger(),
      output: capture.output,
    });

    expect(exitCode).toBe(0);
    expect(getTabsInSession).toHaveBeenCalledWith("100");
  });

  test("lists saved sessions in json mode", async () => {
    const capture = createOutputCapture();

    const exitCode = await runListCommand({
      args: ["saved"],
      deps: createDependencies({
        savedSessionFiles: ["/tmp/alpha.json"],
      }),
      env: process.env,
      json: true,
      logger: createLogger(),
      output: capture.output,
    });

    expect(exitCode).toBe(0);
    expect(JSON.parse(capture.stdout[0])).toMatchObject([
      {
        fileName: "alpha.json",
        name: "stored session",
      },
    ]);
  });
});
