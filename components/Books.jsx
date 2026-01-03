import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthProvider';
import { supabase } from '../lib/supabaseClient';

const BOOKS = [
  {id:'genesis', name:'Genesis', chapters:50},
  {id:'exodus', name:'Exodus', chapters:40},
  {id:'leviticus', name:'Leviticus', chapters:27},
  {id:'numbers', name:'Numbers', chapters:36},
  {id:'deuteronomy', name:'Deuteronomy', chapters:34},
  {id:'joshua', name:'Joshua', chapters:24},
  {id:'judges', name:'Judges', chapters:21},
  {id:'ruth', name:'Ruth', chapters:4},
  {id:'1-samuel', name:'1 Samuel', chapters:31},
  {id:'2-samuel', name:'2 Samuel', chapters:24},
  {id:'1-kings', name:'1 Kings', chapters:22},
  {id:'2-kings', name:'2 Kings', chapters:25},
  {id:'1-chronicles', name:'1 Chronicles', chapters:29},
  {id:'2-chronicles', name:'2 Chronicles', chapters:36},
  {id:'ezra', name:'Ezra', chapters:10},
  {id:'nehemiah', name:'Nehemiah', chapters:13},
  {id:'esther', name:'Esther', chapters:10},
  {id:'job', name:'Job', chapters:42},
  {id:'psalms', name:'Psalms', chapters:150},
  {id:'proverbs', name:'Proverbs', chapters:31},
  {id:'ecclesiastes', name:'Ecclesiastes', chapters:12},
  {id:'song-of-solomon', name:'Song of Solomon', chapters:8},
  {id:'isaiah', name:'Isaiah', chapters:66},
  {id:'jeremiah', name:'Jeremiah', chapters:52},
  {id:'lamentations', name:'Lamentations', chapters:5},
  {id:'ezekiel', name:'Ezekiel', chapters:48},
  {id:'daniel', name:'Daniel', chapters:12},
  {id:'hosea', name:'Hosea', chapters:14},
  {id:'joel', name:'Joel', chapters:3},
  {id:'amos', name:'Amos', chapters:9},
  {id:'obadiah', name:'Obadiah', chapters:1},
  {id:'jonah', name:'Jonah', chapters:4},
  {id:'micah', name:'Micah', chapters:7},
  {id:'nahum', name:'Nahum', chapters:3},
  {id:'habakkuk', name:'Habakkuk', chapters:3},
  {id:'zephaniah', name:'Zephaniah', chapters:3},
  {id:'haggai', name:'Haggai', chapters:2},
  {id:'zechariah', name:'Zechariah', chapters:14},
  {id:'malachi', name:'Malachi', chapters:4},
  {id:'matthew', name:'Matthew', chapters:28},
  {id:'mark', name:'Mark', chapters:16},
  {id:'luke', name:'Luke', chapters:24},
  {id:'john', name:'John', chapters:21},
  {id:'acts', name:'Acts', chapters:28},
  {id:'romans', name:'Romans', chapters:16},
  {id:'1-corinthians', name:'1 Corinthians', chapters:16},
  {id:'2-corinthians', name:'2 Corinthians', chapters:13},
  {id:'galatians', name:'Galatians', chapters:6},
  {id:'ephesians', name:'Ephesians', chapters:6},
  {id:'philippians', name:'Philippians', chapters:4},
  {id:'colossians', name:'Colossians', chapters:4},
  {id:'1-thessalonians', name:'1 Thessalonians', chapters:5},
  {id:'2-thessalonians', name:'2 Thessalonians', chapters:3},
  {id:'1-timothy', name:'1 Timothy', chapters:6},
  {id:'2-timothy', name:'2 Timothy', chapters:4},
  {id:'titus', name:'Titus', chapters:3},
  {id:'philemon', name:'Philemon', chapters:1},
  {id:'hebrews', name:'Hebrews', chapters:13},
  {id:'james', name:'James', chapters:5},
  {id:'1-peter', name:'1 Peter', chapters:5},
  {id:'2-peter', name:'2 Peter', chapters:3},
  {id:'1-john', name:'1 John', chapters:5},
  {id:'2-john', name:'2 John', chapters:1},
  {id:'3-john', name:'3 John', chapters:1},
  {id:'jude', name:'Jude', chapters:1},
  {id:'revelation', name:'Revelation', chapters:22}
];

function getDayOfYear(date = new Date()) {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date - start;
  const oneDay = 1000 * 60 * 60 * 24;
  return Math.floor(diff / oneDay);
}

export default function Books() {
  const { user } = useAuth();
  const [selectedBookId, setSelectedBookId] = useState('genesis');
  const [readState, setReadState] = useState({});
  const [showAllChapters, setShowAllChapters] = useState(false);
  const [showMissed, setShowMissed] = useState(false);
  const [currentPlanDayNumber, setCurrentPlanDayNumber] = useState(getDayOfYear());

  useEffect(() => {
    // initial render can fetch remote aggregates later if needed
  }, []);

  useEffect(() => {
    function handleOpenBook(e) {
      try {
        const id = e?.detail?.bookId;
        if (id) setSelectedBookId(id);
      } catch (err) { /* ignore */ }
    }
    function handleOpenChapter(e) {
      try {
        const { bookId, chapter } = e?.detail || {};
        if (bookId) setSelectedBookId(bookId);
        // optionally scroll/highlight the chapter after a tick
        if (chapter) setTimeout(() => {
          const el = document.querySelector('#chaptersContainer .chapter');
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 120);
      } catch (err) { /* ignore */ }
    }
    window.addEventListener('openBibleBook', handleOpenBook);
    window.addEventListener('openBibleChapter', handleOpenChapter);
    return () => {
      window.removeEventListener('openBibleBook', handleOpenBook);
      window.removeEventListener('openBibleChapter', handleOpenChapter);
    };
  }, []);

  const bookMap = useMemo(() => Object.fromEntries(BOOKS.map(b => [b.id, b])), []);

  function getBookProgress(bookId) {
    const b = bookMap[bookId];
    const readCount = Object.keys(readState[bookId] || {}).length;
    const pct = Math.round((readCount / (b?.chapters || 1)) * 100);
    return { readCount, total: b?.chapters || 0, pct };
  }

  function findBookIdByName(name) {
    if (!name) return null;
    const normalized = String(name).toLowerCase().replace(/\s+/g, ' ').trim();
    let candidate = BOOKS.find(b => b.name.toLowerCase() === normalized);
    if (candidate) return candidate.id;
    candidate = BOOKS.find(b => b.name.toLowerCase().startsWith(normalized) || normalized.startsWith(b.name.toLowerCase()));
    if (candidate) return candidate.id;
    candidate = BOOKS.find(b => b.id.replace(/-/g,'').toLowerCase() === normalized.replace(/\s+/g,'').toLowerCase());
    return candidate ? candidate.id : null;
  }

  async function toggleChapter(bookId, chapter) {
    // optimistic update
    setReadState(prev => {
      const next = { ...prev };
      next[bookId] = { ...(next[bookId] || {}) };
      const wasRead = !!next[bookId][chapter];
      if (wasRead) delete next[bookId][chapter];
      else next[bookId][chapter] = true;
      return next;
    });

    // persist with RPC when available
    try {
      if (!user) return;
      await supabase.rpc('mark_chapter_progress', {
        p_plan_name: (typeof window !== 'undefined' && window.getSelectedPlanName ? window.getSelectedPlanName() : 'canonical'),
        p_book: (bookMap[bookId]?.name || bookId),
        p_chapter: chapter,
        p_completed: true
      });
    } catch (e) {
      console.warn('mark_chapter_progress RPC failed', e);
    }
  }

  function renderBooks() {
    return (
      <div className="books-list">
        {BOOKS.map(b => {
          const prog = getBookProgress(b.id);
          return (
            <div key={b.id} className={`book-item ${b.id === selectedBookId ? 'active' : ''}`} onClick={() => setSelectedBookId(b.id)}>
              <div className="font-medium">{b.name}</div>
              <div className="text-sm text-muted-foreground">{prog.readCount} / {prog.total}</div>
            </div>
          );
        })}
      </div>
    );
  }

  function renderChapters(filter = 'all') {
    const book = bookMap[selectedBookId];
    if (!book) return null;
    // If plan-entries mode would be used, the global helpers from Plans component are available
    const planEntries = (typeof window !== 'undefined' && window.getPlanEntriesForDay && !showAllChapters && !showMissed) ? window.getPlanEntriesForDay(currentPlanDayNumber) : null;
    if (planEntries && planEntries.length > 0 && !showAllChapters) {
      return (
        <div className="plan-entries-list">
          {planEntries.map((item, idx) => {
            const bookId = findBookIdByName(item.book) || selectedBookId;
            const read = !!(readState[bookId] && readState[bookId][item.chapter]);
            if (filter === 'read' && !read) return null;
            if (filter === 'unread' && read) return null;
            return (
              <div key={`${item.book}-${item.chapter}-${idx}`} className="plan-entry flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <input type="checkbox" checked={read} onChange={() => toggleChapter(bookId, item.chapter)} />
                  <div>{item.book} {item.chapter}</div>
                </div>
                <div className="text-sm text-muted-foreground">Day {item.day}</div>
              </div>
            );
          })}
        </div>
      );
    }

    // default: render numeric chapter grid for the selected book
    const chapters = [];
    for (let i = 1; i <= book.chapters; i++) chapters.push(i);
    return (
      <div className="chapters-grid grid gap-2 grid-cols-8">
        {chapters.map(num => {
          const read = !!(readState[book.id] && readState[book.id][num]);
          if (filter === 'read' && !read) return null;
          if (filter === 'unread' && read) return null;
          return (
            <button key={num} className={`chapter ${read ? 'read' : ''} p-2 border rounded`} onClick={() => toggleChapter(book.id, num)}>
              {num}
            </button>
          );
        })}
      </div>
    );
  }

  async function markAllVisible() {
    try {
      // mark visible plan entries as read
      const planEntries = (typeof window !== 'undefined' && window.getPlanEntriesForDay && !showAllChapters && !showMissed) ? window.getPlanEntriesForDay(currentPlanDayNumber) : null;
      if (planEntries && planEntries.length) {
        const next = { ...readState };
        for (const item of planEntries) {
          const bookId = findBookIdByName(item.book) || selectedBookId;
          next[bookId] = next[bookId] || {};
          next[bookId][item.chapter] = true;
          try {
            if (user) await supabase.rpc('mark_chapter_progress', { p_plan_name: (window.getSelectedPlanName ? window.getSelectedPlanName() : 'canonical'), p_book: item.book, p_chapter: item.chapter, p_completed: true });
          } catch (e) { console.warn('markAll remote sync failed', e); }
        }
        setReadState(next);
        return;
      }
      // fallback: mark entire selected book
      const book = bookMap[selectedBookId];
      const next = { ...readState }; next[book.id] = {};
      for (let i = 1; i <= book.chapters; i++) next[book.id][i] = true;
      setReadState(next);
    } catch (e) { console.warn('markAll failed', e); }
  }

  async function clearVisible() {
    try {
      const planEntries = (typeof window !== 'undefined' && window.getPlanEntriesForDay && !showAllChapters && !showMissed) ? window.getPlanEntriesForDay(currentPlanDayNumber) : null;
      if (planEntries && planEntries.length) {
        const next = { ...readState };
        for (const item of planEntries) {
          const bookId = findBookIdByName(item.book) || selectedBookId;
          if (next[bookId] && next[bookId][item.chapter]) delete next[bookId][item.chapter];
          try { if (user) await supabase.rpc('mark_chapter_progress', { p_plan_name: (window.getSelectedPlanName ? window.getSelectedPlanName() : 'canonical'), p_book: item.book, p_chapter: item.chapter, p_completed: false }); } catch (e) { /* ignore */ }
        }
        setReadState(next);
        return;
      }
      // fallback: clear selected book
      const next = { ...readState }; delete next[selectedBookId]; setReadState(next);
    } catch (e) { console.warn('clearVisible failed', e); }
  }

  return (
    <section id="books-view" className="card view-panel">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold">Books & Chapters</h2>
          <p className="text-sm text-muted-foreground">Track chapter-level progress</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn" onClick={() => { setCurrentPlanDayNumber(n => Math.max(1, n - 1)); }}>{'‹'}</button>
          <div className="text-sm">Day {currentPlanDayNumber}</div>
          <button className="btn" onClick={() => { setCurrentPlanDayNumber(n => n + 1); }}>{'›'}</button>
        </div>
      </div>

      <div className="grid md:grid-cols-4 gap-6">
        <aside className="col-span-1">{renderBooks()}</aside>
        <main className="col-span-3">
          <div className="mb-3 flex items-center gap-3">
            <label className="flex items-center gap-2"><input type="checkbox" checked={showAllChapters} onChange={(e)=>{ setShowAllChapters(e.target.checked); if (e.target.checked) setShowMissed(false); }} /> Show all chapters</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={showMissed} onChange={(e)=>{ setShowMissed(e.target.checked); if (e.target.checked) setShowAllChapters(false); }} /> Show missed</label>
            <div className="ml-auto flex gap-2">
              <button className="btn" onClick={markAllVisible}>Mark all visible</button>
              <button className="btn warn" onClick={clearVisible}>Clear visible</button>
            </div>
          </div>

          {renderChapters()}
        </main>
      </div>
    </section>
  );
}

// Sidebar component to show overall progress and clickable book list
export function BooksSidebar() {
  const [remoteRead, setRemoteRead] = useState(null);
  const totalChapters = useMemo(() => BOOKS.reduce((s, b) => s + (b.chapters || 0), 0), []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data, error } = await supabase.from('reading_progress_summary').select('chapters_read');
        if (error || !data) return;
        const sum = data.reduce((s, r) => s + (r.chapters_read || 0), 0);
        if (mounted) setRemoteRead(sum);
      } catch (e) { /* ignore */ }
    })();
    return () => { mounted = false; };
  }, []);

  const pct = remoteRead != null ? Math.round((remoteRead / totalChapters) * 100) : 0;

  return (
    <aside>
      <div className="overall">
        <svg className="donut" viewBox="0 0 36 36">
          <circle cx="18" cy="18" r="15.9" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="4" />
          <circle cx="18" cy="18" r="15.9" fill="none" stroke="url(#gradient)" strokeWidth="4" strokeLinecap="round" transform="rotate(-90 18 18)" style={{ strokeDasharray: `${pct} 100` }} />
        </svg>
        <div className="overall-stats">
          <p className="small">Overall progress</p>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${pct}%` }}></div>
          </div>
          <p className="small" id="overallText">{remoteRead ?? 0} / {totalChapters} chapters</p>
        </div>
      </div>

      <h2 className="small muted">Books</h2>
      <div className="books-list">
        {BOOKS.map(b => (
          <div key={b.id} className="book-item" onClick={() => window.dispatchEvent(new CustomEvent('openBibleBook', { detail: { bookId: b.id } }))}>
            <span>{b.name}</span>
            <span className="text-sm text-muted-foreground">{b.chapters}</span>
          </div>
        ))}
      </div>
    </aside>
  );
}
