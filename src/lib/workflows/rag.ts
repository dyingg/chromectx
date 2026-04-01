import type { fetchSources } from "../http.js";
import type { Logger } from "../logger.js";
import type { buildIndex, RagSearchResult, SearchResult } from "./search/index.js";

export type { RagSearchResult, SearchResult };

type GetAllTabs = () => Promise<{ id: string; windowId: string; url: string; title: string }[]>;

export interface RagDependencies {
  buildIndex: typeof buildIndex;
  fetchSources: typeof fetchSources;
  getAllTabs: GetAllTabs;
}

export interface RagParams {
  query: string;
  top?: number;
  fullContent?: boolean;
  logger?: Logger;
}

export interface RagResult<T> {
  results: T[];
  pageCount: number;
  chunkCount: number;
}

/**
 * Shared RAG pipeline: fetch all tabs → build BM25 index → search.
 *
 * When `fullContent` is true (default), returns page-grouped results with
 * full markdown via `searchWithPages`. Otherwise returns chunk-level results.
 */
export async function executeRag(
  params: RagParams,
  deps: RagDependencies,
): Promise<RagResult<RagSearchResult | SearchResult>> {
  const { query, top = 5, fullContent = true, logger } = params;

  const tabs = await deps.getAllTabs();

  if (tabs.length === 0) {
    return { results: [], pageCount: 0, chunkCount: 0 };
  }

  const pages = await deps.fetchSources(
    tabs.map((tab) => ({
      url: tab.url,
      windowId: tab.windowId,
      tabId: tab.id,
      title: tab.title,
    })),
    { logger },
  );

  if (pages.length === 0) {
    return { results: [], pageCount: 0, chunkCount: 0 };
  }

  const index = deps.buildIndex(pages, { retainPageContent: fullContent });

  if (fullContent) {
    return {
      results: index.searchWithPages(query, top),
      pageCount: pages.length,
      chunkCount: index.size,
    };
  }

  const rawResults = index.search(query, index.size);
  const seen = new Set<string>();
  const results = rawResults
    .filter((r) => {
      if (seen.has(r.url)) return false;
      seen.add(r.url);
      return true;
    })
    .slice(0, top);

  return { results, pageCount: pages.length, chunkCount: index.size };
}
