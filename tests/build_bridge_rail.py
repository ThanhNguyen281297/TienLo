"""Export the original stone balustrade; preserve the source MAP images."""
from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parents[1]
rail = Image.open(root / 'MAP/sprites/moonCourt.png').crop((215, 15, 270, 47)).convert('RGBA')
pixels = rail.load()
for y in range(rail.height):
    for x in range(rail.width):
        # Exclude paving below the sloping original railing.
        if y > .36 * x + 14:
            pixels[x, y] = (0, 0, 0, 0)
rail = rail.rotate(20, Image.Resampling.BICUBIC, expand=True)
rail.crop(rail.getbbox()).save(root / 'MAP/sprites/bridgeRail.png')
