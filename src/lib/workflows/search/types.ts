// ---------------------------------------------------------------------------
// Search pipeline types — shared across preprocess, chunk, and index layers.
//
// The pipeline accepts TabSource (from src/browser/types.ts) as input.
// No separate PageInput type needed — TabSource has the same shape.
// ---------------------------------------------------------------------------

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

/** A matched chunk within a RagSearchResult, carrying its chunk-level score. */
export interface RagChunkMatch {
  body: string;
  chunkIndex: number;
  score: number;
}

/** A page-level search result for RAG, grouping all matched chunks from one page. */
export interface RagSearchResult {
  title: string;
  url: string;
  windowId: string;
  tabId: string;
  pageIndex: number;
  /** Full preprocessed markdown of the page. Present when retainPageContent was enabled. */
  fullContent: string;
  /** Individual chunk matches from this page, ordered by descending score. */
  chunks: RagChunkMatch[];
  /** Highest chunk score for this page (used for page-level ranking). */
  topScore: number;
}
