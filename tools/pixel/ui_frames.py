"""Pixel UI pieces for the Pixel art style: 9-slice frames (panel, button, pressed button,
slot), a skill-button ring and the mouse cursor. Written to css/pixel/*.png.
Run: python3 tools/pixel/ui_frames.py"""
import os
from PIL import Image
OUT=os.path.join(os.path.dirname(os.path.abspath(__file__)),'..','..','css','pixel')
def H(c):return tuple(int(c[i:i+2],16) for i in (0,2,4))+(255,)
def from_rows(rows,pal):
    im=Image.new('RGBA',(len(rows[0]),len(rows)),(0,0,0,0))
    for y,r in enumerate(rows):
        for x,ch in enumerate(r):
            if ch!='.':im.putpixel((x,y),H(pal[ch]))
    return im
def frame(size,corner,outer,gold,gold_hi,gold_lo,fill,inner,stud=None):
    """Square 9-slice frame: dark outline, 2-px gold bevel, dark inner line, flat fill."""
    im=Image.new('RGBA',(size,size),H(fill));px=im.load()
    for i in range(size):
        for j in range(size):
            d=min(i,j,size-1-i,size-1-j)
            if d==0:c=outer
            elif d==1:c=gold_hi if (i<size/2 and j<size/2) or min(i,j)==1 and (i==1 or j==1) and (i<size-2 and j<size-2) else gold
            elif d==2:c=gold_lo
            elif d==3:c=inner
            else:continue
            px[i,j]=H(c)
    # cut the very corners for a rounded pixel look
    for (x,y) in ((0,0),(size-1,0),(0,size-1),(size-1,size-1)):px[x,y]=(0,0,0,0)
    if stud:
        for (x,y) in ((corner//2,corner//2),(size-1-corner//2,corner//2),(corner//2,size-1-corner//2),(size-1-corner//2,size-1-corner//2)):
            px[x,y]=H(stud);px[x+1,y]=H(stud);px[x,y+1]=H(stud);px[x+1,y+1]=H(gold_lo)
    return im
CURSOR=["K.............",
        "KYK...........",
        "KyYK..........",
        "KyYYK.........",
        "KyYYYK........",
        "KyYYYYK.......",
        "KyYYYYYK......",
        "KyYYYYYYK.....",
        "KyYYYYYYYK....",
        "KyYYYYKKKKK...",
        "KyYKYYK.......",
        "KyK.KYYK......",
        "KK..KYYK......",
        "K....KYYK.....",
        ".....KYYK.....",
        "......KK......"]
if __name__=='__main__':
    os.makedirs(OUT,exist_ok=True)
    frame(24,8,'140806','d8a446','ffe39a','8a5a1c','24120c','0c0503',stud='fff0b8').save(os.path.join(OUT,'panel.png'))
    frame(12,4,'140806','c99238','ffe08a','7a4a14','5a2414','2a0e06').save(os.path.join(OUT,'button.png'))
    frame(12,4,'140806','e8b44e','fff2c0','8a5a1c','c08a32','6a3a10').save(os.path.join(OUT,'button-gold.png'))
    frame(12,4,'0c0503','8a6430','b8904a','4a3018','1a0c06','0a0402').save(os.path.join(OUT,'slot.png'))
    c=from_rows(CURSOR,{'K':'140806','Y':'ffe08a','y':'c08a32'});c.resize((c.width*2,c.height*2),Image.NEAREST).save(os.path.join(OUT,'cursor.png'))
    print('ok')
