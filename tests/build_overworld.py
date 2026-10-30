"""Write the small shared gameplay manifest, not generated art."""
import json
from pathlib import Path
root=Path(__file__).resolve().parents[1]
# Per-zone camp layouts; they match the terrain in js/17c-tien-hiep-layouts.js.
CAMPS={'field-meadow':[(440,1320),(1520,1320),(420,880),(1530,880),(520,380),(1460,380)],
 'field-bamboo':[(480,1390),(1480,1360),(420,760),(1160,860),(650,330),(1450,340)],
 'field-marsh':[(400,1360),(1600,1350),(300,820),(1650,780),(560,300),(1430,280)],
 'field-frost':[(450,1330),(1550,1300),(380,860),(1600,840),(600,380),(1400,350)],
 'field-ember':[(450,1380),(1550,1380),(430,820),(1560,820),(560,320),(1440,320)],
 'field-abyss':[(430,1420),(1560,1420),(420,860),(1580,860),(560,330),(1440,330)]}
data=dict(size=2000,spawn=dict(x=1000,y=1770),camps=[dict(x=x,y=y) for x,y in [(440,1320),(1500,1320),(430,850),(1500,850),(550,370),(1430,370)]],maps=[
 dict(id='field-meadow',name='Thanh Phong Nguyên',level=1,entry=1,theme='mystic',color='#b0d68d',species=['BoNgua','Tho'],ground='meadow'),
 dict(id='field-bamboo',name='Trúc Hải U Cốc',level=8,entry=6,theme='valley',color='#82bea0',species=['Nhen','Doi','BoCanhVang'],ground='meadow'),
 dict(id='field-marsh',name='Vân Mộng Trạch',level=18,entry=15,theme='moon',color='#8dc8d3',species=['Ech','SuaQuy','RongNuoc'],ground='meadow'),
 dict(id='field-frost',name='Hàn Sương Lĩnh',level=30,entry=25,theme='thunder',color='#b4d7ed',species=['Soi','TeGiac','Doi'],ground='frost'),
 dict(id='field-ember',name='Xích Diệm Hoang',level=45,entry=40,theme='arena',color='#d8ac86',species=['BoCap','DungNham','TrauQuy'],ground='ember'),
 dict(id='field-abyss',name='U Minh Cổ Địa',level=65,entry=60,theme='worldboss',color='#b5a1ca',species=['QuyLiem','RongXuong','PhuongHoang'],ground='ember')])
for m in data['maps']:m['camps']=[dict(x=x,y=y) for x,y in CAMPS[m['id']]]
(root/'Map/overworld.json').write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
(root/'js/35r-overworld-rules.js').write_text('/* Shared with the authoritative outdoor map server. */\nwindow.overworldRules='+json.dumps(data,ensure_ascii=False,separators=(',',':'))+';\n',encoding='utf-8')
