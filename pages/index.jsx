import Head from 'next/head';
import Script from 'next/script';
import { useEffect } from 'react';
import Layout from '../components/Layout';
import Plans from '../components/Plans';
import Home from '../components/Home';
import Admin from '../components/Admin';
import Books, { BooksSidebar } from '../components/Books';
import Posts from '../components/Posts';
import Auth from '../components/Auth';
import KidsZone from '../components/KidsZone';
import Navigation, { NavigationProvider, useNavigation } from '../components/Navigation';

function PageContent() {
  const { activeView } = useNavigation();

  return (
    <main className="pb-32">
      <aside className="sidebar drawer" id="booksSidebar">
        <BooksSidebar />
      </aside>

      <div className="right-pane">
        {activeView === 'home' && <Home />}
        {activeView === 'plans' && <section className="card view-panel"><Plans /></section>}
        {activeView === 'kids' && <section className="card view-panel"><KidsZone /></section>}
        {activeView === 'posts' && <section className="card view-panel"><Posts /></section>}
        {activeView === 'books' && <section className="card view-panel"><Books /></section>}
        {activeView === 'admin' && <Admin />}
      </div>
    </main>
  );
}

export default function HomePage() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/service-worker.js').catch((err) => {
        console.log('SW registration failed:', err);
      });
    }
  }, []);

  return (
    <>
      <Head>
        <title>Bible Reading Tracker</title>
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="manifest" href="/manifest.webmanifest" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#4b0082" />
      </Head>

      <NavigationProvider>
        <Layout>
          <PageContent />
          {/* Auth Modal & Profile Button */}
          <div className="fixed inset-0 pointer-events-none">
            <Auth />
          </div>
          {/* Bottom Navigation */}
          <Navigation />
        </Layout>
      </NavigationProvider>

      <Script src="/data/embedded-plans.js?v=9" strategy="beforeInteractive" />
      <Script src="/public-env.js?v=9" strategy="beforeInteractive" />
    </>
  );
}
