# TradeForge — Build APK for Android

You have 2 ways to get TradeForge on your phone:

## Option 1: Expo Go (instant, 30 seconds) — Recommended for testing

No build needed. Works right now.

1. Install **Expo Go** from Play Store: https://play.google.com/store/apps/details?id=host.exp.exponent
2. In TradeForge folder, run:
```bash
npm install
npx expo start --tunnel
```
3. You'll see a QR code in terminal. Scan it with Expo Go app.
4. App loads instantly on your phone.

> In this sandbox, tunnel may need ngrok. If QR doesn't show, use:
> `npx expo start --tunnel --clear`

**Pros:** instant, hot-reload, no build wait
**Cons:** needs Expo Go app, not a standalone APK

---

## Option 2: Real APK (standalone, installable) — What you asked for

This builds a real `.apk` file you can share/install without Expo Go.

### Prerequisites
- Free Expo account: https://expo.dev/signup
- `eas-cli` installed

### Steps (one-time setup)

```bash
cd TradeForge

# 1. Install EAS CLI
npm install -g eas-cli
# or use npx eas-cli

# 2. Login to Expo (browser will open)
eas login

# 3. Link project (creates projectId in app.json)
eas init
# When asked: "Would you like to create a project?" → Yes

# 4. Configure build
eas build:configure
```

### Build APK

```bash
# Preview build = APK (not AAB)
eas build --platform android --profile preview

# It will:
# - Upload to EAS cloud
# - Build in cloud (15-20 mins)
# - Give you a download link for .apk
```

When build finishes:
- You'll get a URL like `https://expo.dev/artifacts/eas/xxxx.apk`
- Download on phone → Install → Allow unknown sources
- TradeForge runs standalone!

### Build Profiles (eas.json)

We already created `eas.json` for you:

- `development` → dev client with hot reload
- `preview` → **APK** for internal testing (what you want)
- `production` → AAB for Play Store

### Update app.json after eas init

After `eas init`, your `app.json` will have a real projectId like:
```json
"extra": {
  "eas": {
    "projectId": "a1b2c3d4-..."
  }
}
```
Commit this file.

### Troubleshooting

- `An Expo user account is required` → run `eas login`
- Build fails on icons → check `assets/icon.png` is 1024x1024 (yours is placeholder, but works)
- Want faster local build? Needs Android SDK + `eas build --local` (not recommended in this sandbox)

### Next: Play Store

When ready for store:
```bash
eas build --platform android --profile production
# Creates .aab, then:
eas submit --platform android
```
