import sys
from PIL import Image
def grid(art,pal):
    rows=art.strip('\n').split('\n');w=max(len(r) for r in rows)
    im=Image.new('RGBA',(w,len(rows)),(0,0,0,0))
    for y,r in enumerate(rows):
        for x,c in enumerate(r):
            if c!='.' and c!=' ':im.putpixel((x,y),tuple(int(pal[c][i:i+2],16) for i in (0,2,4))+(255,))
    return im
def sheet(ims,scale=8,bg=(90,104,92)):
    w=sum(i.width for i in ims)*scale+10*len(ims);h=max(i.height for i in ims)*scale
    c=Image.new('RGB',(w,h),bg);x=0
    for i in ims:
        b=i.resize((i.width*scale,i.height*scale),Image.NEAREST);c.paste(b,(x,0),b);x+=b.width+10
    return c
