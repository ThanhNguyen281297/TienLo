# Individual painted map assets

These 45 RGBA PNG files were extracted from the original `MAP/asset*.png`
atlases. The game loads each prop separately. No SVG is rendered, and the full
atlas is not loaded at runtime. Original pixel sizes and alpha are preserved.

Buildings: palace, gate, school, market, forge, tower, hubBazaar, hubWell,
thunderHall, mysticHall, mysticArchive, board, stall.

Terrain: greatIsland, island, arena, platform, tile, moonCourt, moonDais,
bridge, bridgeRail, stairs, rock, peak, cloudRock.

Nature and props: trees, flowers, ponds, gardens, waterfalls, clouds, lantern,
portal, statues, altars and crystal pillars.

Open `index.html` to inspect every separated PNG on a dark background.
`manifest.json` lists native dimensions and hashes. Refresh the index using
`python tools/index_map_sprites.py`.

Small source assets retain their actual source detail. Resizing a file upward
does not create new detail. The renderer uses smooth high quality sampling.
The previous SVG experiment is retained in `MAP/vector` as unused history.
