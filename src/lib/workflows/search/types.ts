// ---------------------------------------------------------------------------
// Search pipeline types — shared across preprocess, chunk, and index layers.
// ---------------------------------------------------------------------------

/** Raw page data fed into the search pipeline. */
export interface PageInput {
  url: string;
  windowId: string;
  tabId: string;
  title: string;
  html: string;
}

/** A single chunk produced by the chunker, ready for BM25 indexing. */
export interface IndexedChunk {
  /** Page title (same for every chunk from a given page). */
  title: string;
  /** Chunk body text (markdown). */
  body: string;
  url: string;
  windowId: string;
  tabId: string;
  /** 0-based index of the source page within the input array. */
  pageIndex: number;
  /** 0-based index of this chunk within its page. */
  chunkIndex: number;
}

/** A ranked search result returned to the caller. */
export interface SearchResult {
  title: string;
  body: string;
  url: string;
  windowId: string;
  tabId: string;
  pageIndex: number;
  chunkIndex: number;
  score: number;
}
