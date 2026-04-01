import { CliUsageError, errorToExitCode, formatError } from "../lib/errors.js";
import { createLogger } from "../lib/logger.js";
import { APP_NAME, APP_VERSION } from "../lib/meta.js";
import { createOutput } from "../lib/output.js";
import { assertMacOS } from "../platform/guard.js";
import { doctorCommand } from "./doctor.js";
import { installCommand } from "./install.js";
import { listCommand } from "./list.js";
import { mcpCommand } from "./mcp.js";
import { ragCommand } from "./rag.js";
import { restoreCommand } from "./restore.js";
import { saveCommand } from "./save.js";
import { searchCommand } from "./search.js";
import { setupCommand } from "./setup.js";
import type { CommandDefinition, GlobalFlags } from "./types.js";

const COMMANDS = {
  doctor: doctorCommand,
  install: installCommand,
  list: listCommand,
  mcp: mcpCommand,
  rag: ragCommand,
  restore: restoreCommand,
  save: saveCommand,
  search: searchCommand,
  setup: setupCommand,
} as const satisfies Record<string, CommandDefinition>;

const SELF_GUARDED_COMMANDS: ReadonlySet<CommandName> = new Set(["install", "setup"]);

type CommandName = keyof typeof COMMANDS;

const COMMAND_ALIASES = new Map<string, CommandName>(
  Object.entries(COMMANDS).flatMap(([name, def]) =>
    (def.aliases ?? []).map((alias) => [alias, name] as [string, CommandName]),
  ),
);

function resolveCommand(token: string): CommandName | undefined {
  if (token in COMMANDS) return token as CommandName;
  return COMMAND_ALIASES.get(token);
}

function buildRootHelpText(): string {
  const commandLines = Object.entries(COMMANDS)
    .map(([name, def]) => `  ${name.padEnd(10)}${def.description}`)
    .join("\n");

  const exampleLines = Object.entries(COMMANDS)
    .flatMap(([, def]) => (def.examples ?? []).map((ex) => `  ${APP_NAME} ${ex}`))
    .join("\n");

  return `${APP_NAME} is a macOS-only CLI and local stdio MCP server.

Usage:
  ${APP_NAME} [global flags] <command> [args]

Commands:
${commandLines}
  help      Show this help text.

Global flags:
  -h, --help     Show help and exit.
  --version      Print the current version.
  --json         Emit structured JSON when the command supports it.
  -q, --quiet    Reduce diagnostic output.
  -v, --verbose  Increase diagnostic output on stderr.

Examples:
${exampleLines}
`;
}

const HELP_TEXT = buildRootHelpText();

interface ParsedArgs {
  command?: CommandName;
  commandArgs: string[];
  flags: GlobalFlags;
}

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

    if (!SELF_GUARDED_COMMANDS.has(parsed.command)) {
      assertMacOS({ env });
    }

    return await COMMANDS[parsed.command].run({
      args: parsed.commandArgs,
      env,
      flags: parsed.flags,
      logger,
      output,
    });
  } catch (error) {
    const message = formatError(error);
    if (message) output.stderr(message);
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
  const resolved = normalizedPositionals[0] ? resolveCommand(normalizedPositionals[0]) : undefined;

  if (resolved) {
    command = resolved;
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
