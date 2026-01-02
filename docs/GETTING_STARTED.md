# Getting Started with Bible Reader

## Quick Setup

### Prerequisites
- Node.js 14+ and npm
- Any modern web browser

### Local Installation
```bash
# Clone or download the repository
cd bible-reader-1

# Install dependencies
npm install

# Start development server
npm start
```
The app opens at `http://localhost` with automatic reload on file changes.

## Using the App

### Reading Plans
1. Select a reading plan (Canonical or Chronological)
2. Click on a chapter to mark it as read
3. Progress is saved automatically to your browser

### Bilingual Reading
- Use the language toggle to switch between English and Tamil
- Verse references appear in both languages
- Selected verses are from curated Bible passages

### Offline Mode
- The app works completely offline
- All verses, plans, and progress are cached
- No internet connection needed after first load

### Import/Export Progress
- Export your reading history as JSON
- Share progress across devices
- Import previously saved progress

## Building for Production

```bash
npm run build
```

Output is ready for static hosting:
- No backend required
- No environment variables needed
- Deploy to Netlify, Vercel, GitHub Pages, or any static host

## File Structure

- `index.html` - Main app interface
- `script.js` - Core app logic
- `service-worker.js` - Offline support
- `data/verses.json` - English verses
- `data/verses-ta.json` - Tamil verses
- `data/reading-plan-*.json` - Reading schedules

## Customization

### Adding Verses
Edit `data/verses.json` and `data/verses-ta.json`:
```json
{
  "ref": "Genesis 1:1",
  "text": "In the beginning God created..."
}
```

### Modifying Plans
Run scripts to regenerate:
```bash
node scripts/generate-plans.js
node scripts/generate-chronological.js
```

## Troubleshooting

**App not loading offline?**
- Clear browser cache
- Ensure service-worker.js was registered
- Check browser console for errors

**Progress not saving?**
- Verify localStorage is enabled
- Check browser's storage quota
- Try exporting/importing data

**Verses not displaying?**
- Confirm JSON files are in `data/` folder
- Check browser console for parse errors
- Validate JSON syntax

## Support

For issues or questions:
1. Check the README.md for feature details
2. Review code comments in script.js
3. Inspect browser console (F12) for errors

## Next Steps

- Customize verses for your community
- Adjust reading plan duration
- Add your own church branding
- Deploy to production
