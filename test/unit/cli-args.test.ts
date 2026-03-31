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
});
