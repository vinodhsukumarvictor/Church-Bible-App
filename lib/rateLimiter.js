// Simple in-memory token-bucket rate limiter for API routes
// Not distributed — suitable for single-instance or low-traffic staging.
const buckets = new Map();

export function rateLimit(options = {}) {
  const { tokens = 10, refillInterval = 60 * 1000 } = options;
  return function middleware(req, res) {
    const key = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'global';
    const now = Date.now();
    const state = buckets.get(key) || { tokens: tokens, last: now };
    // refill
    const elapsed = now - state.last;
    if (elapsed > 0) {
      const refill = Math.floor(elapsed / refillInterval) * tokens;
      state.tokens = Math.min(tokens, state.tokens + refill);
      state.last = now;
    }
    if (state.tokens > 0) {
      state.tokens = state.tokens - 1;
      buckets.set(key, state);
      return true;
    }
    // rate limit exceeded
    res.statusCode = 429;
    res.setHeader('Retry-After', Math.ceil(refillInterval / 1000));
    res.end(JSON.stringify({ error: 'Too Many Requests' }));
    return false;
  };
}
