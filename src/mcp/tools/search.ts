import { fetchSources } from "../../lib/http.js";
import { executeRag, type RagSearchResult, type SearchResult } from "../../lib/workflows/rag.js";
import { buildIndex } from "../../lib/workflows/search/index.js";
import { getAllTabs } from "../../platform/macos/chrome/index.js";
import type { McpTool } from "./doctor.js";

export const ragTool: McpTool = {
  name: "rag_search",
  title: "RAG Search Chrome Tabs",
  description:
    "Search the content of all open Chrome tabs using BM25 ranking. " +
    "Returns matched chunks by default. Set return_full_site to true to also get " +
    "full page markdown for each matching page (useful for RAG context).",
  inputSchema: {
    type: "object",
    required: ["query"],
    additionalProperties: false,
    properties: {
      query: {
        type: "string",
        description: "The search query.",
      },
      top: {
        type: "number",
        description: "Maximum number of results to return. Default: 5.",
      },
      return_full_site: {
        type: "boolean",
        description:
          "When true, results are grouped by page and include the full page markdown. Default: false.",
      },
    },
  },

  async execute(args, _env) {
    const query = args.query as string;
    const top = (args.top as number | undefined) ?? 5;
    const returnFullSite = (args.return_full_site as boolean | undefined) ?? false;

    const { results, pageCount } = await executeRag(
      { query, top, fullContent: returnFullSite },
      { buildIndex, fetchSources, getAllTabs },
    );

    if (results.length === 0) {
      const reason = pageCount === 0 ? "No open Chrome tabs found." : `No results for "${query}".`;
      return { content: [{ type: "text", text: reason }] };
    }

    if (returnFullSite) {
      const ragResults = results as RagSearchResult[];
      const summary = ragResults
        .map((r) => `${r.title} — ${r.url} (${r.chunks.length} chunks, top score: ${r.topScore})`)
        .join("\n");

      return {
        content: [{ type: "text", text: summary }],
        structuredContent: { query, resultCount: results.length, results },
      };
    }

    const chunkResults = results as SearchResult[];
    const summary = chunkResults.map((r) => `${r.title} — ${r.url} (score: ${r.score})`).join("\n");

    return {
      content: [{ type: "text", text: summary }],
      structuredContent: { query, resultCount: results.length, results },
    };
  },
};
