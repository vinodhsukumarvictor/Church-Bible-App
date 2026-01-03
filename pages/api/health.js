import Sentry from '../../lib/sentry';

export default async function handler(req, res) {
  try {
    // simple healthcheck
    if (req.method !== 'GET') return res.status(405).json({ ok: false, error: 'Method Not Allowed' });

    // Return basic metadata and an OK status
    const payload = {
      ok: true,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      env: process.env.NODE_ENV || 'development',
    };

    return res.status(200).json(payload);
  } catch (err) {
    console.error('health check error', err);
    if (Sentry) {
      try { Sentry.captureException(err); } catch (e) { console.warn('Sentry capture failed', e?.message || e); }
    }
    return res.status(500).json({ ok: false, error: 'Internal Server Error' });
  }
}
