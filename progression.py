"""Character level is independent of the fifteen cultivation realms."""
MAX_LEVEL = 200


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
    return player


def validate(player):
    rank, xp = level(player), player.get('levelXp', 0)
    if type(rank) is not int or not 1 <= rank <= MAX_LEVEL:
        raise ValueError('Cấp nhân vật không hợp lệ.')
    if type(xp) is not int or not 0 <= xp < required(rank) or (rank == MAX_LEVEL and xp != 0):
        raise ValueError('EXP cấp nhân vật không hợp lệ.')
