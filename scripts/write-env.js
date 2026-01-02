const fs = require('fs');
const path = require('path');

// Only emit non-sensitive, intentionally public values.
// Avoid writing SUPABASE_URL, SUPABASE_ANON_KEY, or YOUTUBE_API_KEY to build output
// because Netlify's secrets scanner will fail the build if they appear.
const env = {
  VAPID_PUBLIC_KEY: process.env.VAPID_PUBLIC_KEY || ''
};

const outPath = path.join(process.cwd(), 'public-env.js');
const lines = Object.entries(env)
  .map(([key, val]) => `window.${key} = ${JSON.stringify(val)};`)
  .join('\n');

fs.writeFileSync(outPath, `${lines}\n`, 'utf8');
console.log(`Wrote ${outPath} (public values only)`);
