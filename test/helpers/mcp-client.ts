import { once } from "node:events";

import { spawnCli } from "./process.js";

interface JsonRpcResponse {
  error?: {
    code: number;
    message: string;
  };
  id?: number | string | null;
  jsonrpc: "2.0";
  result?: unknown;
}

export async function withMcpServer<T>(
  callback: (server: {
    request(message: Record<string, unknown>): Promise<JsonRpcResponse>;
    stderr: () => string;
  }) => Promise<T>,
): Promise<T> {
  const child = spawnCli(["mcp"]);
  let stdoutBuffer = "";
  let stderrBuffer = "";
  const pending = new Map<number | string, (message: JsonRpcResponse) => void>();

  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");

  child.stdout.on("data", (chunk: string) => {
    stdoutBuffer += chunk;

    while (true) {
      const newlineIndex = stdoutBuffer.indexOf("\n");

      if (newlineIndex === -1) {
        break;
      }

      const raw = stdoutBuffer.slice(0, newlineIndex).trim();
      stdoutBuffer = stdoutBuffer.slice(newlineIndex + 1);

      if (!raw) {
        continue;
      }

      const message = JSON.parse(raw) as JsonRpcResponse;

      if (message.id !== undefined && message.id !== null) {
        pending.get(message.id)?.(message);
      }
    }
  });

  child.stderr.on("data", (chunk: string) => {
    stderrBuffer += chunk;
  });

  const api = {
    async request(message: Record<string, unknown>): Promise<JsonRpcResponse> {
      const id = message.id;

      if (typeof id !== "number" && typeof id !== "string") {
        throw new Error("Test MCP request must include an id");
      }

      const promise = new Promise<JsonRpcResponse>((resolve) => {
        pending.set(id, resolve);
      });

      child.stdin.write(`${JSON.stringify(message)}\n`);

      const response = await promise;
      pending.delete(id);
      return response;
    },
    stderr(): string {
      return stderrBuffer;
    },
  };

  try {
    return await callback(api);
  } finally {
    child.stdin.end();
    await once(child, "close");
  }
}
