type PromptFunction = (message?: string) => string | null;

interface PromptGlobal {
  prompt?: PromptFunction;
}

export function isInteractiveTerminal(): boolean {
  return Boolean(process.stdin.isTTY && process.stdout.isTTY);
}

export function getPrompt(): PromptFunction {
  const promptFunction = (globalThis as typeof globalThis & PromptGlobal).prompt;

  if (!promptFunction) {
    throw new Error("Interactive prompt is not available in this runtime.");
  }

  return promptFunction;
}
