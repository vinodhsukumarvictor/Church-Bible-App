export default async function handler(req, res) {
  try {
    const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
    if (!YOUTUBE_API_KEY) {
      return res.status(500).json({ error: 'YOUTUBE_API_KEY not configured' });
    }

    const handle = req.query.handle || '@FCMLiverpool';
    const maxResults = req.query.max || 6;

    // Find the channel ID by searching for the handle
    const searchUrl = `https://www.googleapis.com/youtube/v3/search?key=${encodeURIComponent(YOUTUBE_API_KEY)}&q=${encodeURIComponent(handle)}&type=channel&part=snippet&maxResults=1`;
    const chRes = await fetch(searchUrl);
    if (!chRes.ok) {
      const text = await chRes.text();
      return res.status(chRes.status).json({ error: 'Channel lookup failed', detail: text });
    }
    const chJson = await chRes.json();
    let channelId = chJson.items?.[0]?.snippet?.channelId;

    let videosJson = null;
    if (!channelId) {
      const directUrl = `https://www.googleapis.com/youtube/v3/search?key=${encodeURIComponent(YOUTUBE_API_KEY)}&q=${encodeURIComponent(handle + ' sermon')}&type=video&order=date&part=snippet&maxResults=${encodeURIComponent(maxResults)}`;
      const directRes = await fetch(directUrl);
      if (!directRes.ok) {
        const text = await directRes.text();
        return res.status(directRes.status).json({ error: 'Direct video search failed', detail: text });
      }
      videosJson = await directRes.json();
    } else {
      const videosUrl = `https://www.googleapis.com/youtube/v3/search?key=${encodeURIComponent(YOUTUBE_API_KEY)}&channelId=${encodeURIComponent(channelId)}&part=snippet,id&order=date&maxResults=${encodeURIComponent(maxResults)}&type=video`;
      const vRes = await fetch(videosUrl);
      if (!vRes.ok) {
        const text = await vRes.text();
        return res.status(vRes.status).json({ error: 'Channel videos fetch failed', detail: text });
      }
      videosJson = await vRes.json();
    }

    const items = (videosJson.items || [])
      .map((item) => {
        const videoId = item.id && (item.id.videoId || item.id);
        return {
          title: item.snippet?.title || 'Untitled',
          speaker: item.snippet?.channelTitle || 'FCM Liverpool',
          youtubeId: typeof videoId === 'string' ? videoId : '',
          date: item.snippet?.publishedAt
            ? new Date(item.snippet.publishedAt).toLocaleDateString('en-GB', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
              })
            : '',
        };
      })
      .filter((x) => x.youtubeId);

    return res.status(200).json({ items });
  } catch (err) {
    console.error('fetchYouTube error:', err);
    return res.status(500).json({ error: 'Internal error', message: err.message });
  }
}
