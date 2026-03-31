import path from "node:path";

import { resolveAppPaths } from "../lib/config.js";
import { CliUsageError } from "../lib/errors.js";
import type { Logger } from "../lib/logger.js";
import type { Output } from "../lib/output.js";
import {
  buildSessionFromChromeSession,
  type Session,
  writeSession,
  writeSessionFile,
} from "../lib/store/index.js";
import { isInteractiveTerminal } from "../lib/terminal.js";
import { type SelectOption, selectOne } from "../lib/tui/select.js";
import {
  type ChromeSession,
  getSessions,
  getTabsInSession,
} from "../platform/macos/chrome/index.js";

interface DumpCommandOptions {
  args: string[];
  deps?: DumpCommandDependencies;
  env: NodeJS.ProcessEnv;
  json: boolean;
  logger: Logger;
  output: Output;
}

interface DumpCommandDependencies {
  getSessions: typeof getSessions;
  getTabsInSession: typeof getTabsInSession;
  isInteractiveTerminal: typeof isInteractiveTerminal;
  selectOne: typeof selectOne;
  writeSession: typeof writeSession;
  writeSessionFile: typeof writeSessionFile;
}

interface DumpSessionArguments {
  outputFile?: string;
  sessionId?: string;
}

const DUMP_HELP_TEXT = `Usage:
  chrome-spill dump session <session-id> [--output <file>] [--json]
  chrome-spill dump session [--output <file>] [--json]

Commands:
  session    Capture one open Chrome session into the store format.

Examples:
  chrome-spill dump session 123
  chrome-spill dump session 123 --output ./work-session.json
  chrome-spill dump session
`;

const defaultDependencies: DumpCommandDependencies = {
  getSessions,
  getTabsInSession,
  isInteractiveTerminal,
  selectOne,
  writeSession,
  writeSessionFile,
};

export async function runDumpCommand(options: DumpCommandOptions): Promise<number> {
  const deps = options.deps ?? defaultDependencies;
  const [subcommand, ...rest] = options.args;

  if (!subcommand || subcommand === "help") {
    options.output.stdout(DUMP_HELP_TEXT);
    return 0;
  }

  switch (subcommand) {
    case "session":
      return await runDumpSessionCommand({
        args: rest,
        deps,
        env: options.env,
        json: options.json,
        logger: options.logger,
        output: options.output,
      });
    default:
      throw new CliUsageError(`Unknown dump subcommand: ${subcommand}`);
  }
}

export function parseDumpSessionArgs(args: string[]): DumpSessionArguments {
  let outputFile: string | undefined;
  let sessionId: string | undefined;

  for (let index = 0; index < args.length; index += 1) {
    const token = args[index];

    if (token === "-o" || token === "--output") {
      const value = args[index + 1];

      if (!value) {
        throw new CliUsageError("Missing value for --output");
      }

      outputFile = value;
      index += 1;
      continue;
    }

    if (token.startsWith("-")) {
      throw new CliUsageError(`Unknown flag for dump session: ${token}`);
    }

    if (sessionId) {
      throw new CliUsageError(`Unexpected arguments for dump session: ${args.join(" ")}`);
    }

    sessionId = token;
  }

  return {
    outputFile,
    sessionId,
  };
}

async function runDumpSessionCommand(options: {
  args: string[];
  deps: DumpCommandDependencies;
  env: NodeJS.ProcessEnv;
  json: boolean;
  logger: Logger;
  output: Output;
}): Promise<number> {
  const parsed = parseDumpSessionArgs(options.args);
  const sessions = await options.deps.getSessions();
  const sessionId =
    parsed.sessionId ??
    (await selectOpenSession({
      deps: options.deps,
      sessions,
      usage:
        "Session ID is required when not running interactively. Usage: chrome-spill dump session <session-id>",
    }));
  const session = sessions.find((entry) => entry.id === sessionId);

  if (!session) {
    throw new CliUsageError(`Unknown session id: ${sessionId}`);
  }

  const tabs = await options.deps.getTabsInSession(sessionId);
  const storedSession = buildSessionFromChromeSession(session, tabs);
  const filePath = await saveSession({
    deps: options.deps,
    outputFile: parsed.outputFile,
    paths: resolveAppPaths(options.env),
    session: storedSession,
  });

  options.logger.debug(`Saved session ${sessionId} to ${filePath}`);

  if (options.json) {
    options.output.json({
      capturedAt: storedSession.capturedAt,
      filePath,
      name: storedSession.name,
      sessionId,
      tabCount: tabs.length,
      windowCount: storedSession.windows.length,
    });
    return 0;
  }

  options.output.stdout(
    [
      "Saved session",
      "",
      `session: ${sessionId}`,
      `name: ${storedSession.name}`,
      `tabs: ${tabs.length}`,
      `file: ${filePath}`,
    ].join("\n"),
  );

  return 0;
}

async function saveSession(options: {
  deps: DumpCommandDependencies;
  outputFile?: string;
  paths: ReturnType<typeof resolveAppPaths>;
  session: Session;
}): Promise<string> {
  if (!options.outputFile) {
    return await options.deps.writeSession(options.paths, options.session);
  }

  return await options.deps.writeSessionFile(path.resolve(options.outputFile), options.session);
}

async function selectOpenSession(options: {
  deps: DumpCommandDependencies;
  sessions: ChromeSession[];
  usage: string;
}): Promise<string> {
  if (!options.deps.isInteractiveTerminal()) {
    throw new CliUsageError(options.usage);
  }

  if (options.sessions.length === 0) {
    throw new CliUsageError("No open Chrome sessions found.");
  }

  const selectOptions: SelectOption<string>[] = options.sessions.map((session) => ({
    hint: `${session.tabCount} tabs · ${session.mode}`,
    label: `${session.name}  (${session.id})`,
    value: session.id,
  }));

  return await options.deps.selectOne({
    message: "Select a Chrome session",
    options: selectOptions,
  });
}
