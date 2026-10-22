import importlib.util
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest

spec = importlib.util.spec_from_file_location('prune', Path(__file__).resolve().parents[1] / 'deploy/prune-releases.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class PruneTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name).resolve() / 'releases'
        self.root.mkdir()
        self.releases = []
        for n in range(1, 8):
            path = self.root / f'{n:040x}'
            path.mkdir()
            (path / 'index.html').write_text('game')
            os.utime(path, (1000 + n, 1000 + n))
            self.releases.append(path)
        self.active = self.releases[0]

    def test_active_oldest_and_incoming_are_protected(self):
        incoming = f'{8:040x}'
        result = module.prune(self.root, self.active, keep=3, incoming=incoming)
        self.assertEqual(set(result['retained']), {self.active.name, incoming, self.releases[-1].name})
        self.assertEqual(len(result['removed']), 5)

    def test_default_is_dry_run(self):
        result = module.prune(self.root, self.active, keep=3)
        self.assertEqual(len(result['removed']), 4)
        self.assertTrue(all(path.exists() for path in self.releases))

    def test_apply_keeps_active_and_newest_rollbacks(self):
        result = module.prune(self.root, self.active, keep=3, apply=True)
        self.assertEqual(len(result['removed']), 4)
        self.assertEqual({p.name for p in self.root.iterdir()}, {self.active.name, self.releases[-1].name, self.releases[-2].name})

    def test_runtime_data_is_never_deleted(self):
        old = self.releases[1]
        (old / 'accounts.sqlite3').write_bytes(b'database')
        os.utime(old, (1002, 1002))
        result = module.prune(self.root, self.active, keep=2, apply=True)
        self.assertIn(old.name, result['skipped'])
        self.assertTrue((old / 'accounts.sqlite3').exists())

    def test_unknown_folders_are_untouched(self):
        extra = self.root / 'operator-backup'
        extra.mkdir()
        module.prune(self.root, self.active, keep=2, apply=True)
        self.assertTrue(extra.exists())

    def test_active_outside_root_fails_without_deleting(self):
        with self.assertRaises(ValueError):
            module.prune(self.root, self.root.parent, keep=2, apply=True)
        self.assertTrue(all(path.exists() for path in self.releases))

    def test_symlink_targets_are_untouched(self):
        outside = self.root.parent / 'outside'
        outside.mkdir()
        link = self.root / ('f' * 40)
        try:
            link.symlink_to(outside, target_is_directory=True)
        except OSError:
            self.skipTest('Creating symlinks requires privileges on this host')
        module.prune(self.root, self.active, keep=2, apply=True)
        self.assertTrue(outside.exists())
        self.assertTrue(link.is_symlink())

    def test_removing_old_hardlinks_preserves_active_asset(self):
        asset = self.active / 'asset.png'
        asset.write_bytes(b'unchanged bitmap')
        os.link(asset, self.releases[1] / 'asset.png')
        os.utime(self.releases[1], (1002, 1002))
        module.prune(self.root, self.active, keep=2, apply=True)
        self.assertEqual(asset.read_bytes(), b'unchanged bitmap')
        self.assertFalse(self.releases[1].exists())

    @unittest.skipUnless(shutil.which('rsync'), 'rsync is required for the Linux deployment test')
    def test_rsync_reuses_unchanged_assets_despite_checkout_timestamps(self):
        source, base, target = [self.root.parent / name for name in ('source', 'base', 'target')]
        for directory in (source, base, target):
            directory.mkdir()
        for directory in (source, base):
            (directory / 'same.png').write_bytes(b'unchanged bitmap')
        (base / 'changed.png').write_bytes(b'old')
        (source / 'changed.png').write_bytes(b'new')
        for path in base.iterdir():
            path.chmod(0o644)  # Match permissions of existing production releases.
            os.utime(path, (1000, 1000))
        os.utime(source / 'same.png', (2000, 2000))
        os.utime(source / 'changed.png', (1000, 1000))
        subprocess.run(['rsync', '-az', '--checksum', '--no-times', '--chmod=D755,F644',
                        '--link-dest=' + str(base), str(source) + '/', str(target) + '/'], check=True)
        self.assertTrue(os.path.samefile(base / 'same.png', target / 'same.png'))
        self.assertFalse(os.path.samefile(base / 'changed.png', target / 'changed.png'))
        self.assertEqual((base / 'changed.png').read_bytes(), b'old')
        self.assertEqual((target / 'changed.png').read_bytes(), b'new')


if __name__ == '__main__':
    unittest.main()
