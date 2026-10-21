"""Measure complete animation poses only. PNGs come from built-in ImageGen unchanged."""
import json
from pathlib import Path
from statistics import median
from PIL import Image

ROOT=Path(__file__).resolve().parents[1]

def main():
    rules=json.loads((ROOT/'Map/expeditions.json').read_text(encoding='utf-8'))
    result={}
    for name in rules['species']:
        folder=ROOT/'Character/Monsters'/name
        source=folder/('animation-v2.png' if (folder/'animation-v2.png').exists() else 'animation-v1.png')
        image=Image.open(source).convert('RGBA');alpha=image.getchannel('A')
        frames=[]
        for row in range(5):
            for col in range(4):
                left,right=round(col*image.width/4),round((col+1)*image.width/4)
                top,bottom=round(row*image.height/5),round((row+1)*image.height/5)
                # Entire authored cell, not disconnected head/body fragments.
                cell=alpha.crop((left,top,right,bottom));box=cell.point(lambda a:255 if a>120 else 0).getbbox()
                if not box:raise ValueError(f'Empty animation frame {name}/{row}/{col}')
                x0,y0,x1,y1=box
                x0=max(0,x0-2);y0=max(0,y0-2);x1=min(right-left,x1+2);y1=min(bottom-top,y1+2)
                floor=y1-2
                # The contact center is measured on the bottom silhouette, so a
                # wide weapon or a spread wing never displaces the ground anchor.
                pixels=cell.load();xs=[x for y in range(max(y0,floor-4),floor+1) for x in range(x0,x1) if pixels[x,y]>180]
                anchor_x=median(xs) if xs else (x0+x1)/2
                frames.append(dict(rect=[left+x0,top+y0,x1-x0,y1-y0],anchor=[round(anchor_x-x0,2),floor-y0+1]))
        facing=([True,False,True,True,False] if name=='Soi' else [True]*5 if name in ('RongNuoc','RongXuong','PhuongHoang') else [False]*5)
        result[name]=dict(file=source.relative_to(ROOT).as_posix(),size=list(image.size),sourceHeight=median(f['anchor'][1] for f in frames[:4]),faceRight=facing,frames=frames)
    data=json.dumps(result,ensure_ascii=False,separators=(',',':'))
    (ROOT/'Character/Monsters/animation-frames.json').write_text(data+'\n',encoding='utf-8')
    (ROOT/'js/35n-monster-frames.js').write_text('/* Generated complete poses; source PNGs are unchanged. */\nwindow.newMonsterFrames='+data+';\n',encoding='utf-8')
    print('Registered 12 monsters / 240 complete animated poses.')

if __name__=='__main__':main()
