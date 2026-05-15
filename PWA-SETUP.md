# Battleship PWA Setup

Your Battleship game is now a Progressive Web App (PWA)!

## What's Been Added

✅ **manifest.json** - App configuration and metadata  
✅ **service-worker.js** - Enables offline play and caching  
✅ **PWA meta tags** - Added to index.html  
✅ **Icon generator** - create-icons.html

## Creating App Icons

1. Open `create-icons.html` in your browser
2. Two icon files will download automatically:
   - `icon-192.png` (192x192)
   - `icon-512.png` (512x512)
3. Move both icons to the game folder (ClaudeBattleship)

**OR** create your own custom icons (PNG format) at those sizes.

## Testing the PWA

### On Desktop (Chrome/Edge)
1. Open `index.html` in Chrome or Edge
2. Look for the install icon (⊕) in the address bar
3. Click "Install" to add to desktop

### On Android
1. **IMPORTANT**: PWAs must be served over HTTPS or localhost
2. Options to test:
   
   **Option A: Local Server (Recommended)**
   ```bash
   # In the game folder, run:
   python -m http.server 8000
   # Or if you have Node.js:
   npx http-server -p 8000
   ```
   Then open `http://localhost:8000` on your Android device

   **Option B: Deploy to a web host**
   - Upload files to: GitHub Pages, Netlify, Vercel, or Firebase Hosting (all free)
   - Visit the URL on your Android device
   
3. On Android Chrome:
   - Open the game URL
   - Tap the menu (⋮)
   - Select "Add to Home screen" or "Install app"
   - The app icon appears on your home screen!

## Features

✅ **Works offline** - Play without internet after first load  
✅ **App-like experience** - No browser UI when installed  
✅ **Home screen icon** - Launches like a native app  
✅ **Auto-updates** - Game updates when you refresh  
✅ **Cross-platform** - Works on Android, iOS, Windows, Mac

## Deploying to the Web

### GitHub Pages (Free & Easy)
1. Create a GitHub repository
2. Upload all files from ClaudeBattleship folder
3. Enable GitHub Pages in repository settings
4. Your game will be at: `https://yourusername.github.io/repository-name`

### Netlify (Free - Drag & Drop)
1. Go to netlify.com
2. Drag the ClaudeBattleship folder onto Netlify
3. Get instant URL: `https://random-name.netlify.app`

## File Structure
```
ClaudeBattleship/
├── index.html
├── style.css
├── app.js
├── manifest.json          (NEW - PWA config)
├── service-worker.js      (NEW - offline support)
├── icon-192.png          (NEEDED - generate or create)
├── icon-512.png          (NEEDED - generate or create)
└── create-icons.html     (NEW - icon generator)
```

## Notes

- The game saves statistics in browser localStorage (works offline!)
- Service worker caches the game for instant loading
- Icons can be customized - just replace the PNG files
- PWA works on all modern browsers

## Troubleshooting

**"Add to Home Screen" not showing?**
- Make sure you're using HTTPS or localhost
- Check browser console for service worker errors
- Try incognito/private mode

**Icons not appearing?**
- Generate icons using create-icons.html
- Or create your own PNG files at the required sizes
- Make sure icons are in the same folder as index.html

Enjoy your Battleship PWA! 🚢
