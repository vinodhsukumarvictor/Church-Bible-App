exports.handler = async (event) => {
  try {
    const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
    if (!YOUTUBE_API_KEY) {
      return { statusCode: 500, body: JSON.stringify({ error: 'YOUTUBE_API_KEY not configured' }) };
    }

    const params = event.queryStringParameters || {};
    const handle = params.handle || '@FCMLiverpool';
    const maxResults = params.max || 6;

    // First, try to find the channel ID by searching for the handle
    const searchUrl = `https://www.googleapis.com/youtube/v3/search?key=${encodeURIComponent(YOUTUBE_API_KEY)}&q=${encodeURIComponent(handle)}&type=channel&part=snippet&maxResults=1`;
    const chRes = await fetch(searchUrl);
    if (!chRes.ok) {
      const text = await chRes.text();
      return { statusCode: chRes.status, body: JSON.stringify({ error: 'Channel lookup failed', detail: text }) };
    }
    const chJson = await chRes.json();
    let channelId = chJson.items && chJson.items[0] && chJson.items[0].snippet && chJson.items[0].snippet.channelId;

    // If channelId not found, try to search for videos directly by name
    let videosJson = null;
    if (!channelId) {
      const directUrl = `https://www.googleapis.com/youtube/v3/search?key=${encodeURIComponent(YOUTUBE_API_KEY)}&q=${encodeURIComponent(handle + ' sermon')}&type=video&order=date&part=snippet&maxResults=${encodeURIComponent(maxResults)}`;
      const directRes = await fetch(directUrl);
      if (!directRes.ok) {
        const text = await directRes.text();
        return { statusCode: directRes.status, body: JSON.stringify({ error: 'Direct video search failed', detail: text }) };
      }
      videosJson = await directRes.json();
    } else {
      const videosUrl = `https://www.googleapis.com/youtube/v3/search?key=${encodeURIComponent(YOUTUBE_API_KEY)}&channelId=${encodeURIComponent(channelId)}&part=snippet,id&order=date&maxResults=${encodeURIComponent(maxResults)}&type=video`;
      const vRes = await fetch(videosUrl);
      if (!vRes.ok) {
        const text = await vRes.text();
        return { statusCode: vRes.status, body: JSON.stringify({ error: 'Channel videos fetch failed', detail: text }) };
      }
      videosJson = await vRes.json();
    }

    // Normalize items
    const items = (videosJson.items || []).map(item => {
      const videoId = item.id && (item.id.videoId || item.id);
      return {
        title: item.snippet?.title || 'Untitled',
        speaker: item.snippet?.channelTitle || 'FCM Liverpool',
        youtubeId: typeof videoId === 'string' ? videoId : '',
        date: item.snippet?.publishedAt ? new Date(item.snippet.publishedAt).toLocaleDateString('en-GB', { year: 'numeric', month: '2-digit', day: '2-digit' }) : ''
      };
    }).filter(x => x.youtubeId);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items })
    };
  } catch (err) {
    console.error('fetchYouTube error', err);
    return { statusCode: 500, body: JSON.stringify({ error: 'Internal error' }) };
  }
};
