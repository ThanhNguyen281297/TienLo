"""Draws the Kỳ Trân Các item icons (Item/KyTran/*.png) with PIL: 256 px, transparent."""
import math
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter

OUT = Path(__file__).resolve().parents[1] / 'Item' / 'KyTran'
S = 256


def glow(color, radius=96, alpha=150):
    im = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.ellipse((S / 2 - radius, S / 2 - radius, S / 2 + radius, S / 2 + radius), fill=color + (alpha,))
    return im.filter(ImageFilter.GaussianBlur(28))


def grad_rect(size, top, bottom):
    w, h = size
    im = Image.new('RGBA', size)
    for y in range(h):
        t = y / max(1, h - 1)
        im.paste(tuple(int(a + (b - a) * t) for a, b in zip(top, bottom)) + (255,), (0, y, w, y + 1))
    return im


def outline(base, color=(60, 30, 10, 255), width=5):
    mask = base.split()[3]
    edge = mask.filter(ImageFilter.MaxFilter(width * 2 + 1))
    out = Image.new('RGBA', base.size, color)
    out.putalpha(edge)
    out.alpha_composite(base)
    return out


def talisman(seal, paper=((255, 236, 160), (226, 176, 70)), ink=(190, 30, 30)):
    im = glow((255, 210, 90))
    body = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    body.paste(grad_rect((112, 190), *paper), (72, 33))
    d = ImageDraw.Draw(body)
    d.rectangle((80, 41, 175, 215), outline=ink + (255,), width=4)
    seal(d, ink)
    im.alpha_composite(outline(body.rotate(-8, resample=Image.BICUBIC, center=(128, 128))))
    return im


def seal_exp(d, ink):
    d.text((0, 0), '')
    for i, y in enumerate((70, 110, 150)):
        d.line((100, y, 156, y), fill=ink + (255,), width=6)
        d.line((128, y - 14, 128, y + 14), fill=ink + (255,), width=6)
    d.ellipse((108, 170, 148, 205), outline=ink + (255,), width=5)


def seal_forge(d, ink):
    d.polygon([(128, 62), (150, 120), (136, 120), (148, 190), (106, 112), (122, 112), (108, 62)], fill=ink + (255,))


def padlock():
    im = glow((120, 200, 255))
    body = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(body)
    d.arc((78, 40, 178, 150), 180, 360, fill=(200, 210, 225, 255), width=20)
    d.line((88, 95, 88, 125), fill=(200, 210, 225, 255), width=20)
    d.line((168, 95, 168, 125), fill=(200, 210, 225, 255), width=20)
    body.alpha_composite(grad_rect((140, 110), (255, 220, 120), (190, 120, 40)), (58, 112))
    d = ImageDraw.Draw(body)
    d.ellipse((114, 140, 142, 168), fill=(80, 40, 10, 255))
    d.polygon([(122, 160), (134, 160), (138, 195), (118, 195)], fill=(80, 40, 10, 255))
    im.alpha_composite(outline(body))
    return im


def token():
    im = glow((140, 255, 200))
    body = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    plaque = grad_rect((120, 170), (120, 220, 190), (30, 110, 90))
    m = Image.new('L', (120, 170), 0)
    ImageDraw.Draw(m).rounded_rectangle((0, 0, 119, 169), 26, fill=255)
    plaque.putalpha(m)
    body.alpha_composite(plaque, (68, 50))
    d = ImageDraw.Draw(body)
    d.rounded_rectangle((80, 62, 176, 208), 18, outline=(255, 226, 140, 255), width=5)
    d.ellipse((104, 92, 152, 140), outline=(255, 226, 140, 255), width=6)
    d.line((128, 150, 128, 192), fill=(255, 226, 140, 255), width=7)
    d.line((112, 172, 144, 172), fill=(255, 226, 140, 255), width=7)
    d.ellipse((116, 24, 140, 50), outline=(255, 226, 140, 255), width=6)
    im.alpha_composite(outline(body))
    return im


def chest(lid=(170, 90, 40), trim=(255, 210, 100), gem=(200, 120, 255)):
    im = glow(gem)
    body = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    body.alpha_composite(grad_rect((170, 90), lid, tuple(int(c * .6) for c in lid)), (43, 120))
    top = grad_rect((170, 60), tuple(min(255, int(c * 1.25)) for c in lid), lid)
    m = Image.new('L', (170, 60), 0)
    ImageDraw.Draw(m).pieslice((0, 0, 169, 119), 180, 360, fill=255)
    top.putalpha(m)
    body.alpha_composite(top, (43, 62))
    d = ImageDraw.Draw(body)
    for x in (60, 196):
        d.line((x, 70, x, 208), fill=trim + (255,), width=10)
    d.line((43, 122, 213, 122), fill=trim + (255,), width=10)
    d.rectangle((112, 110, 144, 150), fill=trim + (255,))
    d.ellipse((118, 118, 138, 138), fill=gem + (255,))
    for a in range(6):
        x, y = 128 + math.cos(a) * 70, 60 + math.sin(a * 2) * 18
        d.ellipse((x - 5, y - 5, x + 5, y + 5), fill=(255, 255, 220, 255))
    im.alpha_composite(outline(body))
    return im


def pouch():
    im = glow((255, 220, 120))
    body = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    bag = grad_rect((150, 140), (120, 200, 255), (40, 90, 190))
    m = Image.new('L', (150, 140), 0)
    ImageDraw.Draw(m).ellipse((0, 0, 149, 139), fill=255)
    bag.putalpha(m)
    body.alpha_composite(bag, (53, 90))
    d = ImageDraw.Draw(body)
    d.polygon([(96, 96), (160, 96), (178, 52), (78, 52)], fill=(80, 150, 230, 255))
    d.line((92, 98, 164, 98), fill=(255, 215, 110, 255), width=10)
    for x, y in ((110, 150), (140, 168), (124, 186)):
        d.ellipse((x - 14, y - 9, x + 14, y + 9), fill=(170, 255, 230, 255), outline=(40, 120, 110, 255), width=3)
    im.alpha_composite(outline(body))
    return im


def pill(color=(255, 120, 80)):
    im = glow(color)
    body = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    ball = Image.new('RGBA', (140, 140), (0, 0, 0, 0))
    for r in range(70, 0, -1):
        t = r / 70
        c = tuple(int(255 - (255 - v) * t) for v in color) + (255,)
        ImageDraw.Draw(ball).ellipse((70 - r - (1 - t) * 20, 70 - r - (1 - t) * 20, 70 + r - (1 - t) * 20, 70 + r - (1 - t) * 20), fill=c)
    body.alpha_composite(ball, (58, 58))
    d = ImageDraw.Draw(body)
    d.arc((70, 70, 186, 186), 200, 320, fill=(255, 245, 210, 255), width=6)
    im.alpha_composite(outline(body, (90, 30, 10, 255)))
    return im


def spirit():
    im = glow((120, 180, 255), 110, 190)
    body = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(body)
    d.ellipse((58, 58, 198, 198), fill=(60, 110, 220, 230))
    d.ellipse((80, 80, 176, 176), fill=(140, 200, 255, 255))
    for x, y in ((104, 100), (128, 90), (152, 100)):
        d.ellipse((x - 11, y - 13, x + 11, y + 13), fill=(30, 50, 120, 255))
    d.ellipse((104, 116, 152, 160), fill=(30, 50, 120, 255))
    im.alpha_composite(outline(body, (20, 30, 80, 255)))
    return im


def card():
    im = glow((255, 200, 120))
    body = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    c = grad_rect((180, 120), (255, 220, 140), (200, 120, 60))
    m = Image.new('L', (180, 120), 0)
    ImageDraw.Draw(m).rounded_rectangle((0, 0, 179, 119), 18, fill=255)
    c.putalpha(m)
    body.alpha_composite(c, (38, 68))
    d = ImageDraw.Draw(body)
    d.ellipse((150, 84, 196, 130), fill=(255, 250, 230, 255))
    d.ellipse((136, 78, 182, 124), fill=(220, 150, 70, 255))
    for i in range(3):
        d.line((58, 140 + i * 14, 140 - i * 22, 140 + i * 14), fill=(120, 60, 20, 255), width=7)
    im.alpha_composite(outline(body))
    return im


ICONS = {
    'song-boi-phu': lambda: talisman(seal_exp),
    'phu-cuong-hoa': lambda: talisman(seal_forge, ((255, 220, 200), (230, 120, 90)), (120, 20, 120)),
    'khoa-tay-luyen': padlock,
    'be-quan-lenh': token,
    'ruong-manh': chest,
    'thu-hon-bao': spirit,
    'tui-linh-thach': pouch,
    'linh-nguyen-dan': lambda: pill((120, 240, 190)),
    'nguyet-tap': card,
}

if __name__ == '__main__':
    OUT.mkdir(parents=True, exist_ok=True)
    for name, draw in ICONS.items():
        draw().save(OUT / f'{name}.png')
    print('icons', len(ICONS))
