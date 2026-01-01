# YouTube API Setup for FCM Liverpool Sermons

## Overview
The app is configured to automatically fetch the latest videos from your YouTube channel (@FCMLiverpool) using the YouTube Data API v3.

## Setup Instructions

### Step 1: Get a YouTube Data API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or select an existing one)
3. Enable the **YouTube Data API v3**:
   - Click "Enable APIs and Services"
   - Search for "YouTube Data API v3"
   - Click "Enable"
4. Create credentials:
   - Click "Create Credentials"
   - Select "API Key"
   - Copy the generated API key

### Step 2: Configure the App

Open `script.js` and replace:

```javascript
const YOUTUBE_API_KEY = 'YOUR_API_KEY';
```

With your actual API key:

```javascript
const YOUTUBE_API_KEY = 'AIzaSyB...your-actual-key-here';
```

### Step 3: Deploy

Once configured, the app will:
- ✅ Automatically fetch the 6 most recent videos from @FCMLiverpool
- ✅ Update sermon titles, dates, and thumbnails
- ✅ Fall back to placeholder data if API unavailable

## Channel Information

- **Channel**: @FCMLiverpool
- **Channel ID**: UCXhsHbSy7CFF8QjORjuV6IA
- **Max Videos**: 6 latest uploads
- **Order**: By upload date (newest first)

## API Quota

YouTube Data API v3 has a daily quota:
- **Free tier**: 10,000 units/day
- **Each search request**: 100 units
- **Your app**: ~100 units per page load
- **Estimated capacity**: ~100 page loads/day

To optimize:
- Cache results in localStorage
- Refresh only once per day
- Consider server-side caching for production

## Fallback Behavior

If the API key is not configured or quota is exceeded:
- App uses placeholder sermon data
- Console warning is logged
- All functionality remains intact

## Testing

1. Add your API key to `script.js`
2. Open the app in a browser
3. Check browser console for:
   - ✅ "Loaded latest sermons from YouTube"
   - ⚠️ Warning if API key missing/invalid

## Security Note

⚠️ **For production**: Store API keys server-side and proxy requests through your backend to prevent key exposure and quota abuse.

## Troubleshooting

| Issue | Solution |
|-------|----------|
| No videos loading | Check API key is correct |
| Quota exceeded | Wait 24 hours or upgrade quota |
| Old videos showing | Clear browser cache |
| API error | Check console for details |

## Alternative: RSS Feed (No API Key Needed)

If you prefer not to use the YouTube API, you can use an RSS-to-JSON service:

```javascript
const RSS_URL = 'https://api.rss2json.com/v1/api.json?rss_url=https://www.youtube.com/feeds/videos.xml?channel_id=UCXhsHbSy7CFF8QjORjuV6IA';
```

This has limitations but requires no API key.
