import React, { useEffect, useState } from 'react';

export default function Posts({ lang = 'en' }) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      try {
        // Prefer preloaded global posts (embedding) then network fetch
        const embedded = typeof window !== 'undefined' && window.__POSTS;
        if (embedded && Array.isArray(embedded)) {
          if (mounted) setPosts(embedded.slice(0, 50));
        } else {
          const path = `/posts_${lang}.json`;
          const res = await fetch(path);
          if (res.ok) {
            const json = await res.json();
            if (mounted) setPosts(Array.isArray(json) ? json.slice(0, 50) : []);
          } else {
            // fallback to english
            if (lang !== 'en') {
              const r2 = await fetch('/posts_en.json');
              if (r2.ok) {
                const j2 = await r2.json();
                if (mounted) setPosts(Array.isArray(j2) ? j2.slice(0, 50) : []);
              }
            }
          }
        }
      } catch (e) {
        console.warn('Failed to load posts', e);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [lang]);

  return (
    <section id="posts-view" className="card view-panel">
      <div className="plans-header mb-4">
        <div>
          <h2>Posts</h2>
          <p className="small muted">Community posts and updates</p>
        </div>
      </div>

      <div className="posts-list space-y-3">
        {loading && <div className="muted">Loading posts…</div>}
        {!loading && posts.length === 0 && <div className="small muted">No posts available.</div>}
        {posts.map((p, i) => (
          <article key={i} className="post-card border rounded p-3">
            <div className="post-head flex items-center gap-3">
              <div className="avatar w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">{(p.author && p.author[0]) || 'A'}</div>
              <div>
                <div className="font-medium">{p.author || 'Anonymous'}</div>
                <div className="text-sm text-muted-foreground">{p.time || ''}</div>
              </div>
            </div>
            <div className="post-content mt-2 text-sm">{p.content}</div>
          </article>
        ))}
      </div>
    </section>
  );
}
