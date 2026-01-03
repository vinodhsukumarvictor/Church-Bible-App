const fs = require('fs');
const path = require('path');

// Only emit intentionally public values (Supabase anon key is safe for client use).
const env = {
  VAPID_PUBLIC_KEY: process.env.VAPID_PUBLIC_KEY || '',
  SUPABASE_URL: process.env.SUPABASE_URL || '',
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || ''
};

const outPath = path.join(process.cwd(), 'public-env.js');
const lines = Object.entries(env)
  .map(([key, val]) => `window.${key} = ${JSON.stringify(val)};`)
  .join('\n');

fs.writeFileSync(outPath, `${lines}\n`, 'utf8');
console.log(`Wrote ${outPath} (public values only)`);
