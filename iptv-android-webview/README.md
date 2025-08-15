# IPTV Android WebView Player

Android app that wraps a WebView to play HLS (m3u8) streams using a local HTML5 UI (hls.js). It can append auto-generated tokens to URLs and fail over across multiple servers.

## Features
- WebView-based HTML5 player using hls.js
- Token generation modes: `timestamp` or `sha256(ts + path + key)`
- Multiple server inputs with auto-failover
- Autoplay without user gesture

## Build
1. Ensure you have Android SDK 34 and JDK 17 installed.
2. From project root:

```bash
./gradlew assembleDebug
```

3. Install the APK found at `app/build/outputs/apk/debug/app-debug.apk`.

## Usage
- Enter the base m3u8 URL (e.g., `https://origin.example.com/live/channel.m3u8`).
- Optionally enter a token key and choose `sha256` to compute `sig` with `sig = sha256(path + ts + key)`.
- Add backup servers as comma-separated base URLs (e.g., `https://edge1.example.com, https://edge2.example.com`).
- Tap Play. The app will try the base, then automatically fail over to each backup if playback fails.

## Notes
- If your token format differs, adjust token generation in `assets/index.html`.
- If your servers require HTTPS only, you may set `usesCleartextTraffic=false` and remove the custom network security config.