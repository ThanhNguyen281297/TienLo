# Map rebuild artwork provenance

Generated with the built-in ImageGen tool, not the API/CLI fallback. Source atlases
are preserved. Project assets: `Map/hd/courtyard-island.png` (transparent PNG) and
`Map/hd/garden-grass.png` (opaque repeating ground material).

## Courtyard island prompt

Create a single production-ready high-resolution transparent PNG game terrain
sprite, using the supplied floating island ONLY as style, camera, and structural
reference. Rebuild it with crisp detailed hand-painted 2.5D Chinese xianxia MMORPG
art. One large EMPTY walkable ivory stone diamond courtyard seen in strict 2:1
isometric projection, blue-gold edge trim, irregular hanging sheer gray-blue rock
cliff and slender beautiful waterfalls underneath, restrained vegetation on outer
cliff only. NO buildings, pillars, fences, trees on the walkable top, central emblem,
people, weapons, UI, shadows outside island, sky, clouds or backdrop. Four open edge
centers for bridge attachment. Surface diamond occupies full sprite width; top tip
at 6% canvas height, left and right corners at 31%, front tip at 56%; hanging cliff
ends at 94%. Keep complete island inside 5% transparent margin on all sides, do NOT
crop any rocks or waterfalls. As sharp and high resolution as possible, minimum
1536 pixels wide. Elegant mineral shading, irregular natural rock silhouette,
readable restrained small stone slabs on empty courtyard; this is modular terrain
to compose maps, not a finished scene. Remove every stray fragment of neighboring
islands from reference. Truly transparent alpha background.

Reference: the empty courtyard island in original `Map/asset3.png`, approximately
source coordinates (694, 0)–(1045, 340). That small reference crop is not used as
runtime terrain; the HD redraw removes neighbouring fragments.

## Garden ground prompt

Production game texture, seamless tileable xianxia garden ground albedo, perfectly
top-down orthographic flat texture with NO perspective. Rich muted jade and olive
green soft short grass, tiny clover leaves, subtle moss and occasional minute pale
petals, softly varied earthy undergrowth, hand-painted elegant 2.5D Chinese fantasy
RPG painterly realism matching ivory stone and blue-gold palaces. Ground material
only, no objects, rocks, plants taller than grass, buildings, paths, lettering,
border, directional light, visible cast shadows, vignette or focal subject. Entire
square filled to all edges, even fine detailed surface at high resolution, all four
edges seamlessly repeat. Subdued values to keep characters readable; restrained
natural color, not neon.
