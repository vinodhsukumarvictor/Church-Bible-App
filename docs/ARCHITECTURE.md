# Architecture Overview

## Core Technology Stack

- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Offline**: Service Worker API
- **Storage**: Browser localStorage + IndexedDB (via Service Worker cache)
- **Format**: JSON for all data
- **PWA**: Web App Manifest

## Application Flow

```
User Browser
    ↓
index.html (UI Structure)
    ↓
script.js (Main Logic)
    ├── Parse reading plans from JSON
    ├── Load verse data
    ├── Manage UI state & events
    ├── Handle language switching
    └── Persist progress to localStorage
    ↓
service-worker.js (Offline Support)
    ├── Cache app shell on first load
    ├── Intercept network requests
    ├── Serve cached content offline
    └── Update cache on new versions
    ↓
data/ (Static JSON)
    ├── verses.json (English)
    ├── verses-ta.json (Tamil)
    └── reading-plan-*.json
```

## Key Components

### 1. Reading Plan Management
**File**: `script.js` (lines: plan loading, chapter tracking)

- Loads JSON plan files asynchronously
- Tracks completed chapters in localStorage
- Computes progress percentages
- Supports multiple plan formats

**Data Flow**:
```
reading-plan-canonical.json
        ↓
Parse chapter list
        ↓
Store selected plan in memory
        ↓
Calculate progress from localStorage
        ↓
Render UI with visual progress
```

### 2. Bilingual Verse Display
**File**: `script.js` (language toggle logic)

- Maintains two verse JSON sources
- Synchronizes selection across languages
- Caches both versions in memory
- Switches display without reloading

**Data Structure**:
```json
{
  "ref": "Book Chapter:Verse",
  "text": "Verse content in respective language"
}
```

### 3. Offline Caching
**File**: `service-worker.js`

**Cache Strategy**: Cache-First with Network Fallback

1. User first visits → Service Worker installs
2. Service Worker caches:
   - HTML, CSS, JS files
   - All JSON data files
   - Essential icons
3. Subsequent visits:
   - Check cache first (instant)
   - Try network in background
   - Update cache if new version available

**Cache Layers**:
- **Static Cache**: App shell (HTML, CSS, JS)
- **Data Cache**: JSON files (verses, plans)
- **Image Cache**: Icons and assets

### 4. Progress Persistence
**File**: `script.js`

**Storage Method**: Browser localStorage

**Data Format**:
```json
{
  "plan": "canonical|chronological",
  "completedChapters": ["GEN1", "GEN2", ...],
  "lastUpdated": "2026-01-02T..."
}
```

**Sync**: Automatic on chapter click, no explicit save needed

### 5. UI State Management
**File**: `script.js`

**State Variables**:
- Current reading plan selection
- Active verse display
- Language preference
- Chapter completion status
- Expanded/collapsed sections

**Event Handling**:
- Click handlers for chapter selection
- Language toggle button
- Plan selection radio buttons
- Import/export buttons

## Data Files

### `/data/verses.json`
```json
[
  {
    "ref": "Genesis 1:1",
    "text": "In the beginning God created the heavens and the earth..."
  }
  // 75 verses total
]
```

### `/data/verses-ta.json`
```json
[
  {
    "ref": "ஆதியாகமம் 1:1",
    "text": "ஆதியிலே தேவன் வானத்தையும் பூமியையும் உண்டாக்கினார்..."
  }
  // Same 75 verses in Tamil (TAOVBSI)
]
```

### `/data/reading-plan-canonical.json`
```json
{
  "name": "Canonical Reading Plan",
  "duration": 365,
  "chapters": [
    "Genesis 1",
    "Genesis 2",
    // ... complete Bible in order
  ]
}
```

## Browser APIs Used

| API | Purpose | Fallback |
|-----|---------|----------|
| Service Worker | Offline caching | Online only |
| localStorage | Progress saving | Session only |
| Web App Manifest | Install prompt | Web bookmark |
| Fetch API | Network requests | XMLHttpRequest |

## Security Considerations

- ✅ No authentication needed (public content)
- ✅ No sensitive data transmitted
- ✅ Content from static JSON files
- ✅ No external API calls
- ✅ CORS not required

## Performance Optimizations

1. **Lazy Load Plans**: Only load selected plan into memory
2. **Cache Strategy**: Serve cached content instantly
3. **Minimal JS**: ~50KB uncompressed JavaScript
4. **No Dependencies**: Pure vanilla JavaScript
5. **Efficient DOM**: Direct innerHTML updates, no virtual DOM

## Extensibility

### Adding Features
1. Modify `script.js` to add new logic
2. Update HTML structure in `index.html` if needed
3. Add CSS rules to `style.css`
4. No build process required - reload browser

### Adding Data
1. Create new JSON file in `/data/`
2. Load in `script.js` via `fetch()`
3. Process and display in UI

### Adding Languages
1. Create `verses-[lang-code].json` file
2. Add language toggle option in UI
3. Load/switch in `script.js`

## Deployment Architecture

```
GitHub Repository
        ↓
     (Push)
        ↓
Netlify / Static Host
        ↓
    (Build)
    npm run build
        ↓
Publish root directory
        ↓
Serve index.html + assets
```

No build preprocessing needed. Deploy directly as static files.

## Browser Compatibility

| Feature | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|--------|------|
| Service Worker | ✓ 40+ | ✓ 44+ | ✓ 11.1+ | ✓ 17+ |
| localStorage | ✓ | ✓ | ✓ | ✓ |
| Web Manifest | ✓ 39+ | ✓ 55+ | ✓ 15+ | ✓ 79+ |
| PWA Install | ✓ | ✗ | ✓ | ✓ |

## Future Enhancements

- Sync with cloud storage
- Multiple user profiles
- Commenting on verses
- Custom reading plans
- Audio Bible integration
