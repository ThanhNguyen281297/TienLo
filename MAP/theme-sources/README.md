# Asset 10–15: nguồn và xử lý alpha

Original `MAP/asset10.png` through `MAP/asset15.png` are user supplied RGB sheets
with opaque black backgrounds. They are retained unchanged. `assetN-alpha.png`
in this folder is a **built-in ImageGen background-extraction edit**, not an
original alpha channel recovered losslessly. No CLI, external API or upscaling
was used. All outputs are 1448 × 1086 RGBA.

Common final prompt for 12–15:

> Edit this complete isometric xianxia game asset sheet. Remove only the black background to transparent alpha. Preserve all existing full islands, architecture, props, plants, waterfalls, magic glows and their arrangement, size and colors. All silhouettes and stairs must be complete and sharp, no cropping or redesign, no new objects or backdrop, no text. Dark structural interior details remain opaque. Entire sheet visible with transparent padding.

For 10 and 11, the prompt additionally specified the source theme, original
camera, soft alpha at glow edges and no grid/checkerboard. Output files:

- 10: `exec-cf7e71ab-6e83-4156-b6cf-dd632693c9c1.png`
- 11: `exec-5f99560c-a0c6-4b95-86f8-1ab9e77a2d23.png`
- 12: `exec-8f9515fa-cf86-4a01-b6f5-c3f069ac448f.png`
- 13: `exec-ba05e056-2a76-4a97-8fe3-f78748067803.png`
- 14: `exec-906bee3e-2610-4577-8ff8-4e9c642ff25b.png`
- 15: `exec-de2bdd1a-a3f3-437e-9717-5af3e0dbfbbf.png`

The source copies are now in this project; runtime never refers to Codex paths.
`python tools/extract_theme_atlases.py` splits the alpha versions into native
PNG components with 8px padding, preserving every visible processed pixel once.
Touching art stays connected. Some compounds span adjacent architecture; they
are kept whole, not labelled as recovered individual buildings.

There are 338 exports under `MAP/theme-sprites`, manifest and offline gallery in
the same folder. `tests/test_theme_assets.py` reconstructs the alpha sources and
compares pixel/coverage equality. This test compares against the processed
sources, **not** the original RGB sheets.

The renderer loads only reviewed sprite IDs needed in the current viewport.
Large compounds are distant scenery behind terrain, never walkable floor
collages. Small reviewed pillars/plants reuse the existing prop zones. Network
map IDs, terrain bounds, mob spawns and teleport coordinates are unchanged.
The nine original atlases and their extraction pipeline remain independent.
