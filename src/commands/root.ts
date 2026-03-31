import { CliUsageError, errorToExitCode, formatError } from "../lib/errors.js";
import { createLogger } from "../lib/logger.js";
import { APP_NAME, APP_VERSION } from "../lib/meta.js";
import { createOutput } from "../lib/output.js";
import { assertMacOS } from "../platform/guard.js";
import { runDoctorCommand } from "./doctor.js";
import { runListCommand } from "./list.js";
import { runMcpCommand } from "./mcp.js";
import { runRestoreCommand } from "./restore.js";
import { runSaveCommand } from "./save.js";

type CommandName = "doctor" | "list" | "mcp" | "restore" | "save";

interface GlobalFlags {
  help: boolean;
  version: boolean;
  json: boolean;
  quiet: boolean;
  verbose: boolean;
}

interface ParsedArgs {
  command?: CommandName;
  commandArgs: string[];
  flags: GlobalFlags;
}

const HELP_TEXT = `${APP_NAME} is a macOS-only CLI and local stdio MCP server.

Usage:
  ${APP_NAME} [global flags] <command> [args]

Commands:
  doctor    Inspect the local runtime and report macOS-specific readiness.
  list      List Chrome sessions and tabs.
  mcp       Start the local MCP server over stdin/stdout.
  restore   Restore saved Chrome sessions from a file or the default store.
  save      Save Chrome sessions into the store format.
  help      Show this help text.

Global flags:
  -h, --help     Show help and exit.
  --version      Print the current version.
  --json         Emit structured JSON when the command supports it.
  -q, --quiet    Reduce diagnostic output.
  -v, --verbose  Increase diagnostic output on stderr.

Examples:
  ${APP_NAME} doctor
  ${APP_NAME} doctor --json
  ${APP_NAME} restore
  ${APP_NAME} restore morning-tabs
  ${APP_NAME} save
  ${APP_NAME} save 123
  ${APP_NAME} list sessions
  ${APP_NAME} list saved
  ${APP_NAME} list tabs 123
  ${APP_NAME} mcp
`;

export async function runCli(
  argv: string[],
  env: NodeJS.ProcessEnv = process.env,
): Promise<number> {
  const output = createOutput();

  try {
    const parsed = parseCliArgs(argv);
    const logger = createLogger({
      quiet: parsed.flags.quiet,
      verbose: parsed.flags.verbose,
    });

    if (parsed.flags.help) {
      output.stdout(HELP_TEXT);
      return 0;
    }

    if (parsed.flags.version) {
      output.stdout(APP_VERSION);
      return 0;
    }

    if (!parsed.command) {
      output.stdout(HELP_TEXT);
      return 0;
    }

    assertMacOS({ env });

    switch (parsed.command) {
      case "doctor":
        if (parsed.commandArgs.length > 0) {
          throw new CliUsageError(
            `Unexpected arguments for doctor: ${parsed.commandArgs.join(" ")}`,
          );
        }

        return await runDoctorCommand({
          env,
          json: parsed.flags.json,
          logger,
          output,
        });
      case "list":
        return await runListCommand({
          args: parsed.commandArgs,
          env,
          json: parsed.flags.json,
          logger,
          output,
        });
      case "mcp":
        if (parsed.commandArgs.length > 0) {
          throw new CliUsageError(`Unexpected arguments for mcp: ${parsed.commandArgs.join(" ")}`);
        }

        return await runMcpCommand({
          env,
          logger,
        });
      case "restore":
        return await runRestoreCommand({
          args: parsed.commandArgs,
          env,
          json: parsed.flags.json,
          logger,
          output,
        });
      case "save":
        return await runSaveCommand({
          args: parsed.commandArgs,
          env,
          json: parsed.flags.json,
          logger,
          output,
        });
      default:
        throw new CliUsageError(`Unknown command: ${parsed.command}`);
    }
  } catch (error) {
    output.stderr(formatError(error));
    return errorToExitCode(error);
  }
}

export function parseCliArgs(argv: string[]): ParsedArgs {
  const flags: GlobalFlags = {
    help: false,
    version: false,
    json: false,
    quiet: false,
    verbose: false,
  };

  const positionals: string[] = [];

  for (const token of argv) {
    if (token === "-h" || token === "--help") {
      flags.help = true;
      continue;
    }

    if (token === "--version") {
      flags.version = true;
      continue;
    }

    if (token === "--json") {
      flags.json = true;
      continue;
    }

    if (token === "-q" || token === "--quiet") {
      flags.quiet = true;
      continue;
    }

    if (token === "-v" || token === "--verbose") {
      flags.verbose = true;
      continue;
    }

    positionals.push(token);
  }

  let normalizedPositionals = positionals;

  if (normalizedPositionals[0] === "help") {
    flags.help = true;
    normalizedPositionals = normalizedPositionals.slice(1);
  }

  let command: CommandName | undefined;

  if (
    normalizedPositionals[0] === "doctor" ||
    normalizedPositionals[0] === "list" ||
    normalizedPositionals[0] === "mcp" ||
    normalizedPositionals[0] === "restore" ||
    normalizedPositionals[0] === "save" ||
    normalizedPositionals[0] === "dump"
  ) {
    command = normalizedPositionals[0] === "dump" ? "save" : normalizedPositionals[0];
    normalizedPositionals = normalizedPositionals.slice(1);
  }

  if (flags.help) {
    return {
      command,
      commandArgs: normalizedPositionals,
      flags,
    };
  }

  if (!command && normalizedPositionals.length > 0) {
    throw new CliUsageError(`Unknown command: ${normalizedPositionals[0]}`);
  }

  return {
    command,
    commandArgs: normalizedPositionals,
    flags,
  };
}
