import { describe, expect, test } from "vitest";
import { normalizeScriptConfig } from "../../../../src/data/script";

describe("script permission_check", () => {
  test("normalizes script config with permission_check", () => {
    const config = normalizeScriptConfig({
      alias: "Test Script",
      permission_check: false,
      sequence: [
        {
          action: "light.turn_on",
          permission_check: false,
        },
      ],
    });

    expect(config.permission_check).toBe(false);
    expect(config.sequence).toEqual([
      {
        action: "light.turn_on",
        permission_check: false,
      },
    ]);
  });
});
