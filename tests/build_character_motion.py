"""Read complete ImageGen cells; emit geometry only, never edit source PNGs."""
import json
from pathlib import Path
from statistics import median
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
result={}
BANDS={
 'Kiem':{'Nam':[0,120,226,322,417,501],'Nu':[0,124,230,328,420,501]},
 'Liem':{'Nam':[0,123,232,326,421,501],'Nu':[0,126,236,331,423,501]},
 'Thuong':{'Nam':[0,120,228,331,428,501],'Nu':[0,120,229,335,429,501]},
 'Quat':{'Nam':[0,116,219,318,416,501],'Nu':[0,118,219,319,416,501]},
}
for cls in ('Kiem','Liem','Thuong','Quat'):
    file=f'Character/Motion/{cls}-v2.png';image=Image.open(ROOT/file).convert('RGBA');alpha=image.getchannel('A')
    for gender,start in (('Nam',0),('Nu',4)):
        frames=[]
        for row in range(5):
            # The illustrator leaves larger standing rows and shorter lotus rows.
            # Use the inspected transparent row gutters, never equal-height cuts.
            y0,y1=[round(v*image.height/501) for v in BANDS[cls][gender][row:row+2]]
            strip=alpha.crop((0,y0,image.width,y1));pixels=strip.load()
            counts=[sum(pixels[x,y]>160 for y in range(strip.height)) for x in range(image.width)]
            cuts=[0]
            for n in range(1,8):
                center=round(n*image.width/8);radius=round(image.width*.018)
                cuts.append(min(range(center-radius,center+radius+1),key=lambda x:(counts[x],abs(x-center))))
            cuts.append(image.width)
            for col in range(start,start+4):
                x0,x1=cuts[col:col+2]
                a=alpha.crop((x0,y0,x1,y1));box=a.point(lambda v:255 if v>140 else 0).getbbox()
                if not box:raise ValueError(f'Empty {cls}/{gender}/{row}/{col}')
                left,top,right,bottom=box;left=max(0,left-2);top=max(0,top-2);right=min(x1-x0,right+2);bottom=min(y1-y0,bottom+2)
                p=a.load();feet=[x for y in range(max(top,bottom-5),bottom) for x in range(left,right) if p[x,y]>180]
                frames.append(dict(rect=[x0+left,y0+top,right-left,bottom-top],anchor=[round(median(feet)-left,2) if feet else (right-left)/2,bottom-top-1]))
        result[cls+'/'+gender]=dict(file=file,size=list(image.size),standingHeight=median(f['anchor'][1] for f in frames[:4]),frames=frames)
data=json.dumps(result,ensure_ascii=False,separators=(',',':'))
(ROOT/'Character/Motion/frames.json').write_text(data+'\n',encoding='utf-8')
(ROOT/'js/35q-motion-frames.js').write_text('/* Complete walking and seated poses, generated metadata only. */\nwindow.characterMotionFrames='+data+';\n',encoding='utf-8')
print('8 class/gender rigs / 160 complete poses.')
