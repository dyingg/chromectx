import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { fetchSources } from "../../lib/http.js";
import { executeRag, type RagSearchResult, type SearchResult } from "../../lib/workflows/rag.js";
import { buildIndex } from "../../lib/workflows/search/index.js";
import { getAllTabs } from "../../platform/macos/chrome/index.js";

export function registerRagTool(server: McpServer): void {
  server.registerTool(
    "rag_chrome_search",
    {
      title: "Search Content of Open Chrome Tabs",
      description:
        "Search the actual page content of every open Chrome tab using BM25 ranking. " +
        "Use this tool whenever the user mentions docs, references, or pages they have open in Chrome " +
        '(e.g. "the docs are open in Chrome", "find it in my Chrome tabs", "check the page I have open"). ' +
        "Each call fetches and indexes all open tabs, then runs a keyword search over the text. " +
        "Returns matched text chunks by default; set return_full_site to true to get full page " +
        "markdown grouped by page (better for feeding context into an LLM). " +
        "Craft a specific, targeted query for best results. " +
        "For broad topics you may issue several parallel calls with different focused queries " +
        "(e.g. one for API usage, another for configuration) and merge the results.",
      inputSchema: {
        query: z.string().describe("The search query."),
        top: z.number().optional().describe("Maximum number of results to return. Default: 5."),
        return_full_site: z
          .boolean()
          .optional()
          .describe(
            "When true, results are grouped by page and include the full page markdown. Default: false.",
          ),
      },
    },
    async ({ query, top: topArg, return_full_site }) => {
      const top = topArg ?? 5;
      const returnFullSite = return_full_site ?? false;

      const { results, pageCount } = await executeRag(
        { query, top, fullContent: returnFullSite },
        { buildIndex, fetchSources, getAllTabs },
      );

      if (results.length === 0) {
        const reason =
          pageCount === 0 ? "No open Chrome tabs found." : `No results for "${query}".`;
        return { content: [{ type: "text" as const, text: reason }] };
      }

      if (returnFullSite) {
        const ragResults = results as RagSearchResult[];
        const summary = ragResults
          .map((r) => `${r.title} — ${r.url} (${r.chunks.length} chunks, top score: ${r.topScore})`)
          .join("\n");

        return {
          content: [{ type: "text" as const, text: summary }],
          structuredContent: {
            query,
            resultCount: results.length,
            results,
          } as unknown as Record<string, unknown>,
        };
      }

      const chunkResults = results as SearchResult[];
      const summary = chunkResults
        .map((r) => `${r.title} — ${r.url} (score: ${r.score})`)
        .join("\n");

      return {
        content: [{ type: "text" as const, text: summary }],
        structuredContent: {
          query,
          resultCount: results.length,
          results,
        } as unknown as Record<string, unknown>,
      };
    },
  );
}
