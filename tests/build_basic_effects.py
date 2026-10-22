"""Measure transparent atlas gutters and record intact parts; never edit the PNGs."""
import json
from pathlib import Path
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
def gutter(values,expected,radius):
    low=max(1,int(expected-radius));high=min(len(values)-1,int(expected+radius))
    best=min(values[low:high]);candidates=[i for i in range(low,high) if values[i]==best]
    return min(candidates,key=lambda i:abs(i-expected))

result=[]
for name in ('Kiem','Liem','Thuong','Quat'):
    file='Skill/Basic/'+name+'-v2.png';image=Image.open(ROOT/file);alpha=image.getchannel('A');w,h=image.size
    solid=alpha.point(lambda a:255 if a>=50 else 0)
    row_counts=[sum(solid.crop((0,y,w,y+1)).tobytes()) for y in range(h)]
    middle=gutter(row_counts,h/2,h*.09);parts=[]
    for top,bottom in ((0,middle),(middle,h)):
        counts=[sum(solid.crop((x,top,x+1,bottom)).tobytes()) for x in range(w)]
        cols=[0,gutter(counts,w/3,w*.05),gutter(counts,w*2/3,w*.05),w]
        for left,right in zip(cols,cols[1:]):
            a=alpha.crop((left,top,right,bottom));box=a.point(lambda v:255 if v>=8 else 0).getbbox()
            x,y,x2,y2=box;x=max(left,left+x-7);y=max(top,top+y-7);x2=min(right,left+x2+7);y2=min(bottom,top+y2+7)
            parts.append(dict(rect=[x,y,x2-x,y2-y],cell=[left,top,right-left,bottom-top]))
    result.append(dict(name=name,file=file,size=[w,h],parts=parts))
(ROOT/'Skill/Basic/parts.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
(ROOT/'js/22b-basic-effect-parts.js').write_text('/* Read-only alpha measurements; full original PNGs are retained. */\nwindow.basicEffectParts='+json.dumps(result,separators=(',',':'))+';\n',encoding='utf-8')
print([(r['name'],[p['rect'] for p in r['parts']]) for r in result])
