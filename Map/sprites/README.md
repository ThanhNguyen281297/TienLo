# Individual painted map assets

The game loads these 45 individual painted PNG assets separately. No SVG is
rendered and no full atlas is loaded at runtime. Most props were extracted from
the original `Map/asset*.png` atlases. Five heavily enlarged props now use
ImageGen redraws: greatIsland, pineTree, mysticHall, thunderHall and tile.
Props have transparent alpha; the repeating stone tile is opaque.

Buildings: palace, gate, school, market, forge, tower, hubBazaar, hubWell,
thunderHall, mysticHall, mysticArchive, board, stall.

Terrain: greatIsland, island, arena, platform, tile, moonCourt, moonDais,
bridge, bridgeRail, stairs, rock, peak, cloudRock.

Nature and props: trees, flowers, ponds, gardens, waterfalls, clouds, lantern,
portal, statues, altars and crystal pillars.

Open `index.html` to inspect every separated PNG on a dark background.
`manifest.json` lists native dimensions and hashes. Refresh the index using
`python tools/index_map_sprites.py`.

Small source assets retain their actual source detail. The five HD redraws add
new painted detail, rather than claiming to recover missing original pixels.
The renderer uses smooth high quality sampling and a 1.8× CSS world zoom.
The old SVG experiment is retired. See `Map/sprite-library.html` for the complete
searchable sprite catalog and `Map/SPRITE-WORKFLOW.md` for the map workflow.
