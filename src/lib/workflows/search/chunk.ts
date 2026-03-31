import type { IndexedChunk } from "./types.js";

const DEFAULT_MAX_LEN = 500;

/**
 * Split markdown into chunks on paragraph boundaries (double newlines).
 *
 * - Paragraphs accumulate into a chunk until `maxLen` is exceeded.
 * - A single paragraph longer than `maxLen` becomes its own chunk (never split mid-paragraph).
 * - Every chunk carries the same page-level metadata so BM25 title boosting works.
 */
export function chunkMarkdown(
  markdown: string,
  meta: { title: string; url: string; windowId: string; tabId: string; pageIndex: number },
  maxLen = DEFAULT_MAX_LEN,
): IndexedChunk[] {
  const paragraphs = markdown.split(/\n{2,}/);
  const chunks: IndexedChunk[] = [];

  let buffer = "";
  let chunkIndex = 0;

  function flush(): void {
    const body = buffer.trim();
    if (body.length > 0) {
      chunks.push({
        title: meta.title,
        body,
        url: meta.url,
        windowId: meta.windowId,
        tabId: meta.tabId,
        pageIndex: meta.pageIndex,
        chunkIndex,
      });
      chunkIndex += 1;
    }
    buffer = "";
  }

  for (const paragraph of paragraphs) {
    const trimmed = paragraph.trim();
    if (trimmed.length === 0) continue;

    if (buffer.length > 0 && buffer.length + trimmed.length + 2 > maxLen) {
      flush();
    }

    buffer = buffer.length > 0 ? `${buffer}\n\n${trimmed}` : trimmed;
  }

  flush();
  return chunks;
}
