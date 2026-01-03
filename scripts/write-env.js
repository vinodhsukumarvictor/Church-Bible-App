const fs = require('fs');
const path = require('path');

// Only emit intentionally public values (Supabase anon key is safe for client use).
const env = {
  VAPID_PUBLIC_KEY: process.env.VAPID_PUBLIC_KEY || '',
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
  FUNCTIONS_BASE: process.env.FUNCTIONS_BASE || '/api'
};

const outPath = path.join(process.cwd(), 'public', 'public-env.js');
const lines = Object.entries(env)
  .map(([key, val]) => `window.${key} = ${JSON.stringify(val)};`)
  .join('\n');

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, `${lines}\n`, 'utf8');
console.log(`Wrote ${outPath} (public values only)`);
