import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, test } from "vitest";

const pageSource = readFileSync(resolve(import.meta.dirname, "../app/page.tsx"), "utf8");

describe("landing page turn copy", () => {
  test("landing page never advertises simultaneous turns", () => {
    assert.doesNotMatch(pageSource, /simultaneous turns/i);
  });

  test("landing page commits an ordered command set before the baseline response", () => {
    assert.match(pageSource, /ordered set resolves before the baseline response/i);
  });
});
