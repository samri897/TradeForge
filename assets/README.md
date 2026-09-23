# Assets

Place Expo assets here:

- `icon.png` — 1024×1024 app icon
- `splash.png` — splash screen
- `adaptive-icon.png` — Android adaptive foreground
- `favicon.png` — web favicon
- `notification-icon.png` — 96×96 white-on-transparent for Android notifications

Until you add real artwork, Expo will warn but the JS bundle still runs.
You can generate placeholders with:

```bash
# solid-color placeholders (requires ImageMagick)
convert -size 1024x1024 xc:'#0B0E11' icon.png
convert -size 1284x2778 xc:'#0B0E11' splash.png
convert -size 1024x1024 xc:'#0B0E11' adaptive-icon.png
convert -size 48x48 xc:'#2962FF' favicon.png
convert -size 96x96 xc:none -fill white -draw 'circle 48,48 48,8' notification-icon.png
```
