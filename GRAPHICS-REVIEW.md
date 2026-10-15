# Graphics review — 2026-10-15

## Findings and changes

- The old 701 px island filled over 1,700 CSS pixels at 2.4× zoom. Rebuilt it
  as a 1,445 px transparent painted PNG and reduced world zoom to 1.8×. Camera,
  pointer targeting and terrain coordinates still share the same transform.
- Restored selected detailed PNG redraws for pine, stone paving and the two
  sect halls. All 45 map props remain individual PNG files. The renderer does
  not load the abandoned vector set or full atlases.
- Thick outlined serif labels obscured Vietnamese accents. Player/NPC labels
  now use compact dark nameplates with clean sans serif text.
- Reduced foot-ring bloom and the inventory character scale so the silhouette,
  back equipment and weapon stay distinct.
- Replaced six outline inventory symbols with separately generated transparent
  painted PNGs. Mana potions receive a cyan tint to distinguish them from red
  healing potions. Weapon icons retain the actual class artwork.
- Reworked HUD, cell materials, rarity borders and desktop control placement.
  Mobile keeps the scrolling action row and separate skill row.
- Fixed dialog close focus: hidden modal content could retain keyboard focus
  and swallow the next F shortcut. Closing now returns focus to the invoking
  control or game canvas. A real-keyboard regression checks this behavior.
- Map and item PNG URLs inherit the deployment revision from their script,
  preventing a newly deployed game from retaining old cached artwork.
- Added the public ITEMS folder to the Python static-art allowlist. A real HTTP
  integration test verifies GET and HEAD for every icon, including versioned URLs.
- Retained the existing high resolution character art and 96 full skill PNG
  poses. No source rectangles are used to clip skill artwork.

## Validation

All JavaScript files receive syntax checks. Python backend, release and asset
tests exercise account isolation, SQLite persistence, multiplayer combat and
arena budgets. Browser checks cover all four classes, each class's combat,
skill aiming, full sprite rendering, HTTP/file maps, terrain traversal,
teleportation, respawn, inventory drag/drop, real mobile touch and DPR 1/2/3.
Screenshots are saved locally under `tests/artifacts` for visual inspection.

Equipment renderer tests now observe original `renderArtwork` inputs, rather
than wrongly treating the renderer's cached downsized canvas as a missing PNG.

## Scope

Five major map textures and six item icons use detailed redraws. The remaining
map props retain their extracted original PNG pixels; they are not claimed to
contain newly recovered detail. Original map atlases and skill sheets remain
available in the repository. There are no save-format, database-schema,
service-port or skill-speed changes in this revision.
