import '../styles/globals.css';
import { AuthProvider } from '../contexts/AuthProvider';
import * as Sentry from '@sentry/browser';

// Initialize browser Sentry when a public DSN is available (guard against double init)
const sentryDsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
if (typeof window !== 'undefined' && sentryDsn && !window.__SENTRY_INITIALIZED__) {
  Sentry.init({ dsn: sentryDsn, tracesSampleRate: 0.1 });
  window.__SENTRY_INITIALIZED__ = true;
}

export default function App({ Component, pageProps }) {
  return (
    <AuthProvider>
      <Component {...pageProps} />
    </AuthProvider>
  );
}
