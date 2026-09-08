import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const pageSource = readFileSync(resolve("src/app/page.tsx"), "utf8");

test("landing page describes sequential player turns", () => {
  assert.match(pageSource, /sequential player turns/i);
  assert.doesNotMatch(pageSource, /simultaneous turns/i);
});
