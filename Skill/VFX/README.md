# Layered spirit VFX

The current illustrated subject layer is [class-spirit-actors-v2.png](class-spirit-actors-v2.png), generated with built-in ImageGen. [Its prompts and renderer notes](class-spirit-actors-v2.prompt.md) describe the sword array, crescent lotus, dragon and phoenix. This layer and the existing class formation paintings now sit above the subtle components described below. The complete subjects bend continuously; they do not dissolve between six pose paintings.

`spirit-components-v1.png` is an RGBA atlas generated with the built-in ImageGen tool, with a second pass to restore transparent padding. Existing Kiem/Liem/Thuong/Quat skill illustrations supplied the visual direction; existing weapon PNGs supply the moving weapon actors.

The atlas is a 4-column, 2-row grid. In row order: crescent, streak, wisp, star, seal, petal, impact, shockwave. `js/11c-spell-actors.js` separates the complete cells into cached canvas sprites, tints them per class, and animates each actor in simulation time. No frame sequence of whole spell illustrations is used for in-world ultimates, fields or projectiles. Existing six-pose assets supply icons/gallery and the selected formation paintings used by the v2 layer. The existing outline-only teleport remains unchanged.

## Generation prompt

Production 2D xianxia game VFX component sprite atlas, actual transparent PNG background. One evenly divided 4 columns by 2 rows atlas: eight separate complete isolated sprites, centered in equal cells, generous transparent margins, no overlap, no labels, no borders, no scene, characters or weapons. Elegant luminous spirit magic of Chinese cultivation RPG, fine flowing silky energy, sharp readable bright core, delicate wispy transparent edges. Monochrome pearlescent white/silver with neutral gray translucency, tinted cyan, jade, purple or gold at runtime. Top row: one tapered crescent slash opening right; narrow horizontal comet streak pointing right; airy curling smoke wisp; delicate four-point star. Bottom row: thin top-down hollow runic seal; curved spirit feather/petal; irregular twelve-ray impact burst without debris; thin hollow smoky top-down shockwave ring. Reusable animation parts, not finished spells or sequential frames. Keep complete fading tips inside cells. Actual transparency, no baked background.

## Padding correction prompt

Preserve the same eight neutral-white components in the same regular 4-by-2 grid. Reduce each component to 65% around the center of its own equal cell, reconstruct missing tips, add truly transparent margins around every component, between cells and at canvas edges. Every complete sprite including faint glow must fit within the central 65% of its cell. No artwork may touch another sprite, cell boundary or canvas edge. Keep sharp silky white luminous cores and ethereal edges. No backdrop, grid lines, labels or new objects. The engine divides exactly at 25%, 50%, 75% in X and 50% in Y without cutting artwork.

## Validation

`tests/spell-actors.test.cjs` checks 180 distinct animation samples, repeatable simulation, visible textures and absence of whole-spell image dissolves. It exports charge/impact proofs and `tests/artifacts/layered-skills-preview.webm` for motion review.
