# Bible Reader PWA

## Overview
Bible Reader is a Progressive Web App for Bible reading with multilingual support, reading plan tracking, and offline functionality. Features authenticated Bible verses in English and Tamil (TAOVBSI translation).

## Features
- **Bible Verses**: 75 curated verses with authentic TAOVBSI Tamil translations, sourced from bible.com
- **Bilingual Support**: English and Tamil side-by-side verse display
- **Reading Plans**: Canonical and chronological Bible reading plans with progress tracking
- **Offline First**: Full offline support via service-worker.js for cached content
- **PWA**: Installable web app with offline cache and responsive design
- **Import/Export**: Save and restore reading progress as JSON

## Project Structure
```
.
├── index.html              # Main UI
├── script.js               # Logic: plans, progress tracking, language switching
├── service-worker.js       # Offline cache strategy
├── style.css               # Responsive styling
├── manifest.webmanifest    # PWA metadata
├── data/
│   ├── verses.json         # 75 English verses
│   ├── verses-ta.json      # 75 Tamil (TAOVBSI) verses
│   ├── reading-plan-canonical.json
│   ├── reading-plan-chronological.json
│   └── embedded-plans.js   # Embedded plan data
├── icons/                  # App icons for PWA
├── scripts/
│   ├── generate-plans.js   # Generate reading plans
│   └── generate-chronological.js
├── netlify.toml            # Build config
└── README.md
```

## Getting Started

### Install & Run Locally
```bash
npm install
npm start
```
Opens the app on `http://localhost` with live reload.

### Build
```bash
npm run build
```
Prepares assets for deployment.

## Features in Detail

### Reading Tracker
- Track progress through canonical or chronological reading plans
- Visual progress bars show completion status
- Save progress to browser localStorage
- Import/export reading history as JSON

### Bilingual Verses
- Switch between English and Tamil translations
- View verses side-by-side or in single language
- 75 carefully selected verses for reflection
- Tamil verses authenticated from bible.com TAOVBSI version 339

### Offline Support
- Entire app works without internet connection
- Service worker caches all essential assets
- Reading plans and verses available offline
- Progress syncs when connection returns

## Data Sources
- **Verses**: English (KJV/standard translations), Tamil (O.V. BSI - TAOVBSI from bible.com v339)
- **Plans**: Generated from complete Bible canon (66 books)
- **Icons**: Optimized for all device sizes

## Deployment

### Netlify
```
npm install
npm run build
```
Deploy the root directory. Static hosting works for this PWA.

### Environment
No secrets required. The app works entirely with static JSON data.

## Browser Support
- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers with PWA support

## Contributing
Pull requests welcome. Maintain consistent JSON formatting for verse data.

## License
MIT License - Copyright (c) 2026 Faith Church Ministries / Vinodh Sukumar Victor

See [LICENSE](LICENSE) for full text.
