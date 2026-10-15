# High-resolution map art

Created with built-in ImageGen, referencing existing `MAP/sprites` assets. Original files are retained. Runtime opts into HD tile, pineTree, mysticHall and thunderHall assets.

Prompt set:
- tile: seamless ivory limestone paving, diagonal isometric slabs, fine grain and muted gold-beige joints; preserve reference palette; no scene, text or spotlight; opaque surface.
- pineTree: preserve squat broad canopy, gnarled reddish trunk, exposed roots and mossy base; complete isometric tree, fine painterly foliage and bark, transparent background.
- mysticHall: preserve compact blue/gold sect hall, round golden door, blue banners and front stairs; crisp painterly architecture, complete silhouette, transparent background.
- thunderHall: preserve wide blue/gold palace and floating terrace, side waterfalls, banners and front steps; clear architectural and rock detail, transparent background.

These are redrawn assets, not recovered detail from the original pixels. Ground repetition remains 48 × 24 world units regardless of source image size.

`cliff-rock.png`: seamless material derived with ImageGen from the original
island's blue/ivory granite. Prompt removes all foliage clusters, architecture,
water and paving; requests crisp irregular rock planes, small moss crevices,
diffuse lighting and seamless edges. It is used as an opaque cliff material,
with waterfall flow and surface paving drawn as independent sprites.

2026-10-15: selected HD art is copied into `MAP/sprites` so all map props use
the same individual PNG loader. The main greatIsland PNG was also redrawn from
its original reference (701 × 528 → 1445 × 1089), preserving the floating
courtyard, crystal, stairs, waterfalls and transparent silhouette. Its prompt
requests precise ivory stone seams, gold/cyan inlays, controlled bloom and
complete uncropped production game art. Original atlases remain untouched.
