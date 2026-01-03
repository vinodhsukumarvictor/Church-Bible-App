import React, { useEffect, useMemo, useState } from 'react';

function dayOfYear(date = new Date()) {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date - start;
  const oneDay = 1000 * 60 * 60 * 24;
  return Math.floor(diff / oneDay);
}

export default function Home() {
  const [verse, setVerse] = useState({ text: 'Loading…', ref: '' });
  const [announcements, setAnnouncements] = useState([]);
  const [sermons, setSermons] = useState([]);
  const [quiz, setQuiz] = useState(null);

  useEffect(() => {
    let mounted = true;

    async function loadVerse() {
      try {
        const res = await fetch('/verses-en.json');
        if (!res.ok) return;
        const json = await res.json();
        const idx = dayOfYear() % json.length;
        const v = json[idx];
        if (mounted) setVerse({ text: v.text || v.verse || '—', ref: v.ref || v.book || '' });
      } catch (e) {
        console.warn('loadVerse failed', e);
      }
    }

    async function loadAnnouncements() {
      try {
        const res = await fetch('/announcements_en.json');
        if (!res.ok) return;
        const json = await res.json();
        if (mounted) setAnnouncements(json.slice(0, 6));
      } catch (e) { console.warn('loadAnnouncements failed', e); }
    }

    async function loadSermons() {
      try {
        const res = await fetch('/sermons.json');
        if (!res.ok) return;
        const json = await res.json();
        if (mounted) setSermons((json.items || json).slice(0, 6));
      } catch (e) { console.warn('loadSermons failed', e); }
    }

    async function loadQuiz() {
      try {
        const res = await fetch('/quiz_en.json');
        if (!res.ok) return;
        const json = await res.json();
        if (mounted) setQuiz(json[0] || null);
      } catch (e) { console.warn('loadQuiz failed', e); }
    }

    loadVerse();
    loadAnnouncements();
    loadSermons();
    loadQuiz();

    return () => { mounted = false; };
  }, []);

  return (
    <section id="home-view" className="card view-panel">
      <section id="verse" className="card verse-card mb-6 p-6">
        <h2 className="text-lg font-semibold">Verse of the day ✨</h2>
        <blockquote className="mt-2 text-base text-foreground/90">{verse.text}</blockquote>
        <p className="muted mt-2">{verse.ref}</p>
        <div className="verse-actions mt-3">
          <button id="verseLikeBtn" className="action-btn inline-flex items-center gap-2" aria-label="Like verse">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
              <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
            </svg>
            <span id="verseLikeCount">0</span>
          </button>
        </div>
      </section>

      <div className="home-grid grid gap-6 md:grid-cols-3">
        <section className="home-card p-4 bg-card rounded-lg shadow-sm">
          <div className="home-card-head mb-3">
            <p className="eyebrow text-sm text-muted-foreground">Church</p>
            <h3 className="text-base font-medium">Announcements</h3>
            <p className="small text-muted-foreground">Stay updated with the latest news</p>
          </div>
          <ul id="homeAnnouncements" className="list space-y-2">
            {announcements.map((a, i) => (
              <li key={i} className="py-2 border-b border-gray-100">
                <div className="font-medium">{a.title}</div>
                <div className="text-sm text-muted-foreground">{a.content ? (a.content.substring(0, 120) + (a.content.length > 120 ? '…' : '')) : ''}</div>
              </li>
            ))}
          </ul>
        </section>

        <section className="home-card p-4 bg-card rounded-lg shadow-sm">
          <div className="home-card-head mb-3">
            <p className="eyebrow text-sm text-muted-foreground">Sermons</p>
            <h3 className="text-base font-medium">Recent Sermons</h3>
            <p className="small text-muted-foreground">Watch or listen on the go</p>
          </div>
          <div id="homeSermons" className="sermon-grid grid gap-3">
            {sermons.map((s, i) => (
              <div key={i} className="p-3 border rounded">
                <div className="font-medium">{s.title || s.name}</div>
                <div className="text-sm text-muted-foreground">{s.date || s.published || ''}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="home-card p-4 bg-card rounded-lg shadow-sm">
          <div className="home-card-head mb-3">
            <p className="eyebrow text-sm text-muted-foreground">Quiz</p>
            <h3 className="text-base font-medium">Daily Bible Quiz</h3>
            <p className="small text-muted-foreground">Test your knowledge and track streaks</p>
          </div>
          <div id="quizContainer" className="quiz-box">
            {quiz ? (
              <>
                <p id="quizQuestion" className="quiz-question">{quiz.q}</p>
                <div id="quizOptions" className="quiz-options space-y-2">
                  {(quiz.options || []).map((opt, idx) => (
                    <button key={idx} className="w-full text-left p-2 border rounded">{opt}</button>
                  ))}
                </div>
                <div id="quizFeedback" className="quiz-feedback mt-2" aria-live="polite"></div>
              </>
            ) : (
              <div className="text-sm text-muted-foreground">No quiz available</div>
            )}
          </div>
        </section>
      </div>
    </section>
  );
}
