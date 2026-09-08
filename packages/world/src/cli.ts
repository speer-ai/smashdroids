#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { canonicalJson, generateWorld, serializeWorld, summarizeWorld } from "./index.js";

function argument(name: string, fallback: string): string {
  const index = process.argv.indexOf(name);
  return index >= 0 ? (process.argv[index + 1] ?? fallback) : fallback;
}

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const seed = argument("--seed", "smash-droids-public-demo-v1");
const resolution = Number(argument("--resolution", "16"));
const output = resolve(repositoryRoot, argument("--output", "apps/web/public/worlds/demo-world.json"));
const summaryOutput = resolve(repositoryRoot, argument("--summary", "apps/web/public/worlds/demo-world.summary.json"));
const world = generateWorld({ resolution, seed });
const serialized = serializeWorld(world);
const summary = summarizeWorld(world);

await mkdir(dirname(output), { recursive: true });
await mkdir(dirname(summaryOutput), { recursive: true });
await writeFile(output, serialized, "utf8");
await writeFile(summaryOutput, `${canonicalJson(summary)}\n`, "utf8");
console.log(JSON.stringify({ output, summaryOutput, bytes: Buffer.byteLength(serialized), ...summary }, null, 2));
