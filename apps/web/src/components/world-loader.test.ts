import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, test } from "vitest";
import { loadVerifiedWorld } from "./world-loader.js";

const artifactPath = resolve(import.meta.dirname, "../../public/worlds/demo-world.json");

describe("verified world loader", () => {
  test("world loader returns only a schema- and digest-verified response", async () => {
    const serialized = await readFile(artifactPath, "utf8");
    const world = await loadVerifiedWorld(new Response(serialized, { status: 200 }));
    assert.equal(world.metadata.dimensions.tileCount, 1536);
  });

  test("world loader fails closed before a malformed artifact can render", async () => {
    const serialized = await readFile(artifactPath, "utf8");
    const malformed = JSON.parse(serialized);
    malformed.geometry.projection = "equal-area-qsc";
    await assert.rejects(loadVerifiedWorld(new Response(JSON.stringify(malformed))), /compatibility rejection/i);
  });

  test("world loader reports HTTP errors without parsing a body", async () => {
    await assert.rejects(loadVerifiedWorld(new Response("not json", { status: 503 })), /HTTP 503/);
  });
});
