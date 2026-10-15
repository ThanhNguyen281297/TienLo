"""Build the complete resolution-independent map art family from editable SVG.
Original PNG artwork is retained; SVG viewports fit the new artwork.
"""
from pathlib import Path
import json, math, random

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'MAP/vector'
DEFS='''<defs>
<linearGradient id="stone" x2="0" y2="1"><stop stop-color="#fbefcf"/><stop offset="1" stop-color="#b5b6ac"/></linearGradient>
<linearGradient id="wall" x2="0" y2="1"><stop stop-color="#eee5cc"/><stop offset="1" stop-color="#b1c6bd"/></linearGradient>
<linearGradient id="roof" x2=".2" y2="1"><stop stop-color="#37647a"/><stop offset=".55" stop-color="#1c3e54"/><stop offset="1" stop-color="#102a3c"/></linearGradient>
<linearGradient id="gold" x2=".2" y2="1"><stop stop-color="#fff0b5"/><stop offset=".5" stop-color="#c9a362"/><stop offset="1" stop-color="#8d6a3a"/></linearGradient>
<linearGradient id="rock" x2=".3" y2="1"><stop stop-color="#789b94"/><stop offset=".45" stop-color="#416773"/><stop offset="1" stop-color="#1c354d"/></linearGradient>
<linearGradient id="wood" x2="1" y2="1"><stop stop-color="#9f7c53"/><stop offset="1" stop-color="#4b4f43"/></linearGradient>
<linearGradient id="water" x2="0" y2="1"><stop stop-color="#a4f3e7"/><stop offset=".45" stop-color="#51b9d2" stop-opacity=".9"/><stop offset="1" stop-color="#c2f7f2" stop-opacity="0"/></linearGradient>
<linearGradient id="pool" x2="1" y2="1"><stop stop-color="#193f58"/><stop offset="1" stop-color="#65bbb6"/></linearGradient>
<linearGradient id="leaf" x2=".2" y2="1"><stop stop-color="#a4c391"/><stop offset=".45" stop-color="#4b8274"/><stop offset="1" stop-color="#255a60"/></linearGradient>
<linearGradient id="petal" x2=".2" y2="1"><stop stop-color="#fff0dd"/><stop offset=".45" stop-color="#e7a9b6"/><stop offset="1" stop-color="#b36e99"/></linearGradient>
<radialGradient id="mist"><stop stop-color="#d9f4ec" stop-opacity=".65"/><stop offset="1" stop-color="#d9f4ec" stop-opacity="0"/></radialGradient>
</defs>'''

def path(d,fill,stroke='none',sw=2,extra=''):
    return f'<path d="{d}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}" stroke-linejoin="round" {extra}/>'
def ellipse(x,y,rx,ry,fill,extra=''):
    return f'<ellipse cx="{x}" cy="{y}" rx="{rx}" ry="{ry}" fill="{fill}" {extra}/>'
def rect(x,y,w,h,fill,rx=0,extra=''):
    return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{rx}" fill="{fill}" {extra}/>'
def line(x,y,xx,yy,color,sw=2,extra=''):
    return f'<path d="M{x} {y}L{xx} {yy}" stroke="{color}" stroke-width="{sw}" fill="none" {extra}/>'
def group(s,x=0,y=0,sx=1,sy=None):
    return f'<g transform="translate({x} {y}) scale({sx} {sx if sy is None else sy})">{s}</g>'

def sigil(x,y,r=80,color='#c5af7c'):
    s=ellipse(x,y,r,r*.45,'none',f'stroke="{color}" stroke-width="3"')
    s+=ellipse(x,y,r*.78,r*.34,'none',f'stroke="{color}" stroke-width="1.6"')
    for i in range(8):
        a=i*math.pi/4;xx=x+math.cos(a)*r*.89;yy=y+math.sin(a)*r*.4
        s+=path(f'M{xx-4} {yy}l4 -3 4 3 -4 3Z',color)
    return s+path(f'M{x} {y-18}q-30 0 -30 18t30 18q30 0 30 -18t-30 -18',color)

def stairs(x=360,y=505,w=280,h=160):
    s=path(f'M{x+25} {y}H{x+w-25}L{x+w} {y+h}H{x}Z','url(#stone)','#7f9d9c',2)
    for i in range(1,10):
        yy=y+h*i/10;inset=25*(1-i/10)
        s+=line(x+inset,yy,x+w-inset,yy,'#fff4d5',3)+line(x+inset,yy+5,x+w-inset,yy+5,'#7c9598',1)
    return s

def roof(x=130,y=90,w=740,h=160):
    s=path(f'M{x-20} {y+h-14}Q{x+w*.24} {y+h*.7} {x+w*.5} {y}Q{x+w*.76} {y+h*.7} {x+w+20} {y+h-14}Q{x+w*.75} {y+h+18} {x+w*.5} {y+h-5}Q{x+w*.25} {y+h+18} {x-20} {y+h-14}Z','url(#roof)','#d7b776',4)
    for i in range(1,26):
        t=i/26;bx=x+w*t;top=y+abs(t-.5)*h*1.65+14
        s+=path(f'M{bx} {top}Q{bx+(t-.5)*20} {y+h*.8} {bx+(t-.5)*30} {y+h-6}','none','#638394',1.4,extra='opacity=".6"')
    s+=path(f'M{x-20} {y+h-14}q-35 -4 -46 -37M{x+w+20} {y+h-14}q35 -4 46 -37','none','#e6cb8b',7)
    s+=path(f'M{x+w*.5-14} {y+9}l14 -30 14 30 -14 12Z','url(#gold)')
    s+=line(x-15,y+h-2,x+w+15,y+h-2,'#e0c287',5)
    return s

def lantern(x,y,scale=1):
    s=path('M-24 0Q0 -15 24 0L20 58Q0 70 -20 58Z','#d5a75f','#785d3d',2)
    s+=rect(-17,6,34,48,'#f5dca0',9)+line(0,4,0,59,'#b58d57',2)
    s+=line(-22,0,22,0,'#e8d09b',4)+line(-19,59,19,59,'#c4a26c',4)
    s+=line(0,64,0,87,'#b89256',3)+path('M-6 87L0 76 6 87 0 103Z','#e8cf8b')
    return group(s,x,y,scale)

def hall(kind):
    rng=random.Random(kind);s=ellipse(500,650,430,32,'#102b3b',extra='opacity=".12"')
    s+=path('M90 550L500 475 910 550 880 625 500 688 120 625Z','url(#stone)','#91a69e',3)
    s+=rect(180,225,640,340,'url(#wall)',8)+rect(208,253,584,290,'#506c70',3)
    for x in [227,340,660,773]:
        s+=rect(x-13,257,26,280,'url(#wood)',3)+rect(x-18,510,36,28,'url(#gold)',3)
    s+=rect(376,305,248,235,'#1b3c4b',10)
    if kind in ('mysticHall','mysticArchive','school'):
        s+=ellipse(500,408,103,103,'url(#gold)',extra='stroke="#8d774f" stroke-width="4"')
        for r in [82,68,36]:s+=ellipse(500,408,r,r,'none',extra='stroke="#fff0bc" stroke-width="2"')
        s+=path('M500 322v172M414 408h172M440 348l120 120M440 468l120 -120','none','#8e744c',2)
    else:
        s+=rect(397,330,206,205,'url(#wood)',4)
        for x in range(410,600,19):s+=line(x,335,x,526,'#d5b97e',2)
        s+=line(500,330,500,533,'#102e3e',5)
    for x in [270,686]:
        s+=rect(x,290,45,154,'#25566c',2)+path(f'M{x} 444l22 19 23 -19','#25566c')
        s+=path(f'M{x+22} 304v126m-9 -80 9 -10 9 10 -9 10 -9 -10','none','#e4c88c',2)
    s+=roof(150,88,700,177)
    if kind in ('palace','thunderHall','gate'):
        s+=group(roof(150,88,700,177),150,30,.7,.65)
    if kind in ('tower','mysticArchive'):
        s+=group(roof(150,88,700,177),195,-15,.61,.62)
    for x in [140,860]:
        s+=rect(x-28,455,56,115,'url(#wall)',4)+group(roof(0,0,145,53),x-72,402)
        s+=lantern(x,464,.75)
    s+=stairs()
    for x in [320,680]:
        s+=rect(x-10,500,20,140,'url(#stone)',2)+ellipse(x,498,18,9,'url(#gold)')
    if kind=='thunderHall':s+=sigil(500,575,100,'#d2b881')
    return s

def island(kind):
    s=path('M35 250L500 32 965 250 500 476Z','#9caf9c','#d9d0ac',4)
    s+=path('M35 250L500 476 965 250 895 410 780 445 745 540 600 580 510 685 410 565 250 530 170 440 90 401Z','url(#rock)','#244554',3)
    for x,y in [(80,300),(180,375),(290,429),(420,480),(560,467),(680,412),(820,342)]:
        s+=path(f'M{x} {y}l35 95 25 -35 20 68','none','#92b0a5',3,extra='opacity=".35"')
    s+=path('M35 250L500 32 965 250 500 476Z','url(#stone)','#d8c797',6)
    for i in range(1,10):
        t=i/10
        s+=line(35+(500-35)*t,250-218*t,500+465*t,476-226*t,'#a9b5a7',1)
        s+=line(500+465*t,32+218*t,35+465*t,250+226*t,'#a9b5a7',1)
    s+=path('M65 251L500 50 935 251 500 459Z','none','#b99c66',3)
    if kind in ('arena','moonCourt','platform','moonDais','mysticDais'):s+=sigil(500,258,195,'#b6985d')
    return s

def foliage(kind):
    rng=random.Random(kind);pink=kind in ('sakura','whiteBlossom','tree2')
    s=ellipse(500,651,300,29,'#193d43',extra='opacity=".14"')
    s+=path('M310 657L420 576 530 590 700 659Z','url(#rock)')
    s+=path('M451 644Q567 535 480 423Q385 350 446 260L488 280Q469 359 547 429Q602 528 545 625L618 658 521 640 458 666Z','url(#wood)','#5d6048',3)
    for d in ['M505 465Q350 360 205 306','M502 425Q640 355 762 220','M492 353Q457 254 360 185','M510 535Q622 450 836 419']:
        s+=path(d,'none','#7f7150',20)
    clusters=[(230,292,175,87),(405,212,185,108),(650,240,190,96),(789,391,155,95),(322,402,186,90),(530,330,160,80),(537,132,135,75)]
    for x,y,rx,ry in clusters:
        points=[]
        for n in range(36):
            a=n*math.tau/36;r=1+.06*math.sin(n*4)+rng.random()*.04;points.append((x+math.cos(a)*rx*r,y+math.sin(a)*ry*r))
        d='M'+'L'.join(f'{xx:.1f} {yy:.1f}' for xx,yy in points)+'Z'
        s+=path(d,'url(#petal)' if pink else 'url(#leaf)','#78988a' if not pink else '#bd8c9f',1.5)
        for n in range(22):
            a=rng.random()*math.tau;r=math.sqrt(rng.random())*.85;xx=x+math.cos(a)*rx*r;yy=y+math.sin(a)*ry*r
            if pink:
                s+=ellipse(round(xx,1),round(yy,1),5,4,'#fff0e0',extra='opacity=".7"')
            else:s+=path(f'M{xx:.1f} {yy+5:.1f}l7 -6 7 4','none','#c4d1a1',1.5,extra='opacity=".48"')
    return s

def pool(kind):
    s=ellipse(500,420,440,180,'url(#stone)',extra='stroke="#c2b68e" stroke-width="8"')
    s+=ellipse(500,410,392,145,'url(#pool)',extra='stroke="#e7dcac" stroke-width="5"')
    for x,y,r in [(300,390,65),(650,435,70),(560,340,50)]:
        s+=ellipse(x,y,r,r*.35,'#477d6b',extra='stroke="#90b798" stroke-width="2"')
        s+=path(f'M{x} {y}l{r} 0','none','#b5cc94',2)
        for a in range(6):
            xx=x+math.cos(a*math.pi/3)*14;yy=y-12+math.sin(a*math.pi/3)*9
            s+=ellipse(round(xx,1),round(yy,1),10,5,'#f1d2c5',extra=f'transform="rotate({a*60} {xx} {yy})"')
        s+=ellipse(x,y-12,5,4,'#dfc274')
    for yy in [366,418,464]:s+=path(f'M200 {yy}q100 -15 180 0t180 0t180 0','none','#ade0d6',2,extra='opacity=".35"')
    return s

def crystal(kind):
    s=ellipse(500,653,290,27,'#193e49',extra='opacity=".16"')
    s+=path('M255 600L500 510 745 600 500 689Z','url(#stone)','#a79e7b',4)
    if kind in ('thunderAltar','mysticDais','statue'):s+=sigil(500,595,185)
    s+=path('M500 42L623 292 567 577 500 631 430 572 382 292Z','#6ed8df','#d4f4de',4)
    s+=path('M500 42V631L430 572 382 292Z','#237f9e')
    s+=path('M500 42L623 292 500 372Z','#c3f2e6')
    s+=path('M500 372L623 292 567 577 500 631Z','#4eb6c8')
    for yy in [230,400,490]:s+=path(f'M440 {yy}l60 -18 60 18 -60 24Z','none','#e6cf93',6)
    return s

def portal():
    s=ellipse(500,639,300,33,'url(#stone)')
    s+=path('M259 625V241Q500 -57 741 241V625L672 605V261Q500 54 328 261V605Z','url(#rock)','#d8c492',8)
    s+=path('M330 611V269Q500 70 670 269V611Z','#123b56','#75c6c7',4)
    for n in range(5):s+=path(f'M{365+n*16} 556Q{590-n*15} 480 {430+n*25} 373T{560-n*10} 215','none','#83d8d6',2,extra='opacity=".5"')
    s+=sigil(500,634,190,'#d0b578')
    for x in [255,745]:s+=lantern(x,340,.75)
    return s

def rail():
    s=rect(10,285,980,78,'url(#stone)',9)+rect(10,145,980,32,'url(#stone)',5)
    for x in range(30,1000,110):
        s+=rect(x,128,25,210,'url(#wall)',4)+ellipse(x+12,123,23,10,'url(#gold)')
        s+=path(f'M{x+55} 185l30 45 -30 45 -30 -45Z','none','#a5b4a5',4)
    return s

def waterfall(kind):
    s=path('M240 95L480 25 740 100 680 190 310 190Z','url(#rock)')
    for n in range(9):
        x=300+n*46
        s+=path(f'M{x} 139Q{x-36} 320 {x+18} 470T{x-8} 680','none','url(#water)',23+n%3*5)
        s+=path(f'M{x+3} 150Q{x-20} 340 {x+23} 490','none','#e4fff2',2,extra='opacity=".6"')
    return s+ellipse(500,654,390,44,'url(#mist)')

def misc(kind):
    if kind in ('cloud','cloudRock'):
        s=ellipse(500,420,460,210,'url(#mist)')
        for x,y,r in [(250,400,180),(480,325,230),(735,405,180)]:s+=ellipse(x,y,r,r*.48,'url(#mist)',extra='opacity=".6"')
        return s
    if kind in ('rock','peak'):
        return path('M80 620L270 251 360 312 512 40 665 348 770 252 935 623 700 674 410 655Z','url(#rock)','#5a827f',3)+path('M512 40L490 440 360 600M270 251L300 529M770 252L735 590','none','#a8c1ad',4)
    if kind=='lantern':return group(lantern(0,0,1),500,125,4.6)
    if kind in ('board','stall','market','hubBazaar'):
        s=rect(200,280,600,300,'url(#wood)',8)+roof(120,100,760,185)+stairs(260,570,480,90)
        if kind=='board':
            s+=rect(260,320,480,210,'#e8d8b4',5)
            for x in [300,450,600]:s+=rect(x,350,95,140,'#fff0d0',3)+line(x+15,380,x+75,380,'#b79b70',3)+line(x+15,410,x+60,410,'#b79b70',3)
        else:
            for x in [250,380,510,640]:s+=rect(x,390,100,160,'#407f83',5)+lantern(x+50,300,.6)
        return s
    if kind in ('hubWell','forge'):
        s=ellipse(500,610,360,65,'url(#stone)')+path('M240 315Q500 250 760 315L704 590Q500 680 296 590Z','url(#rock)','#c8b47b',6)
        s+=ellipse(500,315,260,84,'url(#gold)')+ellipse(500,312,211,60,'url(#pool)')
        for x in [320,500,680]:s+=path(f'M{x} 384v160','none','#d8c18b',12)
        return s
    if kind=='guardianLion':
        return rect(140,574,720,90,'url(#stone)',9)+ellipse(500,432,240,170,'url(#rock)')+ellipse(395,259,170,160,'url(#stone)')+ellipse(340,247,13,16,'#315b65')+path('M250 343Q355 407 492 335M675 435Q865 205 832 445','none','#b8c9b8',25)+rect(278,490,105,110,'url(#stone)',20)+rect(576,490,105,110,'url(#stone)',20)
    if kind=='bridge':return group(rail(),0,170,1,.6)+path('M20 350L980 350 980 590 20 590Z','url(#stone)','#a3b5aa',3)+group(rail(),0,330,1,.6)
    return hall(kind)

manifest={}
for original in sorted((ROOT/'MAP/sprites').glob('*.png')):
    key=original.stem
    if key=='tile':
        body=rect(0,0,48,24,'#ede7d6')+path('M0 12L24 0 48 12 24 24ZM0 0L48 24M48 0L0 24','none','#c0b597',.4)
        svg=f'<svg xmlns="http://www.w3.org/2000/svg" width="768" height="384" viewBox="0 0 48 24">{body}</svg>'
    else:
        if key in ('moonCourt','moonDais','platform'):
            body=path('M35 250L500 32 965 250 500 476Z','url(#stone)','#c9b37d',6)+path('M70 250L500 55 930 250 500 453Z','none','#f8edcf',4)+sigil(500,250,300)
        elif key in ('greatIsland','island','arena'):body=island(key)
        elif key in ('tree','tree2','pineTree','whiteBlossom','sakura'):body=foliage(key)
        elif key in ('pond','lotusPond','garden','mysticGarden'):body=pool(key)
        elif key in ('crystalPillar','thunderAltar','mysticDais','statue'):body=crystal(key)
        elif key=='portal':body=portal()
        elif key=='bridgeRail':body=rail()
        elif key in ('waterfall','moonFall'):body=waterfall(key)
        elif key=='stairs':body=stairs(100,50,800,600)
        else:body=misc(key)
        # Fit native geometry instead of inheriting blank margins from the old atlas.
        box=(0,0,1000,700)
        if key in ('moonCourt','moonDais','platform'):box=(0,0,1000,500)
        elif key=='bridgeRail':box=(0,100,1000,260)
        elif key=='lantern':box=(350,80,300,620)
        elif key in ('crystalPillar','thunderAltar','mysticDais','statue'):box=(200,0,600,700)
        elif key in ('waterfall','moonFall'):box=(100,0,800,700)
        elif key in ('pond','lotusPond','garden','mysticGarden'):box=(0,210,1000,410)
        height=round(2048*box[3]/box[2])
        viewport=' '.join(map(str,box))
        svg=f'<svg xmlns="http://www.w3.org/2000/svg" width="2048" height="{height}" viewBox="{viewport}">{DEFS}{body}</svg>'
    (OUT/f'{key}.svg').write_text(svg,encoding='utf-8')
    manifest[key]=f'MAP/vector/{key}.svg'
for index,color in enumerate(['#6bbcc4','#93d9d0','#aaa0da','#d6c185']):
    (OUT/f'sigil-{index}.svg').write_text(f'<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="512" viewBox="0 0 1000 500">{sigil(500,250,425,color)}</svg>',encoding='utf-8')
(OUT/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf-8')
print(f'Built {len(manifest)} map assets + 4 ground sigils as native SVG; originals retained.')
