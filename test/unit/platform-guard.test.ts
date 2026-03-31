import { describe, expect, test } from "bun:test";

import { UnsupportedPlatformError } from "../../src/lib/errors.js";
import { assertMacOS, getRuntimePlatform } from "../../src/platform/guard.js";

describe("platform guard", () => {
  test("uses the test platform override when present", () => {
    const runtime = getRuntimePlatform({
      env: {
        CHROME_SPILL_TEST_PLATFORM: "linux",
      },
    });

    expect(runtime.platform).toBe("linux");
    expect(runtime.release).toBe("test-release");
  });

  test("throws a friendly error on unsupported platforms", () => {
    expect(() =>
      assertMacOS({
        env: {
          CHROME_SPILL_TEST_PLATFORM: "linux",
        },
      }),
    ).toThrow(UnsupportedPlatformError);
  });
});
