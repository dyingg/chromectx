import { spawn } from "node:child_process";
import { log } from "@clack/prompts";
import { CliUsageError } from "../lib/errors.js";
import type { Logger } from "../lib/logger.js";
import type { CommandDefinition } from "./types.js";

export const SETUP_HELP_TEXT = `Usage:
  chromectx setup [--yes]

Configure chromectx as an MCP server for your AI tools.
Uses add-mcp to auto-detect installed tools (Claude Desktop, Cursor,
VS Code, Claude Code, and more) and write the correct config.

Options:
  --yes    Skip confirmation prompts (install to all detected tools)

Examples:
  chromectx setup
  chromectx setup --yes
`;

export interface RunAddMcpOptions {
  interactive: boolean;
  logger: Logger;
}

export function runAddMcp(options: RunAddMcpOptions): Promise<void> {
  const args = ["-y", "add-mcp", "npx -y chromectx@latest mcp", "-g"];
  if (!options.interactive) {
    args.push("-y", "--all");
  }

  options.logger.debug(`Spawning: npx ${args.join(" ")}`);

  return new Promise((resolve, reject) => {
    const child = spawn("npx", args, {
      stdio: "inherit",
      shell: false,
    });

    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`add-mcp exited with code ${code}`));
      }
    });
  });
}

interface SetupCommandOptions {
  args: string[];
  logger: Logger;
}

function parseSetupArgs(args: string[]): { yes: boolean } {
  let yes = false;
  for (const arg of args) {
    if (arg === "--yes" || arg === "-y") {
      yes = true;
    } else {
      throw new CliUsageError(`Unexpected argument for setup: ${arg}`);
    }
  }
  return { yes };
}

export async function runSetupCommand(options: SetupCommandOptions): Promise<number> {
  const { yes } = parseSetupArgs(options.args);

  try {
    await runAddMcp({ interactive: !yes, logger: options.logger });
    log.success("MCP server configured.");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log.error(`MCP setup failed: ${message}`);
    log.info("You can configure manually — see: https://github.com/dyingg/chromectx#manual-setup");
    return 1;
  }

  return 0;
}

export const setupCommand: CommandDefinition = {
  description: "Configure chromectx as an MCP server for your AI tools.",
  helpText: SETUP_HELP_TEXT,
  examples: ["setup", "setup --yes"],
  run: async ({ args, logger }) => {
    return await runSetupCommand({ args, logger });
  },
};
