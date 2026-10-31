#!/usr/bin/env bash
# Linux/CI build of the Android online client (same steps as build.ps1).
# Output: dist/TienLo-Android.apk. Signing key: $TIENLO_KEYSTORE (created once if missing).
set -euo pipefail
SDK="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-}}"; [[ -d "$SDK" ]] || { echo 'ANDROID_HOME not set' >&2; exit 1; }
ROOT="$(cd "$(dirname "$0")/.." && pwd)"; HERE="$ROOT/android"; OUT="$ROOT/dist/android-build"
TOOLS="$(ls -d "$SDK"/build-tools/* | sort -V | tail -1)"
PLATFORM="$(ls -d "$SDK"/platforms/android-* | sort -V | tail -1)/android.jar"
KEY="${TIENLO_KEYSTORE:-$HOME/.android/tienlo-test.keystore}"
rm -rf "$OUT"; mkdir -p "$OUT/generated" "$OUT/classes" "$OUT/dex" "$ROOT/dist"
"$TOOLS/aapt2" compile --dir "$HERE/app/res" -o "$OUT/compiled.zip"
"$TOOLS/aapt2" link -I "$PLATFORM" --manifest "$HERE/app/AndroidManifest.xml" --java "$OUT/generated" -o "$OUT/unsigned.apk" "$OUT/compiled.zip"
javac -encoding UTF-8 --release 8 -classpath "$PLATFORM" -d "$OUT/classes" $(find "$HERE/app/src" "$OUT/generated" -name '*.java')
"$TOOLS/d8" --lib "$PLATFORM" --min-api 26 --output "$OUT/dex" $(find "$OUT/classes" -name '*.class')
(cd "$OUT/dex" && jar uf "$OUT/unsigned.apk" classes.dex)
"$TOOLS/zipalign" -f 4 "$OUT/unsigned.apk" "$OUT/aligned.apk"
mkdir -p "$(dirname "$KEY")"
[[ -f "$KEY" ]] || keytool -genkeypair -keystore "$KEY" -alias tienlo-test -keyalg RSA -keysize 2048 -validity 10000 \
  -storepass android -keypass android -dname 'CN=TienLo Test,O=TienLo,C=VN'
"$TOOLS/apksigner" sign --ks "$KEY" --ks-key-alias tienlo-test --ks-pass pass:android --key-pass pass:android --out "$ROOT/dist/TienLo-Android.apk" "$OUT/aligned.apk"
"$TOOLS/apksigner" verify "$ROOT/dist/TienLo-Android.apk"
sha256sum "$ROOT/dist/TienLo-Android.apk"
