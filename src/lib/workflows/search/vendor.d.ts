declare module "wink-bm25-text-search" {
  interface BM25Engine {
    defineConfig(cfg: { fldWeights: Record<string, number> }): void;
    // biome-ignore lint/suspicious/noExplicitAny: pipeline stages have heterogeneous signatures
    definePrepTasks(tasks: Array<(input: any) => any>, field?: string): number;
    addDoc(doc: Record<string, string>, id: number): void;
    consolidate(): void;
    search(text: string, limit?: number): [number, number][];
    reset(): void;
  }

  function bm25(): BM25Engine;
  export default bm25;
}

declare module "wink-nlp-utils" {
  interface NlpUtils {
    string: {
      lowerCase: (input: string) => string;
      tokenize0: (input: string) => string[];
      [key: string]: (input: unknown) => unknown;
    };
    tokens: {
      removeWords: (input: string[]) => string[];
      stem: (input: string[]) => string[];
      propagateNegations: (input: string[]) => string[];
      [key: string]: (input: unknown) => unknown;
    };
  }

  const nlp: NlpUtils;
  export default nlp;
}
