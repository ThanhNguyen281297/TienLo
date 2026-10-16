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
and checks valid lightness-flight landings. Intentional ground decals and terrain
layers are excluded from actor overlap checks.

North/east/south/west camp coordinates remain unchanged for online compatibility.
Island floor diamonds are walkable; the void between them is not. There are no
bridges to the farming islands. `js/33-lightness-flight.js` creates two-way launch
points: approach a marker, press G or the Khinh công button, and fly to its paired
landing. This utility uses no mana and is available to every class. Normal movement,
auto-combat and new casts are suspended during flight. The flight pauses with
dialogs, cancels safely on respawn/map changes, and saves its grounded departure
position if the player disconnects before landing. Online peers receive bounded
visual height metadata; it grants no server movement or damage exemptions.
`tests/lightness-flight.test.cjs` covers every route in both directions and
`tests/online-game.test.cjs` verifies flight visibility and midair DB saves with
two authenticated accounts. Never place a whole decorated island under another complete
building/tree set; that was the source of the previous duplicate scenery.

## Effects

`js/32-world-vfx.js` paints skill icons from the existing poses, leaves subtle
alternating footsteps after real walking, and uses small sprite contacts on
damage. Dash/teleport do not paint a trail of walking footprints. Effect arrays
are capped, paused with simulation time and cleared on scene changes/respawn.
Spell formations and ultimates use short pose transitions; ultimates also move
along class-specific lift, drop and sweep curves without changing hit
timing, movement speed, mana cost or cooldown. Clouds use two slow parallax layers
behind terrain so they cannot hide combat targets.
