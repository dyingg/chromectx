import { execFile } from "node:child_process";
import { confirm, intro, log, outro, spinner } from "@clack/prompts";
import { isCancel } from "@clack/prompts";
import { CliCancelError, CliUsageError } from "../lib/errors.js";
import type { Logger } from "../lib/logger.js";
import { APP_NAME } from "../lib/meta.js";
import type { Output } from "../lib/output.js";
import { getRuntimePlatform } from "../platform/guard.js";
import {
  checkAutomationPermission,
  detectChromeInstallation,
} from "../platform/macos/chrome/index.js";
import type { CommandDefinition } from "./types.js";
import { runAddMcp } from "./setup.js";

export const INSTALL_HELP_TEXT = `Usage:
  chromectx install

One-time guided setup:
  1. Checks your environment (macOS, Chrome, automation permissions)
  2. Installs chromectx globally via npm
  3. Configures the MCP server for your AI tools

Re-run anytime to update to the latest version.
`;

interface InstallCommandOptions {
  env: NodeJS.ProcessEnv;
  logger: Logger;
  output: Output;
}

function exec(command: string, args: string[]): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    execFile(command, args, (error, stdout, stderr) => {
      if (error) return reject(error);
      resolve({ stdout: stdout.trim(), stderr: stderr.trim() });
    });
  });
}

export async function runInstallCommand(options: InstallCommandOptions): Promise<number> {
  const { logger } = options;

  intro(`${APP_NAME} install`);

  // Step 0: Environment check
  const runtime = getRuntimePlatform({ env: options.env });
  if (runtime.platform !== "darwin") {
    log.error(
      `chromectx requires macOS. Detected platform: ${runtime.platform}.\n` +
        "It uses AppleScript to communicate with Chrome.",
    );
    outro("Setup cannot continue on this platform.");
    return 1;
  }
  log.success(`Platform: ${runtime.name} ${runtime.release} (${runtime.arch})`);

  const chrome = detectChromeInstallation();
  if (!chrome.installed) {
    log.warning(
      "Google Chrome was not found in /Applications.\n" +
        "Install Chrome first, then re-run this command.",
    );
    const proceed = await confirm({ message: "Continue anyway?" });
    if (isCancel(proceed) || !proceed) {
      outro("Setup cancelled.");
      return 0;
    }
  } else {
    log.success(`Chrome: ${chrome.path}`);
  }

  const perms = await checkAutomationPermission();
  if (!perms.permitted) {
    const guidance =
      perms.status === "denied"
        ? "Open System Settings > Privacy & Security > Automation\n" +
          "and allow your terminal app to control Google Chrome."
        : `Automation check returned an unexpected result: ${perms.detail}`;
    log.warning(`Automation: ${perms.status}\n${guidance}`);
    const proceed = await confirm({ message: "Continue anyway? (you can grant permission later)" });
    if (isCancel(proceed) || !proceed) {
      outro("Setup cancelled.");
      return 0;
    }
  } else {
    log.success("Automation: granted");
  }

  // Step 1: Global install
  const s = spinner();
  s.start("Installing chromectx globally...");
  try {
    await exec("npm", ["install", "-g", "chromectx@latest"]);
    const { stdout: version } = await exec("chromectx", ["--version"]);
    s.stop(`chromectx v${version} installed globally`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    s.stop("Global install failed");
    log.error(`npm install -g chromectx@latest failed:\n${message}`);
    log.info("You can install manually later: npm i -g chromectx");
    logger.debug(`Install error: ${message}`);
  }

  // Step 2: MCP setup
  const setupMcp = await confirm({
    message: "Set up chromectx as an MCP server for your AI tools?",
  });

  if (isCancel(setupMcp)) {
    throw new CliCancelError();
  }

  if (setupMcp) {
    await runAddMcp({ interactive: true, logger });
  } else {
    log.info("You can run `chromectx setup` anytime to configure MCP later.");
  }

  // Step 3: Summary
  outro("Setup complete!");
  return 0;
}

export const installCommand: CommandDefinition = {
  description: "One-time guided setup: env check, global install, MCP config.",
  helpText: INSTALL_HELP_TEXT,
  examples: ["install"],
  run: async ({ args, env, logger, output }) => {
    if (args.length > 0) {
      throw new CliUsageError(`Unexpected arguments for install: ${args.join(" ")}`);
    }

    return await runInstallCommand({ env, logger, output });
  },
};
