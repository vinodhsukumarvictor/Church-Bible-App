// Lightweight Sentry scaffold — initialize when SENTRY_DSN is provided
let Sentry = null;
try {
  if (process.env.SENTRY_DSN) {
    // import lazily so projects without @sentry/node don't fail
    // eslint-disable-next-line global-require
    const SentryNode = require('@sentry/node');
    SentryNode.init({ dsn: process.env.SENTRY_DSN });
    Sentry = SentryNode;
  }
} catch (e) {
  console.warn('Sentry not initialized', e.message || e);
}

export default Sentry;
