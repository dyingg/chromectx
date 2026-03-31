import { CliUsageError, errorToExitCode, formatError } from "../lib/errors.js";
import { createLogger } from "../lib/logger.js";
import { APP_NAME, APP_VERSION } from "../lib/meta.js";
import { createOutput } from "../lib/output.js";
import { assertMacOS } from "../platform/guard.js";
import { DOCTOR_HELP_TEXT, runDoctorCommand } from "./doctor.js";
import { LIST_HELP_TEXT, runListCommand } from "./list.js";
import { MCP_HELP_TEXT, runMcpCommand } from "./mcp.js";
import { RESTORE_HELP_TEXT, runRestoreCommand } from "./restore.js";
import { runSaveCommand, SAVE_HELP_TEXT } from "./save.js";
import { runSearchCommand, SEARCH_HELP_TEXT } from "./search.js";

type CommandName = "doctor" | "list" | "mcp" | "restore" | "save" | "search";

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

interface CommandExecutionContext {
  env: NodeJS.ProcessEnv;
  logger: ReturnType<typeof createLogger>;
  output: ReturnType<typeof createOutput>;
  parsed: ParsedArgs & { command: CommandName };
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
  search    Search open Chrome tabs by page content.
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
  ${APP_NAME} search "react hooks"
  ${APP_NAME} mcp
`;

const COMMANDS: Record<
  CommandName,
  {
    helpText: string;
    run: (context: CommandExecutionContext) => Promise<number>;
  }
> = {
  doctor: {
    helpText: DOCTOR_HELP_TEXT,
    run: async ({ env, logger, output, parsed }) => {
      if (parsed.commandArgs.length > 0) {
        throw new CliUsageError(`Unexpected arguments for doctor: ${parsed.commandArgs.join(" ")}`);
      }

      return await runDoctorCommand({
        env,
        json: parsed.flags.json,
        logger,
        output,
      });
    },
  },
  list: {
    helpText: LIST_HELP_TEXT,
    run: async ({ env, logger, output, parsed }) =>
      await runListCommand({
        args: parsed.commandArgs,
        env,
        json: parsed.flags.json,
        logger,
        output,
      }),
  },
  mcp: {
    helpText: MCP_HELP_TEXT,
    run: async ({ env, logger, parsed }) => {
      if (parsed.commandArgs.length > 0) {
        throw new CliUsageError(`Unexpected arguments for mcp: ${parsed.commandArgs.join(" ")}`);
      }

      return await runMcpCommand({
        env,
        logger,
      });
    },
  },
  restore: {
    helpText: RESTORE_HELP_TEXT,
    run: async ({ env, logger, output, parsed }) =>
      await runRestoreCommand({
        args: parsed.commandArgs,
        env,
        json: parsed.flags.json,
        logger,
        output,
      }),
  },
  save: {
    helpText: SAVE_HELP_TEXT,
    run: async ({ env, logger, output, parsed }) =>
      await runSaveCommand({
        args: parsed.commandArgs,
        env,
        json: parsed.flags.json,
        logger,
        output,
      }),
  },
  search: {
    helpText: SEARCH_HELP_TEXT,
    run: async ({ env, logger, output, parsed }) =>
      await runSearchCommand({
        args: parsed.commandArgs,
        env,
        json: parsed.flags.json,
        logger,
        output,
      }),
  },
};

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
    const commandHelpRequested =
      parsed.command !== undefined && (parsed.flags.help || parsed.commandArgs[0] === "help");

    if (parsed.flags.help && !parsed.command) {
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

    if (commandHelpRequested) {
      output.stdout(COMMANDS[parsed.command].helpText);
      return 0;
    }

    assertMacOS({ env });

    return await COMMANDS[parsed.command].run({
      env,
      logger,
      output,
      parsed: parsed as ParsedArgs & { command: CommandName },
    });
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
    normalizedPositionals[0] === "search" ||
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
