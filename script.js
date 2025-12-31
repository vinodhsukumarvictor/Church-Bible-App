document.addEventListener("DOMContentLoaded", async () => {
  const readingList = document.getElementById("reading-list");
  const progressText = document.getElementById("progress");
  const completedList = document.getElementById("completed-days");
  const markBtn = document.getElementById("mark-complete");
  const verseText = document.getElementById("verse-text");
  const verseRef = document.getElementById("verse-ref");

  const homeAnnouncements = document.getElementById('homeAnnouncements');
  const homeSermons = document.getElementById('homeSermons');
  const homePosts = document.getElementById('homePosts');
  const kidsGallery = document.getElementById('kidsGallery');
  const kidsUpload = document.getElementById('kidsUpload');
  const quizQuestionEl = document.getElementById('quizQuestion');
  const quizOptionsEl = document.getElementById('quizOptions');
  const quizFeedbackEl = document.getElementById('quizFeedback');

  const startOfYear = new Date(new Date().getFullYear(), 0, 1);
  const today = new Date();
  const dayOfYear = Math.floor((today - startOfYear) / (1000 * 60 * 60 * 24)) + 1;

  let readingPlan = {};
  let completedDays = JSON.parse(localStorage.getItem("completedDays") || "[]");

  const announcementsSeed = [
    { title: 'Christmas Service Schedule', priority: 'high', tag: 'Services', date: '2025-12-24' },
    { title: 'Youth Retreat Registration', priority: 'normal', tag: 'Youth', date: '2026-01-05' },
    { title: 'Prayer Night Every Wednesday', priority: 'low', tag: 'Prayer', date: '2026-01-03' },
  ];

  const sermonsSeed = [
    { title: 'Hope in Uncertain Times', speaker: 'Ps. Grace Lee', youtubeId: 'hY7m5jjJ9mM', date: '2025-12-12' },
    { title: 'Walking by Faith', speaker: 'Ps. Daniel Kim', youtubeId: 'kxopViU98Xo', date: '2025-12-05' },
    { title: 'The Gift of Peace', speaker: 'Ps. Maria Santos', youtubeId: 'LXb3EKWsInQ', date: '2025-11-28' },
  ];

  const postsSeed = [
    { author: 'Alicia', content: 'Loved today’s message on hope. Let’s pray for our city.', time: '2h ago' },
    { author: 'Jonah', content: 'Small group meets Thursday 7pm. Snacks provided!', time: '5h ago' },
    { author: 'Mia', content: 'Memory verse this week: Psalm 46:1 🌿', time: '1d ago' },
  ];

  const quizSeed = [
    { q: 'Where was Jesus born?', options: ['Nazareth', 'Bethlehem', 'Jerusalem', 'Capernaum'], answer: 1 },
    { q: 'How many days did it rain during the flood?', options: ['20', '30', '40', '50'], answer: 2 },
    { q: 'Who led Israel after Moses?', options: ['Joshua', 'Caleb', 'Samuel', 'Saul'], answer: 0 },
  ];

  const kidsStorageKey = 'kidsGallery:v1';
  const quizStorageKey = 'quizProgress:v1';

  function loadKidsGallery() {
    try {
      const saved = localStorage.getItem(kidsStorageKey);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('kids gallery load failed', e);
    }
    return [
      { title: 'Nativity craft', child: 'Ella (8)', src: null },
      { title: 'Rainbow promise', child: 'Micah (6)', src: null },
      { title: 'Noah’s ark', child: 'Leah (10)', src: null },
    ];
  }

  function saveKidsGallery(arr) {
    try { localStorage.setItem(kidsStorageKey, JSON.stringify(arr)); } catch (e) { console.warn('kids gallery save failed', e); }
  }

  let kidsGalleryData = loadKidsGallery();

  function renderAnnouncements() {
    if (!homeAnnouncements) return;
    homeAnnouncements.innerHTML = '';
    announcementsSeed.forEach(item => {
      const li = document.createElement('li');
      li.className = 'list-item';
      li.innerHTML = `
        <div>
          <p class="small muted">${item.tag} • ${item.date}</p>
          <p class="item-title">${item.title}</p>
        </div>
        <span class="pill pill-${item.priority}">${item.priority}</span>
      `;
      homeAnnouncements.appendChild(li);
    });
  }

  function renderSermons() {
    if (!homeSermons) return;
    homeSermons.innerHTML = '';
    sermonsSeed.forEach(s => {
      const card = document.createElement('article');
      card.className = 'sermon-card';
      const thumb = `https://img.youtube.com/vi/${s.youtubeId}/mqdefault.jpg`;
      card.innerHTML = `
        <div class="sermon-thumb" style="background-image:url('${thumb}')"></div>
        <div class="sermon-body">
          <p class="small muted">${s.speaker} • ${s.date}</p>
          <h4>${s.title}</h4>
        </div>
      `;
      homeSermons.appendChild(card);
    });
  }

  function renderPosts() {
    if (!homePosts) return;
    homePosts.innerHTML = '';
    postsSeed.forEach(p => {
      const card = document.createElement('article');
      card.className = 'post-card';
      card.innerHTML = `
        <div class="post-head"><span class="avatar">${p.author[0] || 'A'}</span><div><p class="item-title">${p.author}</p><p class="small muted">${p.time}</p></div></div>
        <p class="post-content">${p.content}</p>
      `;
      homePosts.appendChild(card);
    });
  }

  function renderKids() {
    if (!kidsGallery) return;
    kidsGallery.innerHTML = '';
    kidsGalleryData.forEach((k, idx) => {
      const card = document.createElement('article');
      card.className = 'kid-card';
      const placeholder = `<div class="kid-placeholder">🎨</div>`;
      const media = k.src ? `<img src="${k.src}" alt="${k.title}" loading="lazy">` : placeholder;
      card.innerHTML = `
        ${media}
        <div class="kid-body">
          <p class="item-title">${k.title}</p>
          <p class="small muted">${k.child}</p>
          <button class="btn tiny" data-remove="${idx}">Remove</button>
        </div>
      `;
      kidsGallery.appendChild(card);
    });

    kidsGallery.querySelectorAll('button[data-remove]').forEach(btn => {
      btn.addEventListener('click', () => {
        const i = Number(btn.dataset.remove);
        kidsGalleryData.splice(i, 1);
        saveKidsGallery(kidsGalleryData);
        renderKids();
      });
    });
  }

  function handleKidsUpload(file) {
    const reader = new FileReader();
    reader.onload = ev => {
      kidsGalleryData.unshift({ title: file.name || 'New upload', child: 'Parent upload', src: ev.target.result });
      saveKidsGallery(kidsGalleryData);
      renderKids();
    };
    reader.readAsDataURL(file);
  }

  function renderQuiz() {
    if (!quizQuestionEl || !quizOptionsEl || !quizFeedbackEl) return;
    const idx = dayOfYear % quizSeed.length;
    const item = quizSeed[idx];
    quizQuestionEl.textContent = item.q;
    quizOptionsEl.innerHTML = '';
    quizFeedbackEl.textContent = '';
    item.options.forEach((opt, optIdx) => {
      const btn = document.createElement('button');
      btn.className = 'btn option';
      btn.textContent = opt;
      btn.addEventListener('click', () => {
        const correct = optIdx === item.answer;
        quizFeedbackEl.textContent = correct ? 'Correct! 🎉' : 'Try again.';
        quizFeedbackEl.classList.toggle('ok', correct);
        quizFeedbackEl.classList.toggle('warn', !correct);
        try { localStorage.setItem(quizStorageKey, JSON.stringify({ day: dayOfYear, correct })); } catch (e) { /* ignore */ }
      });
      quizOptionsEl.appendChild(btn);
    });
  }

  // New reading-plan-aware script
  // Loads the two generated plans (canonical and chronological), shows today's reading,
  // lets the user mark the day completed and keeps history in localStorage.

  (async function () {
    const planFiles = {
      canonical: 'data/reading-plan-canonical.json',
      chronological: 'data/reading-plan-chronological.json'
    };

  let plans = { canonical: null, chronological: null };
  const planSelect = document.getElementById('planSelect');
  const daySelect = document.getElementById('daySelect');
  const readingListEl = document.getElementById('reading-list');
  const markBtn = document.getElementById('mark-complete');
  const progressEl = document.getElementById('progress');
  const completedDaysEl = document.getElementById('completed-days');
  const dayLabel = document.getElementById('dayLabel');
  const planDayLabel = document.getElementById('planDayLabel');
  const fullPlanToggle = document.getElementById('fullPlanToggle');
  const fullPlanEl = document.getElementById('fullPlan');

    function dayOfYear(date = new Date()) {
      const start = new Date(date.getFullYear(), 0, 0);
      const diff = date - start;
      const oneDay = 1000 * 60 * 60 * 24;
      return Math.floor(diff / oneDay);
    }

    function storageKey(planName) {
      return `completedDays:${planName}`;
    }

    function loadCompleted(planName) {
      try {
        const raw = localStorage.getItem(storageKey(planName));
        return raw ? JSON.parse(raw) : [];
      } catch {
        return [];
      }
    }

    function saveCompleted(planName, arr) {
      localStorage.setItem(storageKey(planName), JSON.stringify(arr));
    }

    async function fetchPlan(name) {
      // If the page included embedded plans (works with file://), use them first
      try {
        if (typeof window !== 'undefined' && window.__EMBEDDED_PLANS && window.__EMBEDDED_PLANS[name]) {
          return window.__EMBEDDED_PLANS[name];
        }
      } catch (ex) {
        // ignore and fall back to network
        console.warn('embedded plans check failed', ex);
      }

      const url = planFiles[name];
      // Try fetch first (works when served over http).
      try {
        const res = await fetch(url);
        if (res.ok) return res.json();
        // if fetch returns non-ok, fall through to XHR fallback
        console.warn(`fetch(${url}) returned ${res.status}, falling back to XHR`);
      } catch (e) {
        console.warn(`fetch(${url}) failed, attempting XHR fallback`, e);
      }

      // Fallback for file:// situations or strict environments: use XHR (synchronous allowed here as a last resort)
      try {
        const xhr = new XMLHttpRequest();
        xhr.open('GET', url, false); // synchronous
        xhr.send(null);
        // Some browsers return status 0 for file://; treat 200 or 0 as success
        if (xhr.status === 200 || xhr.status === 0) {
          return JSON.parse(xhr.responseText);
        }
        throw new Error(`XHR failed status=${xhr.status}`);
      } catch (e) {
        throw new Error(`Failed to load ${url}: ${e.message}`);
      }
    }

  async function init() {
      // load both plans in parallel
      const p = await Promise.allSettled([
        fetchPlan('canonical'),
        fetchPlan('chronological')
      ]);
      if (p[0].status === 'fulfilled') plans.canonical = p[0].value;
      else console.error('Failed to load canonical plan', p[0].reason);
      if (p[1].status === 'fulfilled') plans.chronological = p[1].value;
      else console.error('Failed to load chronological plan', p[1].reason);

      planSelect.addEventListener('change', async () => {
        const planName = getSelectedPlan();
        const ok = await ensurePlanLoaded(planName);
        if (!ok) {
          showPlanStatus('Failed to load plan. See console.');
        } else {
          hidePlanStatus();
        }
        const max = populateDays(planName);
        const defaultDay = Math.max(1, Math.min(dayOfYear(), max || 1));
        if (daySelect && max >= defaultDay) daySelect.value = String(defaultDay);
        renderSelectedDay();
        renderHistory();
        if (fullPlanEl && !fullPlanEl.hidden) renderFullPlan();
      });
      if (daySelect) daySelect.addEventListener('change', ()=>{ renderSelectedDay(); });
      markBtn.addEventListener('click', markCompleted);

  // initial population — try to ensure the selected plan is loaded, then populate
      const initialOk = await ensurePlanLoaded(getSelectedPlan());
      if (!initialOk) showPlanStatus('Plan not loaded. ' + (lastPlanError ? lastPlanError : 'You can retry or serve via HTTP.'));
      // show file:// hint when running from filesystem
      if (location && location.protocol === 'file:') {
        const fileHint = document.getElementById('fileHint'); if (fileHint) fileHint.hidden = false;
      }
  const max = populateDays(getSelectedPlan());
  const defaultDay = Math.max(1, Math.min(dayOfYear(), max || 1));
  if (daySelect && max >= defaultDay) daySelect.value = String(defaultDay);
  renderSelectedDay();
  renderHistory();
      loadVerseOfTheDay();

      renderAnnouncements();
      renderSermons();
      renderPosts();
      renderKids();
      renderQuiz();

      if (kidsUpload) {
        kidsUpload.addEventListener('change', (e)=>{
          const file = e.target.files && e.target.files[0];
          if (file) handleKidsUpload(file);
          e.target.value = '';
        });
      }

      // full plan toggle
      if (fullPlanToggle && fullPlanEl) {
        fullPlanToggle.addEventListener('click', ()=>{
          const isOpen = fullPlanEl && !fullPlanEl.hidden;
          if (fullPlanEl) fullPlanEl.hidden = isOpen; // hide if open
          fullPlanToggle.setAttribute('aria-expanded', String(!isOpen));
          fullPlanToggle.textContent = isOpen ? 'Show full plan' : 'Hide full plan';
          if (!isOpen) renderFullPlan();
        });
      }
      // retry button in status area
      const planRetry = document.getElementById('planRetry');
      if (planRetry) {
        planRetry.addEventListener('click', async ()=>{
          hidePlanStatus();
          const ok = await ensurePlanLoaded(getSelectedPlan());
          if (!ok) showPlanStatus('Retry failed. Try serving the site via HTTP (see README).');
          else {
            hidePlanStatus();
            const max = populateDays(getSelectedPlan());
            if (daySelect && max>=1) daySelect.value = String(Math.max(1, Math.min(dayOfYear(), max)));
            renderSelectedDay();
            renderHistory();
          }
        });
      }
    }

    let lastPlanError = null;
    async function ensurePlanLoaded(planName) {
      if (plans[planName]) return true;
      try {
        const p = await fetchPlan(planName);
        plans[planName] = p;
        lastPlanError = null;
        return true;
      } catch (e) {
        console.error(`Failed to load plan ${planName}:`, e);
        plans[planName] = null;
        lastPlanError = e && e.message ? e.message : String(e);
        return false;
      }
    }

    function showPlanStatus(msg) {
      const status = document.getElementById('planStatus');
      const statusText = document.getElementById('planStatusText');
      if (status && statusText) {
        statusText.textContent = msg;
        status.hidden = false;
      }
    }

    function hidePlanStatus() {
      const status = document.getElementById('planStatus');
      if (status) status.hidden = true;
    }

    function getSelectedPlan() {
      return planSelect.value || 'canonical';
    }

    function renderSelectedDay() {
      const planName = getSelectedPlan();
      const plan = plans[planName];
      // If daySelect has a meaningful value use it; otherwise fall back to computed dayOfYear()
      const day = (daySelect && daySelect.value) ? Number(daySelect.value) : dayOfYear();
      if (dayLabel) dayLabel.textContent = `Day ${day} • ${planName}`;
      if (planDayLabel) planDayLabel.textContent = `Day ${day}`;
      if (!readingListEl) return;
      readingListEl.innerHTML = '';

      if (!plan) {
        readingListEl.textContent = 'Plan not loaded.';
        if (progressEl) progressEl.textContent = '';
        return;
      }

      const dayExists = Object.prototype.hasOwnProperty.call(plan, String(day));
      const entries = dayExists ? plan[String(day)] : null;
      if (!dayExists) {
        readingListEl.textContent = 'No reading for this day.';
      } else if (entries && entries.length === 0) {
        readingListEl.textContent = 'Rest day (no assigned chapters).';
      } else if (entries && entries.length > 0) {
        const ul = document.createElement('ul');
        for (const e of entries) {
          const li = document.createElement('li');
          li.textContent = `${e.book} ${e.chapter}`;
          ul.appendChild(li);
        }
        readingListEl.appendChild(ul);
      }

      // hide the verbose progress note (was `${entries.length} item(s) — Plan: ${planName}`)
      if (progressEl) progressEl.textContent = '';
    }

    function markCompleted() {
      const planName = getSelectedPlan();
      const day = daySelect ? Number(daySelect.value) : dayOfYear();
      const completed = loadCompleted(planName);
      if (!completed.includes(day)) {
        completed.push(day);
        completed.sort((a, b) => a - b);
        saveCompleted(planName, completed);
      }
      renderHistory();
    }

    function renderHistory() {
      const planName = getSelectedPlan();
      const completed = loadCompleted(planName);
      if (!completedDaysEl) return;
      completedDaysEl.innerHTML = '';
      if (completed.length === 0) {
        const li = document.createElement('li');
        li.textContent = 'No completed days yet.';
        completedDaysEl.appendChild(li);
        return;
      }
      for (const d of completed) {
        const li = document.createElement('li');
        li.textContent = `Day ${d}`;
        completedDaysEl.appendChild(li);
      }
    }

    function populateDays(planName) {
      if (!daySelect) return 0;
      const plan = plans[planName];
      if (!plan) { daySelect.innerHTML = '<option value="">Select a plan first</option>'; return 0; }
      const keys = Object.keys(plan).map(n => Number(n)).filter(n=>!isNaN(n));
      const maxDay = keys.length ? Math.max(...keys) : 0;
      daySelect.innerHTML = '';
      for (let i = 1; i <= maxDay; i++) {
        const opt = document.createElement('option');
        opt.value = String(i);
        opt.textContent = `Day ${i}`;
        daySelect.appendChild(opt);
      }
      return maxDay;
    }

    function renderFullPlan() {
      if (!fullPlanEl) return;
      fullPlanEl.innerHTML = '';
      const planName = getSelectedPlan();
      const plan = plans[planName];
      if (!plan) { fullPlanEl.textContent = 'Plan not loaded.'; return; }
      const keys = Object.keys(plan).map(n=>Number(n)).filter(n=>!isNaN(n)).sort((a,b)=>a-b);
      for (const d of keys) {
        const entries = plan[String(d)] || [];
        const dayRow = document.createElement('div'); dayRow.className = 'day-row';
        const head = document.createElement('div'); head.className = 'day-head';
  const label = document.createElement('div'); label.className = 'label'; label.textContent = `Day ${d}`;
  // show a simple numeric count (no "item(s)" text)
  const count = document.createElement('div'); count.className = 'count'; count.textContent = String(entries.length);
        head.appendChild(label); head.appendChild(count);
        const entriesEl = document.createElement('ul'); entriesEl.className = 'day-entries';
        for (const e of entries) {
          const li = document.createElement('li'); li.textContent = `${e.book} ${e.chapter}`; entriesEl.appendChild(li);
        }
        head.addEventListener('click', ()=>{
          const expanded = dayRow.classList.toggle('expanded');
          // set selected day when a day is clicked
          if (daySelect) daySelect.value = String(d);
          renderSelectedDay();
        });
        dayRow.appendChild(head);
        dayRow.appendChild(entriesEl);
        fullPlanEl.appendChild(dayRow);
      }
    }

    async function loadVerseOfTheDay() {
      try {
        // Try loading the large local verses file (365 entries)
        const res = await fetch('data/verses.json');
        if (res.ok) {
          const verses = await res.json();
          const day = dayOfYear();
          const idx = ((day - 1) % (verses.length || 1));
          const pick = verses[idx] || verses[0] || null;
          const verseText = document.getElementById('verse-text');
          const verseRef = document.getElementById('verse-ref');
          if (pick) {
            if (verseText) verseText.textContent = pick.text;
            if (verseRef) verseRef.textContent = pick.ref;
            return;
          }
        }
      } catch (e) {
        // fall through to fallback sample
        console.warn('Could not load data/verses.json, falling back to sample verses.', e);
      }

      // Fallback: small local sample (keeps app functional if file is missing)
      try {
        const sample = [
          { text: "The LORD is my shepherd; I shall not want.", ref: "Psalm 23:1" },
          { text: "Your word is a lamp to my feet and a light to my path.", ref: "Psalm 119:105" },
          { text: "For God so loved the world, that he gave his only Son.", ref: "John 3:16" }
        ];
        const pick = sample[Math.floor(Math.random() * sample.length)];
        const verseText = document.getElementById('verse-text');
        const verseRef = document.getElementById('verse-ref');
        if (verseText) verseText.textContent = pick.text;
        if (verseRef) verseRef.textContent = pick.ref;
      } catch (e) {
        console.error('Verse load error', e);
      }
    }

    // Initialize
    init().catch(err => {
      console.error('Init failed', err);
      if (readingListEl) readingListEl.textContent = 'Failed to load reading plans. See console.';
    });

  })();

  // --- Books module (original bible-reader features) ---
  (function(){
    const BOOKS = [
      {id:"genesis", name:"Genesis", chapters:50},
      {id:"exodus", name:"Exodus", chapters:40},
      {id:"leviticus", name:"Leviticus", chapters:27},
      {id:"numbers", name:"Numbers", chapters:36},
      {id:"deuteronomy", name:"Deuteronomy", chapters:34},
      {id:"joshua", name:"Joshua", chapters:24},
      {id:"judges", name:"Judges", chapters:21},
      {id:"ruth", name:"Ruth", chapters:4},
      {id:"1-samuel", name:"1 Samuel", chapters:31},
      {id:"2-samuel", name:"2 Samuel", chapters:24},
      {id:"1-kings", name:"1 Kings", chapters:22},
      {id:"2-kings", name:"2 Kings", chapters:25},
      {id:"1-chronicles", name:"1 Chronicles", chapters:29},
      {id:"2-chronicles", name:"2 Chronicles", chapters:36},
      {id:"ezra", name:"Ezra", chapters:10},
      {id:"nehemiah", name:"Nehemiah", chapters:13},
      {id:"esther", name:"Esther", chapters:10},
      {id:"job", name:"Job", chapters:42},
      {id:"psalms", name:"Psalms", chapters:150},
      {id:"proverbs", name:"Proverbs", chapters:31},
      {id:"ecclesiastes", name:"Ecclesiastes", chapters:12},
      {id:"song-of-solomon", name:"Song of Solomon", chapters:8},
      {id:"isaiah", name:"Isaiah", chapters:66},
      {id:"jeremiah", name:"Jeremiah", chapters:52},
      {id:"lamentations", name:"Lamentations", chapters:5},
      {id:"ezekiel", name:"Ezekiel", chapters:48},
      {id:"daniel", name:"Daniel", chapters:12},
      {id:"hosea", name:"Hosea", chapters:14},
      {id:"joel", name:"Joel", chapters:3},
      {id:"amos", name:"Amos", chapters:9},
      {id:"obadiah", name:"Obadiah", chapters:1},
      {id:"jonah", name:"Jonah", chapters:4},
      {id:"micah", name:"Micah", chapters:7},
      {id:"nahum", name:"Nahum", chapters:3},
      {id:"habakkuk", name:"Habakkuk", chapters:3},
      {id:"zephaniah", name:"Zephaniah", chapters:3},
      {id:"haggai", name:"Haggai", chapters:2},
      {id:"zechariah", name:"Zechariah", chapters:14},
      {id:"malachi", name:"Malachi", chapters:4},
      {id:"matthew", name:"Matthew", chapters:28},
      {id:"mark", name:"Mark", chapters:16},
      {id:"luke", name:"Luke", chapters:24},
      {id:"john", name:"John", chapters:21},
      {id:"acts", name:"Acts", chapters:28},
      {id:"romans", name:"Romans", chapters:16},
      {id:"1-corinthians", name:"1 Corinthians", chapters:16},
      {id:"2-corinthians", name:"2 Corinthians", chapters:13},
      {id:"galatians", name:"Galatians", chapters:6},
      {id:"ephesians", name:"Ephesians", chapters:6},
      {id:"philippians", name:"Philippians", chapters:4},
      {id:"colossians", name:"Colossians", chapters:4},
      {id:"1-thessalonians", name:"1 Thessalonians", chapters:5},
      {id:"2-thessalonians", name:"2 Thessalonians", chapters:3},
      {id:"1-timothy", name:"1 Timothy", chapters:6},
      {id:"2-timothy", name:"2 Timothy", chapters:4},
      {id:"titus", name:"Titus", chapters:3},
      {id:"philemon", name:"Philemon", chapters:1},
      {id:"hebrews", name:"Hebrews", chapters:13},
      {id:"james", name:"James", chapters:5},
      {id:"1-peter", name:"1 Peter", chapters:5},
      {id:"2-peter", name:"2 Peter", chapters:3},
      {id:"1-john", name:"1 John", chapters:5},
      {id:"2-john", name:"2 John", chapters:1},
      {id:"3-john", name:"3 John", chapters:1},
      {id:"jude", name:"Jude", chapters:1},
      {id:"revelation", name:"Revelation", chapters:22}
    ];

    const STORAGE_KEY = 'bible-tracker';
    let state = { selectedBookId: 'genesis', readState: {} };
    try { const saved = localStorage.getItem(STORAGE_KEY); if (saved) state = JSON.parse(saved); } catch(e){}

    // DOM refs
    const booksList = document.getElementById('booksList');
    const chaptersContainer = document.getElementById('chaptersContainer');
    const bookTitle = document.getElementById('bookTitle');
    const bookMeta = document.getElementById('bookMeta');
    const overallFill = document.getElementById('overallFill');
    const overallText = document.getElementById('overallText');
    const donutText = document.getElementById('donutText');
    const markAllBtn = document.getElementById('markAllBtn');
    const clearBtn = document.getElementById('clearBtn');
    const exportBtn = document.getElementById('exportBtn');
    const importFile = document.getElementById('importFile');

    function saveState(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }

    function getBookProgress(bookId){
      const b = BOOKS.find(b=>b.id===bookId);
      const readCount = Object.keys(state.readState[bookId]||{}).length;
      const pct = Math.round(readCount / b.chapters *100);
      return { readCount, total:b.chapters, pct };
    }

    function renderBooks(){
      if(!booksList) return;
      booksList.innerHTML = '';
      BOOKS.forEach(b=>{
        const progress = getBookProgress(b.id);
        const div = document.createElement('div');
        div.className = 'book-item' + (b.id===state.selectedBookId? ' active':'' );
        div.innerHTML = `<span>${b.name} (${progress.readCount}/${progress.total})</span><span>${progress.pct}%</span>`;
        div.onclick = ()=>{ state.selectedBookId = b.id; saveState(); render(); };
        booksList.appendChild(div);
      });
    }

    function renderChapters(filter='all'){
      if(!chaptersContainer) return;
      chaptersContainer.innerHTML = '';
      const book = BOOKS.find(b=>b.id===state.selectedBookId);
      if(bookTitle) bookTitle.textContent = book.name;
      const prog = getBookProgress(book.id);
      if(bookMeta) bookMeta.textContent = `${prog.readCount} / ${prog.total} chapters — ${prog.pct}%`;

      for(let i=1;i<=book.chapters;i++){
        const read = !!(state.readState[book.id] && state.readState[book.id][i]);
        if(filter==='read' && !read) continue;
        if(filter==='unread' && read) continue;
        const btn = document.createElement('button');
        btn.className = 'chapter' + (read? ' read':'');
        btn.textContent = i;
        btn.onclick = ()=>{ toggleChapter(book.id,i); };
        chaptersContainer.appendChild(btn);
      }
    }

    function toggleChapter(bookId,ch){
      state.readState[bookId] = state.readState[bookId]||{};
      if(state.readState[bookId][ch]) delete state.readState[bookId][ch];
      else state.readState[bookId][ch] = true;
      saveState(); render();
    }

    if(markAllBtn) markAllBtn.onclick = ()=>{
      const b = BOOKS.find(b=>b.id===state.selectedBookId);
      state.readState[b.id] = {};
      for(let i=1;i<=b.chapters;i++) state.readState[b.id][i]=true;
      saveState(); render();
    };

    if(clearBtn) clearBtn.onclick = ()=>{ delete state.readState[state.selectedBookId]; saveState(); render(); };

    if(exportBtn) exportBtn.onclick = ()=>{
      const blob = new Blob([JSON.stringify(state,null,2)],{type:'application/json'});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download='bible-progress.json'; a.click(); URL.revokeObjectURL(url);
    };

    if(importFile) importFile.onchange = (e)=>{
      const file = e.target.files[0]; if(!file) return; const reader = new FileReader();
      reader.onload = ev=>{ state = JSON.parse(ev.target.result); saveState(); render(); e.target.value=''; };
      reader.readAsText(file);
    };

    document.querySelectorAll('.filters .btn').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        document.querySelectorAll('.filters .btn').forEach(b=>b.classList.remove('active'));
        btn.classList.add('active');
        renderChapters(btn.dataset.filter);
      });
    });

    function renderOverall(){
      const total = BOOKS.reduce((sum,b)=>sum+b.chapters,0);
      const read = BOOKS.reduce((sum,b)=>sum+(Object.keys(state.readState[b.id]||{}).length),0);
      const pct = Math.round(read/total*100);
      if(overallFill) overallFill.style.width = pct + '%';
      if(overallText) overallText.textContent = `${read} / ${total} chapters`;
      if(donutText) donutText.textContent = pct + '%';
    }

    function render(){ renderBooks(); renderChapters(document.querySelector('.filters .btn.active')?.dataset.filter || 'all'); renderOverall(); }

    // View toggle UI with bottom navigation
    const booksSidebar = document.getElementById('booksSidebar');
    const booksView = document.getElementById('books-view');
    const planView = document.getElementById('plans-view');
    const homeView = document.getElementById('home-view');
    const verseCard = document.getElementById('verse');

    function setActiveNav(nav) {
      document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.toggle('active', item.dataset.nav === nav);
      });
    }

    function showBooks(){
      if(homeView) homeView.hidden = true;
      if(booksSidebar) booksSidebar.hidden = false;
      if(booksView) booksView.hidden = false;
      if(planView) planView.hidden = true;
      if(verseCard) verseCard.hidden = false;
      setActiveNav('books');
    }

    function showPlans(){
      if(homeView) homeView.hidden = true;
      if(booksSidebar) booksSidebar.hidden = true;
      if(booksView) booksView.hidden = true;
      if(planView) planView.hidden = false;
      if(verseCard) verseCard.hidden = true;
      setActiveNav('plans');
    }

    function showHome(){
      if(homeView) homeView.hidden = false;
      if(booksSidebar) booksSidebar.hidden = true;
      if(booksView) booksView.hidden = true;
      if(planView) planView.hidden = true;
      if(verseCard) verseCard.hidden = false;
      setActiveNav('home');
    }

    // Bottom navigation listeners
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', () => {
        const nav = item.dataset.nav;
        if (nav === 'home') showHome();
        else if (nav === 'books') { showBooks(); render(); }
        else if (nav === 'plans') showPlans();
        else if (nav === 'discover') { alert('Discover coming soon'); }
        else if (nav === 'more') { alert('More coming soon'); }
      });
    });

    // Initialize to Home view
    showHome();
    render();
  })();

});
