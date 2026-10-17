# Skill sprites v2 — ImageGen

16 skills × 6 complete poses = 96 individual RGBA PNG files.

Generated with the built-in ImageGen tool, using each original skill image as a visual reference. Original images are retained unchanged. `*-sheet.png` files are generation masters, not runtime atlases. Each skill folder contains `01.png` through `06.png`.

The export script copies every source pixel exactly once into separate PNGs with 32px transparent padding; it does not resize, sharpen, erase backgrounds or trim blades. The separation follows low-alpha gutters near the requested layout. `manifest.json` records every source box, output size and visible bounds. Runtime renders whole images with aspect ratio preserved, never source rectangles.

Native generated masters: 1536 × 1024. Individual PNG dimensions vary with the generated layout, approximately 500–650px including padding. No claim of recovered original pixels or 4K detail.

## Prompt set

Common generation instructions: Redraw the referenced xianxia spell as six complete isolated poses in a strict 3 × 2 layout on a 1536 × 1024 transparent PNG. Keep every blade, halo, trail and particle inside its own cell with generous transparent margins. No characters, scene, text, grid lines, background color or broad ambient haze. Preserve class palette and ornate style, use crisp silhouettes with restrained translucent glow.

Layout repair instructions for Vạn Kiếm Quy Tông, Hoành Tảo Thiên Quân and Phong Linh Phiến: preserve all six subjects, reconstruct clipped tips, make each pose smaller inside its cell, remove ambient haze and separate the poses by empty alpha space.


### Kiem

- `batquaikiemtran`: upright sword → sigil → three swords → five swords → full Bagua formation → fading ring.
- `kiemanhbo`: thrust streak → dash trail → wind streak → curling afterimage → rift outline → sparks.
- `phikiemquyet`: single sword → three swords launch → flight → impact → return arc → sparks.
- `vankiemquytong`: gathering swords → convergence → greatsword → plunge → sword rain impact → shards.

### Liem

- `minhnguyetgiangthe`: cast halo → full moon → moon beam → orbiting blades → eclipse → fading wave.
- `nguyetanhbo`: cast sigil → narrow rift outline → expanded outline → fading outline → crescent wisp → motes.
- `nguyetluantran`: sigil → ring → lunar circle → three orbiting blades → active formation → fading ring.
- `tamnguyettram`: cast → crescent blade → triple launch → sweeping arc → return → lunar impact.

### Quat

- `philinhchu`: upright talisman → flying talisman → triple talismans → impact → return → sparks.
- `phonglinhphien`: open fan → wind crescent → broad wind wave → spiral → petals → ribbons.
- `thiencotran`: yin-yang sigil → ellipse → four talismans → six pillars → active formation → fading circle.
- `vanphuphongan`: spiral → gathering talismans → sealing circle → upright mandala → seal detonation → motes.

### Thuong

- `cuuthienloitran`: sigil → formation disk → three spear tips → five hovering spears → full formation → fading disk.
- `hoanhtaothienquan`: narrow sweep → medium crescent → broad sweep → circular slash → impact → particles.
- `loilonggiangthe`: spiral sigil → spear beam → coiled dragon → descending dragon → dragon impact → dragon wisps.
- `loithuongdotkich`: upright spear → horizontal spear → thrust → impact → afterimage → sparks.

## Validation

`python tests/test_skill_sprite_assets.py` verifies all 96 files, lossless pixel preservation and transparent safety borders. `node tests/skill-sprites.test.cjs` loads all poses, checks whole-PNG rendering and creates four gallery screenshots. Existing four-class, sword and moon combat tests validate integration.
