# Tiên Lộ sprite workflow

## Theme atlases 10–15

New RGB source sheets are retained unchanged. Built-in ImageGen alpha edits live
in `MAP/theme-sources`; prompts/provenance are documented there. Native component
exports (338) live in `MAP/theme-sprites`, with an independent manifest and local
gallery `MAP/theme-sprites/index.html`. Rebuild with
`python tools/extract_theme_atlases.py`; verify with
`python tests/test_theme_assets.py` (Pillow/numpy/scipy for export, Pillow/numpy
for reconstruction). Original nine-atlas tests are unchanged.

`js/20d-map-themes.js` maps blue crystal to thunder, jade antiquity to sword/hub,
lotus blossom to moon, green ancient forest to mystic/valley, fire temple to arena,
and magma to world boss. The solo rift uses jade ruins. Large compounds are
background scenery; reviewed small props share the existing depth/bounds code.
No new bridges, flight, static image floors, mob spawns or network rooms are added.
The valley pond that overlapped the home portal has been removed.

## Nine original map atlases

Open `MAP/atlas-sprites/index.html` to browse all nine atlases as **534 native PNG
props / connected scenic compounds**, plus four reviewed terrain cutouts.
`python tools/extract_map_atlases.py` requires Pillow, numpy and scipy. It keeps
all visible source pixels exactly once, with independent alpha masks and eight
pixels of transparent padding. `tests/test_atlas_extraction.py` reconstructs all
nine originals and compares their visible RGBA pixels exactly.

Some original buildings overlap/touch their neighbours. Those remain connected
compounds, explicitly labelled in the manifest, rather than exporting a roof or
staircase cut by a rectangular grid. These exports do not recover hidden artwork
or increase source resolution. Native source sheets remain unchanged.

`MAP/hd/courtyard-island.png` is a separate 1536×1024 ImageGen terrain redraw,
with empty floor and cliff/waterfall edges. Its measured floor corners are aligned
with collision diamonds. Individual buildings remain depth-sorted actors.
See `MAP/hd/map-rebuild-prompts.md` for generation provenance.

Walkable floors use `js/19b-stone-paving.js`: individual chamfered stone slabs
drawn with Canvas paths, staggered joints and deterministic stone colors. No floor
image, repeated image pattern or grass texture is rendered. The HD island is
clipped outside the walkable diamond and supplies cliff scenery only. Cached slab
geometry and viewport culling keep the paving stable during camera movement.
Paving stops before all four corners. Original island artwork remains exposed;
there are no added bare-stone caps or wooden bridges at those corners. The floor
clip and walkable boundary are chamfered octagons, while the original cliff
silhouette remains intact. Walls close the former bridge exits along that boundary.
Fine mineral marks, occasional hairline wear, beveled edges and a restrained
daylight wash give each slab surface detail without a composite floor image.

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
Map entries now retain their source alpha bounds. The renderer anchors the visible
bottom edge to the ground and still draws the complete PNG, so transparent padding
cannot lift rocks, trees or buildings. Placement audits use these same visible
bounds. There are no synthetic oval shadows, enlarged black silhouettes or contact
ellipses under props; painted source shading is used directly. Hub buildings use
their own foundations, without a second raised courtyard underneath.
`tests/world-vfx.test.cjs` rejects overlaps between visible prop/NPC rectangles
and checks continuous walkable bridge routes. Intentional ground decals and terrain
layers are excluded from actor overlap checks.

North/east/south/west camp coordinates remain unchanged for online compatibility.
The islands are separate. Corner bridges, timber decks, ropes, bridge posts,
extra stone caps and bridge minimap lines have been removed. Khinh công remains
removed. `js/20b-map-structures.js` now loads only the wall panel/pier PNGs.
Wall panels share one upright pier per joint, and follow the chamfered ground
boundary. Collision blocks the removed tips and the void between islands.

`js/20c-farm-portals.js` places paired formations inside the perimeter at each
direction. Approach and press E (or the mobile interact button) to travel; the
destination formation returns to the central courtyard. A short cooldown prevents
an accidental immediate return. There are still no bridges or flight paths.

Farm islands use radii 240 × 125, compared with the original 156 × 80 (about 2.4×
the area). Each of the four camps has 12 monsters, 48 total per sect/realm room.
Valley islands use 210 × 110 and 12 monsters each, 36 total. Home slots, geometry
and server teleport validation share `MAP/farm-layout.json`; regenerate the
file:// browser copy with `python tools/build_farm_layout.py` after editing it.
The server accepts long teleports only between matching formation positions,
and keeps monsters within their enlarged island bounds.

`tests/map-structures.test.cjs` verifies closed walls, blocked former exits, mobile
rendering, no loaded bridge artwork and no flight UI. Native bridge cutouts remain
in the offline asset library for reuse, but are not loaded or rendered in game.

## Effects

`js/32-world-vfx.js` paints skill icons from the existing poses, leaves subtle
alternating footsteps after real walking, and uses small sprite contacts on
damage. Dash/teleport do not paint a trail of walking footprints. Effect arrays
are capped, paused with simulation time and cleared on scene changes/respawn.
Spell formations and ultimates use short pose transitions; ultimates also move
along class-specific lift, drop and sweep curves without changing hit
timing, movement speed, mana cost or cooldown. Clouds use two slow parallax layers
behind terrain so they cannot hide combat targets.
