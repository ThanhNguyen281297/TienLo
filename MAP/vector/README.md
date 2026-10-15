# Map vector artwork

Complete replacement for the 45 raster map props, buildings, terrain pieces and
four sect floor sigils. Original atlases, `MAP/sprites` and `MAP/hd` remain as
source backups; the map loader now requests these SVG files exclusively.

The shared palette uses jade foliage, ivory stone, dark blue tiled roofs and
restrained gold ornament. Paths, gradients and geometry are native SVG, without
embedded bitmap images. The browser draws SVG directly at the canvas backing
resolution, including high density displays; raster mip caches are bypassed.

Rebuild deterministically from the repository root:

```sh
python tools/build_map_vectors.py
```

The generator uses only Python's standard library and enumerates original sprite
names for complete coverage. Keep SVG files and `manifest.json` in deployment.
Terrain, collision, service locations and map progression are unchanged.
