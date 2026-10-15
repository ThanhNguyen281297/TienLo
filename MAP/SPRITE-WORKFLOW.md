# Tiên Lộ sprite workflow

Open `MAP/sprite-library.html` locally or through the game host. Search and filter
304 PNG sprites/poses: 45 map props, five terrain pieces, 104 monster poses,
96 skill poses, 44 character/equipment sprites, six item icons and four NPCs.

## Sources and exports

- `MAP/sprites`: independent map props, original painted art / selected HD art.
- `MAP/modules`: extracted cliff, bridge arch, balustrade post, waterfall flow and tight cloud.
- `MONTERS/sprites/<species>`: separate attack, idle, move, hurt and death PNGs.
  Metadata retains the source rectangle, original sheet height and 8 px alpha
  padding, so changing to individual images does not change animation anchors.
- `CHARACTER/SkillSprites`: 16 skills, six complete poses per skill. Whole PNGs
  are contained within destination bounds, without source clipping.
- `MAP/sprite-catalog.json` and `js/10b-sprite-catalog.js`: machine-readable paths,
  dimensions, provenance and origin metadata. The library works over file:// too.

Rebuild exports and catalog with `python tools/build_sprite_library.py` (Pillow).
This copies source pixels; it does not upscale or invent detail. Original sheets
are retained. Terrain modules intentionally extract reusable architectural parts.
The 104 monster exports use the existing animation rectangle metadata.
The cliff material source is a separate HD redraw referenced from original rock;
it removes the repeated foliage/buildings that cannot serve as a clean material.

## Layout rules

The central crossing stays clear. Academy buildings occupy the western rear
quarter, archive the eastern rear quarter, and teachers stand in front of these
zones. Portals and challenge boards have their own southern service positions.
Trees and ponds stay near the perimeter. The hub uses spaced service districts.

`worldMap.layoutArt.placements()` exposes image bounds for placement audits.
`tests/world-vfx.test.cjs` rejects overlaps between visible prop/NPC rectangles
and checks complete cardinal traversal. Intentional ground decals and terrain
layers are excluded from actor overlap checks.

North/east/south/west camp coordinates remain unchanged for online compatibility.
The renderer and collision share the same straight bridge centerlines and floor
diamonds. Decks combine a PNG paving pattern, separate rails and arches, bevels
and textured cliffs. Never place a whole decorated island under another complete
building/tree set; that was the source of the previous duplicate scenery.

## Effects

`js/32-world-vfx.js` paints skill icons from the existing poses, leaves subtle
alternating footsteps after real walking, and uses small sprite contacts on
damage. Dash/teleport do not paint a trail of walking footprints. Effect arrays
are capped, paused with simulation time and cleared on scene changes/respawn.
Spell formations and ultimates crossfade complete poses without changing hit
timing, movement speed, mana cost or cooldown. Clouds use two slow parallax layers
behind terrain so they cannot hide combat targets.
