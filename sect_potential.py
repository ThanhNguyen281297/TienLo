"""Sect identity for potential (attribute) points: per-sect attribute coefficients and base
stats. Shared with the client copy in js/25e-sect-potential.js (kept equal by a test)."""
import json
from pathlib import Path

RULES = json.loads((Path(__file__).parent / 'Character' / 'sect-potential.json').read_text(encoding='utf-8'))


def sect(player):
    ap = player.get('ap') if isinstance(player, dict) else None
    w = ap.get('w') if isinstance(ap, dict) else None
    return RULES['sects'][w] if type(w) is int and 0 <= w < len(RULES['sects']) else None


def coef(player, attr, key):
    s = sect(player) or {}
    return s.get('attr', {}).get(attr, {}).get(key, RULES['base'][attr].get(key, 0))


def stat(player, key, default=0):
    s = sect(player)
    return s['stats'].get(key, default) if s else default


def attr(player, name):
    value = player.get('world', {}).get('attrs', {}).get(name, 0)
    return max(0, min(1000, value)) if type(value) in (int, float) else 0


def crit_chance(player, extra=0):
    return min(stat(player, 'critCap', .35), max(0, stat(player, 'crit') + attr(player, 'nhanh') * coef(player, 'nhanh', 'crit') + extra))
