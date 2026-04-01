import type { IndexedChunk } from "./types.js";

/** ~1024 tokens at ~4 chars/token. */
const DEFAULT_MAX_CHARS = 4096;

/** 15% overlap between adjacent chunks. */
const DEFAULT_OVERLAP = 0.15;

/**
 * Split markdown into chunks on paragraph boundaries (double newlines).
 *
 * - Paragraphs accumulate into a chunk until `maxLen` is exceeded.
 * - A single paragraph longer than `maxLen` becomes its own chunk (never split mid-paragraph).
 * - Trailing paragraphs from the previous chunk are carried into the next chunk
 *   so that ~`overlap` fraction of content is shared at boundaries.
 * - Every chunk carries the same page-level metadata so BM25 title boosting works.
 */
export function chunkMarkdown(
  markdown: string,
  meta: { title: string; url: string; windowId: string; tabId: string; pageIndex: number },
  maxLen = DEFAULT_MAX_CHARS,
  overlap = DEFAULT_OVERLAP,
): IndexedChunk[] {
  const paragraphs = markdown.split(/\n{2,}/);
  const chunks: IndexedChunk[] = [];
  const overlapLen = Math.floor(maxLen * overlap);

  let currentParas: string[] = [];
  let currentLen = 0;
  let chunkIndex = 0;

  function flush(): void {
    const body = currentParas.join("\n\n").trim();
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
  }

  function trailingOverlap(): { paras: string[]; len: number } {
    const trailing: string[] = [];
    let len = 0;
    for (let i = currentParas.length - 1; i >= 0; i--) {
      const addLen = currentParas[i].length + (trailing.length > 0 ? 2 : 0);
      if (len + addLen > overlapLen) break;
      trailing.unshift(currentParas[i]);
      len += addLen;
    }
    return { paras: trailing, len };
  }

  for (const paragraph of paragraphs) {
    const trimmed = paragraph.trim();
    if (trimmed.length === 0) continue;

    const addLen = trimmed.length + (currentParas.length > 0 ? 2 : 0);

    if (currentParas.length > 0 && currentLen + addLen > maxLen) {
      const { paras, len } = trailingOverlap();
      flush();

      // Use overlap only if the incoming paragraph fits with it;
      // otherwise start fresh to avoid flushing overlap-only chunks.
      const overlapAddLen = trimmed.length + (paras.length > 0 ? 2 : 0);
      if (paras.length > 0 && len + overlapAddLen <= maxLen) {
        currentParas = paras;
        currentLen = len;
      } else {
        currentParas = [];
        currentLen = 0;
      }
    }

    currentLen += trimmed.length + (currentParas.length > 0 ? 2 : 0);
    currentParas.push(trimmed);
  }

  flush();
  return chunks;
}
