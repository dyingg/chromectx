export interface Output {
  json(value: unknown): void;
  stderr(message: string): void;
  stdout(message: string): void;
}

function normalizeMessage(message: string): string {
  return message.endsWith("\n") ? message : `${message}\n`;
}

export function createOutput(): Output {
  return {
    json(value) {
      process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
    },
    stderr(message) {
      process.stderr.write(normalizeMessage(message));
    },
    stdout(message) {
      process.stdout.write(normalizeMessage(message));
    },
  };
}
