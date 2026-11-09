"""The game ships pixel art: a painted '<name>.png' may only exist as '<name>.px.png'."""
from pathlib import Path
def art(root,rel):
    p=Path(root)/rel
    return p if p.exists() else p.with_name(p.name[:-4]+'.px.png') if p.name.endswith('.png') else p
