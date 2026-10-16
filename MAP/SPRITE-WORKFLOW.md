# Tiên Lộ sprite workflow

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
Island floor diamonds are connected by continuous timber bridges. Khinh công and
its button/key bindings are removed. `js/20b-map-structures.js` assembles the
native wood deck/post from asset 5 and stone wall from asset 4. The complete PNG
cutouts have reviewed alpha silhouettes, excluding neighbouring props and colored
background pixels. Rebuild with `python tools/build_map_structures.py`; provenance
and silhouette coordinates are in `MAP/structures/manifest.json`.
The bridge now assembles individual 6.5-unit boards from `wood-plank.png` instead
of stretching a complete bridge section. The deck is 42 units wide with a vertical
underside, nails, ropes and upright posts. Bridge endpoints are exactly on the
diamond boundary. Deck ends are trimmed around the paving with an even-odd mask,
preserving the original pointed corners with no square thresholds on top. Rail
posts terminate on the same diamond edges. Visible boards are culled to the camera. Walls mirror their original
orientation on opposing slopes, and have narrow masonry footings and directional
contact shading; there are no oval shadows under buildings or architecture.
Wall panels and piers are separate native PNGs. Adjacent panels share one upright
pier, including closed corners; bridge entrances are cut from the boundary before
subdivision instead of removing whole prefabricated wall sections.

Stone walls follow the island perimeter with open entrances aligned to bridges.
The hub has a stone enclosure with four open entrances. Wall actors are depth
sorted, and their ground footprints block movement. Bridge collision uses the
same endpoints and width as the visible deck; the remaining void is unwalkable.
`tests/map-structures.test.cjs` verifies both directions, wall collision, ordinary
keyboard movement, mobile rendering and removal of the flight UI.
`tests/online-game.test.cjs` verifies bridge walking and grounded DB saves between
two authenticated accounts. Never stack a second island underneath a complete
building/tree set.

## Effects

`js/32-world-vfx.js` paints skill icons from the existing poses, leaves subtle
alternating footsteps after real walking, and uses small sprite contacts on
damage. Dash/teleport do not paint a trail of walking footprints. Effect arrays
are capped, paused with simulation time and cleared on scene changes/respawn.
Spell formations and ultimates use short pose transitions; ultimates also move
along class-specific lift, drop and sweep curves without changing hit
timing, movement speed, mana cost or cooldown. Clouds use two slow parallax layers
behind terrain so they cannot hide combat targets.
