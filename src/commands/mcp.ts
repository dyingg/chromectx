import type { Logger } from "../lib/logger.js";
import { startMcpServer } from "../mcp/server.js";

interface McpCommandOptions {
  env: NodeJS.ProcessEnv;
  logger: Logger;
}

export async function runMcpCommand(options: McpCommandOptions): Promise<number> {
  await startMcpServer({
    env: options.env,
    logger: options.logger,
  });

  return 0;
}
