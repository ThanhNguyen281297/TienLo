"""Rebuild reviewed, native-size architecture cutouts; originals stay untouched."""
from pathlib import Path
import json
from PIL import Image, ImageDraw, ImageChops

ROOT = Path(__file__).resolve().parents[1]
for name, meta in json.loads((ROOT / 'Map/structures/manifest.json').read_text(encoding='utf-8')).items():
    image = Image.open(ROOT / meta['sourceSprite']).convert('RGBA')
    mask = Image.new('L', image.size)
    ImageDraw.Draw(mask).polygon(meta['silhouette'], fill=255)
    image.putalpha(ImageChops.multiply(image.getchannel('A'), mask))
    if 'crop' in meta:
        image = image.crop(meta['crop'])
    image.save(ROOT / meta['src'])
