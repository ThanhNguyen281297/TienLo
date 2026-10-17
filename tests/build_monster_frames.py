"""Build source rectangles only. Original monster sheets are never modified."""
import json
from pathlib import Path
import numpy as np
from PIL import Image
from scipy.ndimage import label, find_objects

root = Path(__file__).resolve().parents[1]
result = {}
for folder in ('BoNgua', 'Tho', 'Nhen', 'Doi'):
    result[folder] = []
    counts = [6, 6, 6, 5, 6] if folder in ('BoNgua', 'Tho') else [6, 6, 5, 6]
    for sheet, count in enumerate(counts, 1):
        image = Image.open(root / 'Character/Monsters' / folder / f'{sheet}.png').convert('RGBA')
        alpha = np.array(image.getchannel('A'))
        labels, _ = label(alpha > 24)
        sizes = np.bincount(labels.ravel())
        objects = find_objects(labels)
        boxes = sorted([(obj[1].start, obj[1].stop) for index, obj in enumerate(objects, 1) if sizes[index] > 5000])
        # Some generated attack effects touch the next pose. Split only that
        # connected group at its lowest alpha density, not at equal cell widths.
        while len(boxes) < count:
            index = max(range(len(boxes)), key=lambda i: boxes[i][1]-boxes[i][0])
            left, right = boxes.pop(index)
            width = right-left
            low, high = left+int(width*.36), left+int(width*.64)
            projection = (alpha[:, low:high] > 24).sum(axis=0)
            cut = low + int(projection.argmin())
            boxes[index:index] = [(left, cut), (cut, right)]
        if len(boxes) != count:
            raise ValueError(f'{folder}/{sheet}: expected {count} poses, got {len(boxes)}')
        frames = []
        for left, right in boxes:
            left, right = max(0, left-2), min(image.width, right+2)
            pixels = np.argwhere(alpha[:, left:right] > 8)
            top, bottom = max(0, int(pixels[:, 0].min())-2), min(image.height, int(pixels[:, 0].max())+3)
            frames.append({'x': left, 'y': top, 'w': right-left, 'h': bottom-top})
        result[folder].append(frames)
(root / 'Character/Monsters' / 'frames.js').write_text('window.monsterFrames=' + json.dumps(result, separators=(',', ':')) + ';\n', encoding='utf-8')
print('Built source rectangles for all 18 original monster sheets')
