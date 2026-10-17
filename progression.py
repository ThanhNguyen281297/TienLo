"""Character level is independent of the fifteen cultivation realms."""
MAX_LEVEL = 200
POINTS_PER_LEVEL = 3
SKILL_LEVELS = (10, 20, 30, 40)
ATTRIBUTES = ('luc', 'the', 'nhanh', 'linh')


def required(level):
    n = max(1, min(MAX_LEVEL, level)) - 1
    return 100 + 45 * n + 12 * n * n


def level(player):
    return player.get('level', min(MAX_LEVEL, int(player['r']) * 10 + int(player['stage'])))


def normalize(player):
    # Legacy cultivation XP remains untouched. Existing characters keep a level
    # corresponding to their attained realm/stage, with a fresh level EXP bar.
    player.setdefault('level', level(player))
    player.setdefault('levelXp', 0)
    world = player.setdefault('world', {})
    attrs = world.setdefault('attrs', dict.fromkeys(ATTRIBUTES, 0))
    world.setdefault('attrPoints', 0)
    rank = player['level']
    credited = world.get('attributeLevel')
    if credited is None:
        # Keep legacy allocations and surplus. Only top up to the new budget.
        spent = sum(attrs.get(key, 0) for key in ATTRIBUTES)
        world['attrPoints'] += max(0, (rank - 1) * POINTS_PER_LEVEL - spent - world['attrPoints'])
        world['attributeLevel'] = rank
    elif rank > credited:
        world['attrPoints'] += (rank - credited) * POINTS_PER_LEVEL
        world['attributeLevel'] = rank
    world['learnedSkills'] = [rank >= minimum for minimum in SKILL_LEVELS]
    return player


def validate(player):
    rank, xp = level(player), player.get('levelXp', 0)
    if type(rank) is not int or not 1 <= rank <= MAX_LEVEL:
        raise ValueError('Cấp nhân vật không hợp lệ.')
    if type(xp) is not int or not 0 <= xp < required(rank) or (rank == MAX_LEVEL and xp != 0):
        raise ValueError('EXP cấp nhân vật không hợp lệ.')
