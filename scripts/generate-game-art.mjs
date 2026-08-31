#!/usr/bin/env node
import { createHash } from "node:crypto";
import { readFile, writeFile, mkdir, rename, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repo = resolve(scriptDir, "..");
const planPath = resolve(repo, "art/prompts/spherical-world-v1.json");
const manifestPath = resolve(repo, "apps/web/public/assets/factions/manifest.json");
const credentialPath = resolve(homedir(), ".hermes/credentials/openai-smashdroids.env");
const dryRun = process.argv.includes("--dry-run");
const force = process.argv.includes("--force");

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const plan = JSON.parse(await readFile(planPath, "utf8"));

function assembleRequests() {
  const requests = plan.clans.flatMap((clan) => [
    {
      assetId: `sd-${clan.id}-key-art-v1`,
      assetType: "faction_key_art",
      clan,
      prompt: [plan.masterPrompt, clan.variationPrompt, plan.outputModes.keyArt].join("\n\n"),
      background: "opaque",
      output: `apps/web/public/assets/factions/${clan.id}-key-art-gpt.png`,
    },
    {
      assetId: `sd-${clan.id}-troop-sheet-v1`,
      assetType: "troop_token_sheet",
      clan,
      prompt: [plan.masterPrompt, clan.variationPrompt, plan.outputModes.troopSheet].join("\n\n"),
      background: "transparent",
      output: `apps/web/public/assets/factions/${clan.id}-troop-sheet-gpt.png`,
    },
  ]);
  requests.push({
    assetId: "sd-spherical-terrain-atlas-v1",
    assetType: "terrain_atlas",
    clan: null,
    prompt: plan.terrainAtlasPrompt,
    background: "opaque",
    output: "apps/web/public/assets/terrain/terrain-atlas-gpt.png",
  });
  return requests;
}

const requests = assembleRequests();

if (dryRun) {
  console.log(JSON.stringify({
    campaignId: plan.campaignId,
    model: plan.model,
    plannedRequests: requests.length,
    requests: requests.map((request) => ({
      assetId: request.assetId,
      assetType: request.assetType,
      clan: request.clan?.name ?? null,
      background: request.background,
      promptSha256: sha256(request.prompt),
      output: request.output,
    })),
  }));
  process.exit(0);
}

async function loadApiKey() {
  if (process.env.OPENAI_API_KEY) return process.env.OPENAI_API_KEY;
  const source = await readFile(credentialPath, "utf8");
  const line = source.split(/\r?\n/).find((entry) => entry.startsWith("OPENAI_API_KEY="));
  if (!line) throw new Error(`OPENAI_API_KEY missing from ${credentialPath}`);
  return line.slice("OPENAI_API_KEY=".length).trim();
}

async function generateImage(apiKey, request) {
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch("https://api.openai.com/v1/images/generations", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: plan.model,
          prompt: request.prompt,
          size: plan.size,
          quality: plan.quality,
          output_format: "png",
          background: request.background,
          moderation: "auto",
          n: 1,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(`OpenAI Images API ${response.status}: ${payload?.error?.message ?? "unknown error"}`);
      const encoded = payload?.data?.[0]?.b64_json;
      if (!encoded) throw new Error("OpenAI Images API returned no image data");
      return {
        bytes: Buffer.from(encoded, "base64"),
        requestId: response.headers.get("x-request-id"),
        revisedPrompt: payload.data[0].revised_prompt ?? null,
        attempt,
      };
    } catch (error) {
      lastError = error;
      if (attempt < 3) await new Promise((resolveDelay) => setTimeout(resolveDelay, attempt * 1500));
    }
  }
  throw lastError;
}

function pngMetadata(bytes) {
  const signature = bytes.subarray(0, 8).toString("hex");
  if (signature !== "89504e470d0a1a0a") throw new Error("Generated output is not a PNG");
  const colorType = bytes[25];
  return {
    width: bytes.readUInt32BE(16),
    height: bytes.readUInt32BE(20),
    hasAlpha: colorType === 4 || colorType === 6,
  };
}

async function writeJsonAtomic(path, value) {
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.tmp`;
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o644 });
  await rename(temporary, path);
}

const apiKey = await loadApiKey();
const existingManifest = existsSync(manifestPath) ? JSON.parse(await readFile(manifestPath, "utf8")) : null;
const entries = existingManifest?.campaignId === plan.campaignId ? [...existingManifest.assets] : [];

for (const [index, request] of requests.entries()) {
  const absoluteOutput = resolve(repo, request.output);
  const existing = entries.find((entry) => entry.assetId === request.assetId);
  if (!force && existing && existsSync(absoluteOutput)) {
    process.stderr.write(`[${index + 1}/${requests.length}] ${request.assetId} already present\n`);
    continue;
  }
  process.stderr.write(`[${index + 1}/${requests.length}] generating ${request.assetId}\n`);
  const generated = await generateImage(apiKey, request);
  const metadata = pngMetadata(generated.bytes);
  await mkdir(dirname(absoluteOutput), { recursive: true });
  await writeFile(absoluteOutput, generated.bytes, { mode: 0o644 });
  const fileStats = await stat(absoluteOutput);
  const entry = {
    schemaVersion: "smash-droids.asset-provenance.v1",
    assetId: request.assetId,
    campaignId: plan.campaignId,
    assetType: request.assetType,
    clan: request.clan ? {
      id: request.clan.id,
      canonicalName: request.clan.name,
      subtitle: request.clan.subtitle,
      palette: request.clan.palette,
      emblem: request.clan.emblem,
    } : null,
    provider: plan.provider,
    endpoint: plan.endpoint,
    model: plan.model,
    request: {
      size: plan.size,
      quality: plan.quality,
      outputFormat: "png",
      background: request.background,
      moderation: "auto",
      n: 1,
    },
    prompt: {
      sha256: sha256(request.prompt),
      exact: request.prompt,
      revised: generated.revisedPrompt,
    },
    generation: {
      createdAt: new Date().toISOString(),
      providerRequestId: generated.requestId,
      attempt: generated.attempt,
    },
    output: {
      file: request.output.replace("apps/web/public/", ""),
      bytes: fileStats.size,
      mimeType: "image/png",
      sha256: sha256(generated.bytes),
      width: metadata.width,
      height: metadata.height,
      hasAlpha: metadata.hasAlpha,
    },
    review: {
      technicalStatus: "pending",
      culturalReviewStatus: "pending",
      prohibitedSymbolReview: "pending",
      notes: "",
    },
  };
  const previousIndex = entries.findIndex((candidate) => candidate.assetId === request.assetId);
  if (previousIndex >= 0) entries[previousIndex] = entry;
  else entries.push(entry);
  await writeJsonAtomic(manifestPath, {
    schemaVersion: "smash-droids.asset-manifest.v1",
    campaignId: plan.campaignId,
    generator: "OpenAI GPT Image API",
    model: plan.model,
    sourcePlan: "art/prompts/spherical-world-v1.json",
    assets: entries,
  });
}

console.log(JSON.stringify({ campaignId: plan.campaignId, generatedAssets: entries.length, manifest: manifestPath }));
