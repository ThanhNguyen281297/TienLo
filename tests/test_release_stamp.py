"""Release stamping must invalidate code caches without modifying assets or data."""
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
ROOT=Path(__file__).resolve().parents[1]
class ReleaseStampTest(unittest.TestCase):
    def test_repeat_stamping_and_unchanged_data(self):
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory)
            (root/'index.html').write_text('<script src="js/app.js"></script><link href="css/style.css?v=old"><img src="MAP/asset.png">',encoding='utf-8')
            (root/'data').mkdir();(root/'data/save').write_text('keep',encoding='utf-8')
            def stamp(sha):return subprocess.run([sys.executable,str(ROOT/'deploy/stamp-release.py'),sha,'--root',str(root)],capture_output=True,check=False)
            self.assertEqual(stamp('a'*40).returncode,0);self.assertEqual(stamp('b'*40).returncode,0)
            text=(root/'index.html').read_text(encoding='utf-8')
            self.assertEqual(text.count('?v='+'b'*40),2)
            self.assertIn('src="MAP/asset.png"',text)
            self.assertEqual((root/'data/save').read_text(), 'keep')
            before=text;self.assertNotEqual(stamp('../bad').returncode,0);self.assertEqual((root/'index.html').read_text(),before)
if __name__=='__main__':unittest.main()
