"""Pixel heroes v4: real walk cycles. Every frame of the painted motion atlas
(Character/Motion/<Class>-v2.png: 4 walk frames x front/back/left/right + 4 meditation frames,
with alternating feet) is converted to pixel art at the hero size with one shared palette per
character, and gets a hand-style pixel face placed on the detected face.
Atlas per class+gender: 4 columns x 5 rows of 46x46 cells (figure 42 px), same layout as v3.
Run: python3 tools/pixel/build_heroes_v4.py -> Character/Pixel/<Class>-<Nam|Nu>.png"""
import os,sys,json
import numpy as np
from PIL import Image
HERE=os.path.dirname(os.path.abspath(__file__));sys.path.insert(0,HERE)
from monsters import premul_down,palette_for,render
from hero_convert import despeck,face_box
from build_heroes_v3 import face
ROOT=os.path.normpath(os.path.join(HERE,'..','..'))
CW=CH=46;FIG=42
def build(cls,g):
    meta=json.load(open(os.path.join(ROOT,'Character','Motion','frames.json')))[f'{cls}/{g}']
    sheet=Image.open(os.path.join(ROOT,meta['file'])).convert('RGBA');k=FIG/meta['standingHeight']
    frames=[]
    for f in meta['frames']:
        x,y,w,h=f['rect'];crop=sheet.crop((x,y,x+w,y+h))
        sw,sh=max(1,round(w*k)),max(1,round(h*k));frames.append((premul_down(crop,sw,sh),f['anchor'],(w,h)))
    pal=palette_for([(rgb,al>.42) for (rgb,al),_,_ in frames],28)
    # v3 heads (clean hand-placed faces) are put on every walking body so the face never changes
    from hero_convert import views
    import build_heroes_v3 as v3
    v3.FIG=FIG;st=views(cls,g,FIG);kk=FIG/60;fb={d:v3.scaled(bx,kk) for d,bx in v3.FACES[(cls,g)].items()}
    heads={'truoc':v3.face(st['truoc'],g,'truoc',fb['truoc']),'trai':v3.face(st['trai'],g,'trai',fb['trai'])}
    heads['phai']=heads['trai'].transpose(Image.FLIP_LEFT_RIGHT);heads['sau']=st['sau']
    NECK=round(FIG*.5)
    def cx_of(a,y0,y1):
        m=np.asarray(a)[y0:y1,:,3]>0;xs=np.nonzero(m)[1];return xs.mean() if len(xs) else a.width/2
    atlas=Image.new('RGBA',(CW*4,CH*5))
    for i,((rgb,al),anchor,(w,h)) in enumerate(frames):
        row,col=divmod(i,4);body=despeck(render(rgb,al,pal))
        view={0:'truoc',1:'sau',2:'trai',3:'phai',4:'truoc'}[row]
        bb=body.getbbox();top=bb[1]
        hd=heads[view];hb=hd.getbbox();head=hd.crop((0,hb[1],hd.width,hb[1]+NECK))
        cut=top+NECK-(0 if row<4 else 2)
        a=np.array(body);a[:max(0,cut-1),:,3]=0;body=Image.fromarray(a)
        H=max(body.height,cut+1)+2;W=max(body.width,head.width)+4;fig=Image.new('RGBA',(W,H+NECK))
        ox=2;fig.alpha_composite(body,(ox,NECK));bx=cx_of(body,cut,min(body.height,cut+6))+ox;hx=cx_of(head,NECK-6,NECK)
        fig.alpha_composite(head,(int(round(bx-hx)),cut+NECK-NECK-1+NECK-NECK+0 if False else cut-NECK+NECK-1))
        fb2=fig.getbbox();fig=fig.crop(fb2);centre=cx_of(fig,0,NECK)
        atlas.alpha_composite(fig,(max(0,int(round(col*CW+CW/2-centre))),max(0,row*CH+CH-fig.height)))
    return atlas
if __name__=='__main__':
    dest=os.path.join(ROOT,'Character','Pixel')
    for cls in ('Kiem','Liem','Thuong','Quat'):
        for g in ('Nam','Nu'):build(cls,g).save(os.path.join(dest,f'{cls}-{g}.png'),optimize=True)
    print('ok')
