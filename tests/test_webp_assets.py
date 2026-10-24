"""WebP twins listed in js/00-webp-manifest.js exist and match their PNG pixel size."""
import json
import struct
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def png_size(data):
    return struct.unpack('>II', data[16:24])


def webp_size(data):
    assert data[:4] == b'RIFF' and data[8:12] == b'WEBP', 'not a WebP file'
    chunk = data[12:16]
    if chunk == b'VP8X':
        return int.from_bytes(data[24:27], 'little') + 1, int.from_bytes(data[27:30], 'little') + 1
    if chunk == b'VP8L':
        bits = int.from_bytes(data[21:25], 'little')
        return (bits & 0x3FFF) + 1, ((bits >> 14) & 0x3FFF) + 1
    if chunk == b'VP8 ':
        return struct.unpack('<H', data[26:28])[0] & 0x3FFF, struct.unpack('<H', data[28:30])[0] & 0x3FFF
    raise AssertionError('unknown WebP chunk ' + repr(chunk))


class WebpAssets(unittest.TestCase):
    def test_manifest_twins_exist_and_keep_png_size(self):
        text = (ROOT / 'js/00-webp-manifest.js').read_text(encoding='utf-8')
        paths = json.loads(text.split('=', 1)[1].strip().rstrip(';'))
        self.assertGreater(len(paths), 500)
        for path in paths:
            with self.subTest(path=path):
                png = ROOT / path
                webp = png.with_suffix('.webp')
                self.assertTrue(png.is_file() and webp.is_file())
                self.assertEqual(webp_size(webp.read_bytes()[:40]), png_size(png.read_bytes()[:24]))

    def test_bundler_keeps_every_script_in_order(self):
        import re
        import shutil
        import subprocess
        import sys
        import tempfile
        html = (ROOT / 'index.html').read_text(encoding='utf-8')
        scripts = re.findall(r'<script src="(js/[^"?]+)', html)
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            shutil.copy(ROOT / 'index.html', root / 'index.html')
            shutil.copytree(ROOT / 'js', root / 'js')
            subprocess.run([sys.executable, str(ROOT / 'deploy/bundle-release.py'), '--root', str(root)], check=True, capture_output=True)
            out = (root / 'index.html').read_text(encoding='utf-8')
            self.assertEqual(re.findall(r'<script src="(js/[^"?]+)', out), ['js/boot.bundle.js', 'js/app.bundle.js'])
            bundled = re.findall(r'^/\* (js/[^ ]+) \*/$', (root / 'js/boot.bundle.js').read_text(encoding='utf-8') + (root / 'js/app.bundle.js').read_text(encoding='utf-8'), re.M)
            self.assertEqual(bundled, scripts)


if __name__ == '__main__':
    unittest.main()
