"""Keep bounded code releases; never prune the active release or account data."""
import argparse
import json
import os
from pathlib import Path
import re
import shutil


def prune(root, current, keep=5, incoming=None, apply=False):
    root = Path(root).absolute()
    if root.is_symlink() or root.resolve() != root or not root.is_dir():
        raise ValueError('Release root must be an existing physical directory')
    active = Path(current).resolve(strict=True)
    if active.parent != root or not active.is_dir():
        raise ValueError('Active release must be directly inside the release root')
    if keep < 2 or (incoming and not re.fullmatch(r'[0-9a-f]{40}', incoming)):
        raise ValueError('Keep at least two releases and use a full commit SHA')
    protected = {active.name}
    if incoming:
        protected.add(incoming)
    candidates = []
    skipped = []
    for path in root.iterdir():
        if not re.fullmatch(r'[0-9a-f]{40}', path.name) or path.is_symlink() or not path.is_dir():
            continue
        if hasattr(os, 'getuid') and path.stat().st_uid != os.getuid():
            skipped.append(path.name)
            continue
        candidates.append(path)
    candidates.sort(key=lambda p: p.stat().st_mtime, reverse=True)
    for path in candidates:
        if len(protected) >= keep:
            break
        protected.add(path.name)
    removed = []
    for path in candidates:
        if path.name in protected:
            continue
        # Fail closed on unexpected runtime data or links in a historical release.
        if any(p.is_symlink() or p.name in ('data', 'backups') or
               p.suffix.lower() in ('.db', '.sqlite', '.sqlite3') or
               p.name.endswith(('-wal', '-shm')) for p in path.rglob('*')):
            skipped.append(path.name)
            continue
        if path.resolve() != path or path.parent != root or path == Path(current).resolve(strict=True):
            raise ValueError('Refusing to remove an unsafe or active release')
        if apply:
            shutil.rmtree(path)
        removed.append(path.name)
    return dict(apply=apply, removed=removed, retained=sorted(protected), skipped=skipped)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', default='/opt/tienlo-releases')
    parser.add_argument('--current', default='/opt/tienlo')
    parser.add_argument('--keep', type=int, default=5)
    parser.add_argument('--incoming')
    parser.add_argument('--apply', action='store_true', help='Delete the planned old code releases')
    args = parser.parse_args()
    result = prune(args.root, args.current, args.keep, args.incoming, args.apply)
    print(json.dumps(result))


if __name__ == '__main__':
    main()
