import { describe, expect, test } from "bun:test";

import { parseCliArgs } from "../../src/commands/root.js";

describe("parseCliArgs", () => {
  test("parses the command and global flags", () => {
    const parsed = parseCliArgs(["--json", "doctor", "--verbose"]);

    expect(parsed.command).toBe("doctor");
    expect(parsed.flags.json).toBe(true);
    expect(parsed.flags.verbose).toBe(true);
  });

  test("treats help as a help request", () => {
    const parsed = parseCliArgs(["help"]);

    expect(parsed.command).toBeUndefined();
    expect(parsed.flags.help).toBe(true);
  });

  test("parses nested list command arguments", () => {
    const parsed = parseCliArgs(["list", "tabs", "123", "--json"]);

    expect(parsed.command).toBe("list");
    expect(parsed.commandArgs).toEqual(["tabs", "123"]);
    expect(parsed.flags.json).toBe(true);
  });

  test("parses nested save command arguments", () => {
    const parsed = parseCliArgs(["save", "123", "--json"]);

    expect(parsed.command).toBe("save");
    expect(parsed.commandArgs).toEqual(["123"]);
    expect(parsed.flags.json).toBe(true);
  });

  test("normalizes the legacy dump alias to save", () => {
    const parsed = parseCliArgs(["dump", "session", "123", "--json"]);

    expect(parsed.command).toBe("save");
    expect(parsed.commandArgs).toEqual(["session", "123"]);
    expect(parsed.flags.json).toBe(true);
  });
});
