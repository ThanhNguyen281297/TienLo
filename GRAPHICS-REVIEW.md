# Graphics pass 3 — 2026-10-24

- **Asset weight:** `tools/build_display_variants.py` writes display-size `.d.webp`
  copies of item/NPC art (512–1024 px, same aspect ratio) and 192 px monster
  thumbnails; `js/00-asset-webp.js` prefers them via `js/00-display-manifest.js`.
  Class bodies, sect NPC bodies and the legacy moon art load on first draw; an
  unused eager preload of two classes' skill frames was removed. First load of
  the hub went from 156 images / 31.1 MB to ~125 images / ~19 MB.
- **Desktop HUD (`js/59-desktop-hud.js`):** mouse + keyboard get a horizontal
  action bar (1–4, F, R pet, G shield) and no thumb joystick; touch keeps the
  wheel. Event pill docks bottom-left, Welfare auto-opens at most once a day,
  interaction hints print "E" only with a keyboard, camera keeps the player
  above the bottom HUD. Desktop zoom follows screen height (1.8–2.8×).
- **Quality setting (`js/60-graphics-settings.js`, ⚙ menu):** Tự động / Cao /
  Vừa / Thấp controls canvas density, cinematic haze, colour-grade overlay,
  night bloom and ambient particles; Tự động steps down when frames stay slow.
- **Light:** contact shadow under every actor at all hours; night lights and
  bloom use cached glow sprites instead of ~100 new gradients per frame;
  lighter vignette and colour-grade overlay.
- **World:** hub vertical street replaced by an inlaid isometric road and plaza
  ring; field spawn plazas are raised daises with a carved south face and
  shadow; hub minimap draws the floating city (`js/61-world-polish.js`).
- **UI skin (`css/xianxia-ui.css`):** gold cloud-scroll corners on framed panels,
  one title/text font pair, key art behind login and character creation,
  calmer empty inventory cells.

Validation: all CI Python suites pass; `mobile-hud`, `mobile-screen` and
`equipment-animation` browser tests pass. `render-quality`, `skill-sprites`,
`four-sect-maps`, `character-ground-rendering` and the three Playwright
timeouts fail identically on the previous commit (pre-existing).

# Graphics review — 2026-10-15

Current layout revision: map floors now use modular paving, cliff, waterfall and
bridge sprites; the old complete decorated island is retained only as a source.
Character/NPC/prop bounds are audited in all five service maps. See
`Map/SPRITE-WORKFLOW.md` for the current 304-sprite catalog, paths and VFX design.
The notes below describe the preceding resolution/UI pass.

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
- Placed painted item icons in Map/items, inside the existing Python and Nginx public map-art allowlists. A real HTTP
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
