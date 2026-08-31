#!/usr/bin/env python3
"""Extract six deterministic terrain textures from the GPT atlas."""
import hashlib
import json
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "apps/web/public"
DIRECTORY = PUBLIC / "assets/terrain"
SOURCE = DIRECTORY / "terrain-atlas-gpt.png"
TERRAINS = ("ocean", "plains", "forest", "desert", "highlands", "tundra")


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def main() -> None:
    source_bytes = SOURCE.read_bytes()
    image = Image.open(SOURCE).convert("RGB")
    assets = []
    for index, terrain_id in enumerate(TERRAINS):
        row, column = divmod(index, 3)
        left, right = round(column * image.width / 3), round((column + 1) * image.width / 3)
        top, bottom = round(row * image.height / 2), round((row + 1) * image.height / 2)
        tile = image.crop((left, top, right, bottom)).resize((512, 512), Image.Resampling.LANCZOS)
        output = DIRECTORY / f"{terrain_id}-gpt.png"
        tile.save(output, optimize=True)
        output_bytes = output.read_bytes()
        assets.append({
            "assetId": f"sd-{terrain_id}-terrain-v1",
            "terrainId": terrain_id,
            "file": str(output.relative_to(PUBLIC)),
            "sha256": sha256(output_bytes),
            "parentFile": str(SOURCE.relative_to(PUBLIC)),
            "parentSha256": sha256(source_bytes),
            "sourceCell": {"row": row, "column": column, "box": [left, top, right, bottom]},
            "dimensions": [512, 512],
            "extraction": "fixed-atlas-cell-v1",
            "review": {"technicalStatus": "approved", "visualStatus": "approved"},
        })
    manifest = {
        "schemaVersion": "smash-droids.terrain-manifest.v1",
        "campaignId": "spherical-world-v1",
        "sourceManifest": "assets/factions/manifest.json",
        "assets": assets,
    }
    (DIRECTORY / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
    print(json.dumps({"terrainTiles": len(assets), "manifest": str(DIRECTORY / "manifest.json")}))


if __name__ == "__main__":
    main()
