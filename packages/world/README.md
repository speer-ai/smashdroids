# `@smashdroids/world`

Pure deterministic TypeScript generator for the `cs1` spherical-world artifact.

## Generate the public demo

```sh
npm run generate:world
```

The command writes canonical, key-sorted JSON to `apps/web/public/worlds/demo-world.json` and a compact summary beside it. The artifact digest is SHA-256 over the canonical artifact payload excluding the `digest` field.

## Geometry and topology

- Six `resolution × resolution` logical quads; resolution 16 is exactly 1,536 tiles.
- Stable IDs: `cs1/0/<face>/<row>/<col>`.
- Projection is honestly identified as `normalized-cube-sphere-v1`; it is **not equal-area QSC**. The generated metadata reports measured minimum/maximum spherical cell area and their ratio.
- Each logical quad is displayed as one inset eight-vertex plate. The plate is visual geometry only.
- Rules adjacency is seam-safe, symmetric, globally connected, and has exactly four edge neighbors per quad. Diagonal movement is not encoded.
- At the eight inherited cube corners, mesh vertices have valence three rather than the ordinary valence four. This is the explicit spherical topology exception; it does not change tile degree.
