import { CliUsageError } from "../lib/errors.js";
import { fetchSources } from "../lib/http.js";
import type { Logger } from "../lib/logger.js";
import type { Output } from "../lib/output.js";
import { executeRag, type RagDependencies } from "../lib/workflows/rag.js";
import { buildIndex } from "../lib/workflows/search/index.js";
import { getAllTabs } from "../platform/macos/chrome/index.js";
import type { CommandDefinition } from "./types.js";

interface RagCommandOptions {
  args: string[];
  deps?: RagDependencies;
  logger: Logger;
  output: Output;
}

interface RagArguments {
  query: string;
  top: number | undefined;
}

export const RAG_HELP_TEXT = `Usage:
  chromectx rag <query> [--top <n>]

Search open Chrome tabs and return page-grouped results with full
markdown content. Output is always JSON (for piping to agents/scripts).

Options:
  --top <n>   Maximum number of page results to return (default: 5)

Examples:
  chromectx rag "authentication flow"
  chromectx rag "error handling" --top 3
`;

export const ragCommand: CommandDefinition = {
  description: "RAG search across open Chrome tabs (JSON output).",
  helpText: RAG_HELP_TEXT,
  examples: ['rag "authentication flow"'],
  run: ({ args, logger, output }) => runRagCommand({ args, logger, output }),
};

const defaultDependencies: RagDependencies = {
  buildIndex,
  fetchSources,
  getAllTabs,
};

export async function runRagCommand(options: RagCommandOptions): Promise<number> {
  const deps = options.deps ?? defaultDependencies;
  const parsed = parseRagArgs(options.args);

  const { results } = await executeRag(
    { query: parsed.query, top: parsed.top, fullContent: true, logger: options.logger },
    deps,
  );

  options.output.json(results);
  return 0;
}

export function parseRagArgs(args: string[]): RagArguments {
  let query: string | undefined;
  let top: number | undefined;

  for (let i = 0; i < args.length; i++) {
    const token = args[i];

    if (token === "--top") {
      const value = args[i + 1];
      if (!value) throw new CliUsageError("Missing value for --top");
      const n = Number.parseInt(value, 10);
      if (Number.isNaN(n) || n < 1) throw new CliUsageError(`Invalid --top value: ${value}`);
      top = n;
      i += 1;
      continue;
    }

    if (token.startsWith("-")) {
      throw new CliUsageError(`Unknown flag for rag: ${token}`);
    }

    if (query !== undefined) {
      throw new CliUsageError("Only one search query is allowed.");
    }
    query = token;
  }

  if (!query) {
    throw new CliUsageError("Search query is required. Usage: chromectx rag <query>");
  }

  return { query, top };
}
