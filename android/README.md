# Android online client (test APK)

The client opens `https://tienlo2d.xyz/` in Android System WebView. It runs the same Canvas renderer, art, combat, APIs and SQLite saves as the web version; no second copy of game assets or account database is bundled. Web deployments take effect on the next launch/reload without rebuilding the APK. Internet is required; a newer login still replaces the previous session, as on web.

Android 8.0+ (API 26), current Android System WebView, landscape sensor orientation, immersive fullscreen and notch/keyboard insets. Android may override orientation on tablets/foldables; the responsive web layout remains usable. Back closes a game dialog first, then asks before exiting. Main-page network failures show a retry button.

## Build on Windows

Install JDK 17+, Android SDK platform 36 and build-tools 36.0.0, then:

```powershell
powershell -ExecutionPolicy Bypass -File android/build.ps1
# Optional custom SDK:
powershell -ExecutionPolicy Bypass -File android/build.ps1 -SdkRoot C:/Android/Sdk
```

Output: `dist/TienLo-Android-test.apk`. The build script uses the official SDK tools directly (aapt2, javac, D8, zipalign, apksigner); this small app has no third-party Java dependencies.

This is a sideload test build, signed with a persistent local test key at `%USERPROFILE%/.android/tienlo-test.keystore` (standard test password `android`), outside Git. Keep the key to install future test builds over this one. Do not use this test certificate to publish on Google Play; production distribution requires a separate protected release/upload key, version codes, device testing and store configuration. No private signing material is committed or deployed to the web server.

App navigation permits only the exact HTTPS game origin internally. External HTTP(S) links open the browser; file/content access, cleartext, mixed content and third-party cookies are disabled. No JavaScript-to-native bridge or storage/camera/location permission is exposed. TLS failures are never bypassed. Cookie storage is the WebView's normal first-party store; characters remain on the server.
