const fs = require('fs');
const path = require('path');

// Safe, client-exposed values only. Never write service-role or private keys here.
const env = {
  VAPID_PUBLIC_KEY: process.env.VAPID_PUBLIC_KEY || '',
  YOUTUBE_API_KEY: process.env.YOUTUBE_API_KEY || 'YOUR_API_KEY',
  SUPABASE_URL: process.env.SUPABASE_URL || '',
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || ''
};

const outPath = path.join(process.cwd(), 'public-env.js');
const lines = Object.entries(env)
  .map(([key, val]) => `window.${key} = ${JSON.stringify(val)};`)
  .join('\n');

fs.writeFileSync(outPath, `${lines}\n`, 'utf8');

// Silent success - no logging to avoid Netlify secret scanner false positives
process.exit(0);


