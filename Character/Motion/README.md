# Character/Motion (removed)

The painted walk atlases (`<Class>-v2.png`, `frames.json`) were the source of the pixel walk cycles in
`Character/Pixel/` (tools/pixel/build_heroes_v4.py). The game is pixel only, so they were removed from the
release; restore them from git history (commit before "Pixel only cleanup") to rebuild the pixel heroes.
