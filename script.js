document.addEventListener("DOMContentLoaded", async () => {
  const readingList = document.getElementById("reading-list");
  const progressText = document.getElementById("progress");
  const completedList = document.getElementById("completed-days");
  const markBtn = document.getElementById("mark-complete");
  const verseText = document.getElementById("verse-text");
  const verseRef = document.getElementById("verse-ref");
  const verseLikeBtn = document.getElementById('verseLikeBtn');
  const verseLikeCountEl = document.getElementById('verseLikeCount');

  const homeAnnouncements = document.getElementById('homeAnnouncements');
  const homeSermons = document.getElementById('homeSermons');
  const postsViewEl = null; // will reference posts-view when created
  const kidsGallery = document.getElementById('kidsGallery');
  const kidsUpload = document.getElementById('kidsUpload');
  const kidsStatus = document.getElementById('kidsStatus');
  const kidsLoginBtn = document.getElementById('kidsLoginBtn');
  const kidsLogoutBtn = document.getElementById('kidsLogoutBtn');
  const kidsRefreshBtn = document.getElementById('kidsRefreshBtn');
  const kidsAdminHint = document.getElementById('kidsAdminHint');
  const quizQuestionEl = document.getElementById('quizQuestion');
  const quizOptionsEl = document.getElementById('quizOptions');
  const quizFeedbackEl = document.getElementById('quizFeedback');

  const startOfYear = new Date(new Date().getFullYear(), 0, 1);
  const today = new Date();
  const dayOfYear = Math.floor((today - startOfYear) / (1000 * 60 * 60 * 24)) + 1;

  let readingPlan = {};
  // Do not read or persist any local data. Clear known keys and disable future writes.
  try {
    (function disableLocalPersistence() {
      try {
        const prefixes = ['completedDays:', 'bible-tracker', 'quizProgress:v1', 'pushPrompted:v1', 'pushSubscription'];
        for (let i = localStorage.length - 1; i >= 0; i--) {
          const k = localStorage.key(i);
          if (!k) continue;
          if (prefixes.some(p => k.startsWith(p))) localStorage.removeItem(k);
        }
        // Prevent further writes to localStorage in this testing environment
        try { localStorage.setItem = function(){}; localStorage.removeItem = function(){}; localStorage.clear = function(){}; } catch(e) {}
      } catch (e) { console.warn('Could not fully disable local persistence', e); }
    })();
  } catch (e) { /* ignore in environments without localStorage */ }
  let completedDays = [];

  const announcementsSeed = [
    { title: 'Christmas Service Schedule', priority: 'high', tag: 'Services', date: '2025-12-24' },
    { title: 'Youth Retreat Registration', priority: 'normal', tag: 'Youth', date: '2026-01-05' },
    { title: 'Prayer Night Every Wednesday', priority: 'low', tag: 'Prayer', date: '2026-01-03' },
  ];

  // YouTube Channel ID for FCM Liverpool
  // Using channel handle instead of ID to ensure we get the right channel
  const YOUTUBE_CHANNEL_HANDLE = '@FCMLiverpool';
  const YOUTUBE_API_KEY = window.YOUTUBE_API_KEY || 'YOUR_API_KEY';
  
  let sermonsSeed = [
    { title: 'Hope in Uncertain Times', speaker: 'FCM Liverpool', youtubeId: 'hY7m5jjJ9mM', date: '2025-12-12' },
    { title: 'Walking by Faith', speaker: 'FCM Liverpool', youtubeId: 'kxopViU98Xo', date: '2025-12-05' },
    { title: 'The Gift of Peace', speaker: 'FCM Liverpool', youtubeId: 'LXb3EKWsInQ', date: '2025-11-28' },
  ];

  // Fetch latest sermons from YouTube
  async function fetchLatestSermons() {
    // Prefer server-side proxy to keep the API key secret. Falls back to client-side if needed.
    try {
      const proxyUrl = `/.netlify/functions/fetchYouTube?handle=${encodeURIComponent(YOUTUBE_CHANNEL_HANDLE)}&max=6`;
      const res = await fetch(proxyUrl);
      if (res.ok) {
        const json = await res.json();
        if (json.items && json.items.length) {
          // normalize to our local sermons format
          sermonsSeed = json.items.map(i => ({ title: i.snippet?.title || 'Untitled', speaker: 'FCM Liverpool', youtubeId: i.id?.videoId || (i.id && i.id.videoId) || '', date: i.snippet?.publishedAt ? new Date(i.snippet.publishedAt).toLocaleDateString('en-GB') : '' }));
          renderSermons();
          return;
        }
      } else {
        console.warn('YouTube proxy returned non-OK:', res.status);
      }

      // If proxy fails and a client API key is present, fall back to client-side fetch
      if (YOUTUBE_API_KEY && YOUTUBE_API_KEY !== 'YOUR_API_KEY') {
        console.log('Proxy failed — falling back to client-side YouTube fetch');
        // small, direct search for videos
        const directResponse = await fetch(
          `https://www.googleapis.com/youtube/v3/search?key=${YOUTUBE_API_KEY}&q=FCM+Liverpool+sermon&type=video&order=date&maxResults=6&part=snippet`
        );
        if (directResponse.ok) {
          const directData = await directResponse.json();
          sermonsSeed = directData.items.map(item => {
            const videoId = item.id?.videoId || item.id;
            return {
              title: item.snippet?.title || 'Untitled',
              speaker: 'FCM Liverpool',
              youtubeId: typeof videoId === 'string' ? videoId : '',
              date: item.snippet?.publishedAt ? new Date(item.snippet.publishedAt).toLocaleDateString('en-GB', { year: 'numeric', month: '2-digit', day: '2-digit' }) : ''
            };
          }).filter(sermon => sermon.youtubeId);
          renderSermons();
          return;
        }
      }

      console.log('Using fallback sermon data');
    } catch (error) {
      console.error('❌ Could not fetch latest sermons from YouTube or proxy:', error);
      console.log('Using fallback sermon data');
    }
  }

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

  const quizStorageKey = 'quizProgress:v1';

  // Supabase config. For production supply these via your own secure mechanism.
  // Do NOT hardcode real keys here to avoid exposing secrets in the repo/build.
  const SUPABASE_URL = window.SUPABASE_URL || '';
  const SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY || '';
  const SUPABASE_BUCKET = 'kids-zone';
  let supabaseClient = null;
  let supabaseUser = null;
  let supabaseProfile = null;
  let kidsGalleryData = [];
  let kidsBackendMode = 'local'; // 'local' fallback, 'supabase' when pulling from backend
  let kidsLoading = false;

  // Web push configuration (replace VAPID key; subscribe URL already points to Netlify function)
  const VAPID_PUBLIC_KEY = window.VAPID_PUBLIC_KEY || '';
  const PUSH_SUBSCRIBE_URL = '/.netlify/functions/subscribe';
  const pushPromptKey = 'pushPrompted:v1';

  const urlBase64ToUint8Array = (base64String) => {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
    return outputArray;
  };

  async function saveSubscription(subscription) {
    try { localStorage.setItem('pushSubscription', JSON.stringify(subscription)); } catch (_) {}
    if (!PUSH_SUBSCRIBE_URL || PUSH_SUBSCRIBE_URL.includes('your-edge-function-or-api')) return;
    try {
      await fetch(PUSH_SUBSCRIBE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription })
      });
    } catch (err) {
      console.warn('push subscription send failed', err);
    }
  }

  async function subscribeToPush(registration) {
    const existing = await registration.pushManager.getSubscription();
    if (existing) {
      await saveSubscription(existing);
      return existing;
    }
    if (!VAPID_PUBLIC_KEY || VAPID_PUBLIC_KEY.startsWith('REPLACE_WITH')) {
      console.warn('Set VAPID_PUBLIC_KEY to enable push.');
      return null;
    }
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
    });
    await saveSubscription(subscription);
    return subscription;
  }

  async function initPush() {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) return;
    const registration = await navigator.serviceWorker.ready;
    if (Notification.permission === 'granted') {
      await subscribeToPush(registration);
      return;
    }
    const alreadyAsked = localStorage.getItem(pushPromptKey) === '1';
    if (Notification.permission === 'default' && !alreadyAsked) {
      const result = await Notification.requestPermission();
      localStorage.setItem(pushPromptKey, '1');
      if (result === 'granted') {
        await subscribeToPush(registration);
      }
    }
  }

  initPush().catch(err => console.warn('push init failed', err));

  const kidsSample = [
    { title: 'Nativity craft', child: 'Ella (8)', signedUrl: null, approved: true },
    { title: 'Rainbow promise', child: 'Micah (6)', signedUrl: null, approved: true },
    { title: 'Noah’s ark', child: 'Leah (10)', signedUrl: null, approved: true }
  ];
  kidsGalleryData = kidsSample.slice();

  function supabaseConfigured() {
    return !!SUPABASE_URL && !!SUPABASE_ANON_KEY && !SUPABASE_URL.includes('YOUR_SUPABASE_PROJECT') && !SUPABASE_ANON_KEY.includes('YOUR_SUPABASE_ANON_KEY');
  }

  function isAdmin() {
    return supabaseProfile && (supabaseProfile.role === 'admin' || supabaseProfile.role === 'super_admin');
  }

  function setKidsStatus(message, isError = false) {
    if (kidsStatus) {
      kidsStatus.textContent = message;
      kidsStatus.classList.toggle('warn', isError);
    }
  }

  function getSupabaseClient() {
    if (!supabaseConfigured()) return null;
    if (!window.supabase) {
      console.warn('Supabase JS not loaded');
      return null;
    }
    if (supabaseClient) return supabaseClient;
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    supabaseClient.auth.onAuthStateChange(async (_event, session) => {
      supabaseUser = session?.user || null;
      supabaseProfile = await fetchProfile();
      updateKidsAuthUI();
      refreshKidsFromSupabase();
    });
    return supabaseClient;
  }

  // Verse likes: fetch and increment via Supabase RPCs
  async function loadVerseLikes(id = 'verse_of_day') {
    try {
      const client = getSupabaseClient();
      if (!client) return;
      const { data, error } = await client.rpc('get_verse_likes', { p_id: id });
      if (error) { console.warn('get_verse_likes failed', error); return; }
      if (data && data.length) {
        verseLikeCountEl.textContent = String(data[0].likes || 0);
      } else {
        verseLikeCountEl.textContent = '0';
      }
    } catch (e) { console.warn('loadVerseLikes error', e); }
  }

  async function likeVerse(id = 'verse_of_day') {
    try {
      const client = getSupabaseClient();
      if (!client) {
        // If not configured, do a quick optimistic increment locally
        verseLikeCountEl.textContent = String(Number(verseLikeCountEl.textContent || '0') + 1);
        return;
      }
      const { data, error } = await client.rpc('increment_verse_like', { p_id: id });
      if (error) { console.warn('increment_verse_like failed', error); return; }
      // RPC returns the new likes (bigint) - Supabase returns as string sometimes
      verseLikeCountEl.textContent = String(data || data === 0 ? data : (data && data[0] && data[0].likes) || '0');
    } catch (e) { console.warn('likeVerse error', e); }
  }

  if (verseLikeBtn) {
    verseLikeBtn.addEventListener('click', async () => {
      // optimistic UI
      verseLikeCountEl.textContent = String(Number(verseLikeCountEl.textContent || '0') + 1);
      await likeVerse('verse_of_day');
    });
  }

  async function fetchProfile() {
    const client = getSupabaseClient();
    if (!client || !supabaseUser) return null;
    const { data, error } = await client
      .from('profiles')
      .select('role, full_name')
      .eq('id', supabaseUser.id)
      .maybeSingle();
    if (error) {
      console.warn('Could not load profile', error);
      return null;
    }
    return data || null;
  }

  async function refreshSession() {
    const client = getSupabaseClient();
    if (!client) return;
    const { data, error } = await client.auth.getSession();
    if (error) {
      console.warn('Session fetch failed', error);
      return;
    }
    supabaseUser = data?.session?.user || null;
    supabaseProfile = supabaseUser ? await fetchProfile() : null;
    updateKidsAuthUI();
  }

  function updateKidsAuthUI() {
    const configured = supabaseConfigured();
    const loggedIn = !!supabaseUser;
    if (kidsUpload) kidsUpload.disabled = !configured || !loggedIn || kidsLoading;
    if (kidsLoginBtn) kidsLoginBtn.hidden = !configured || loggedIn;
    if (kidsLogoutBtn) kidsLogoutBtn.hidden = !loggedIn;
    if (kidsRefreshBtn) kidsRefreshBtn.hidden = !configured;
    if (kidsAdminHint) kidsAdminHint.hidden = !(loggedIn && isAdmin());

    if (!configured) {
      setKidsStatus('Supabase URL/anon key not set. Using local sample gallery.', false);
      return;
    }
    if (kidsLoading) {
      setKidsStatus('Loading uploads…', false);
      return;
    }
    if (loggedIn) {
      const name = supabaseProfile?.full_name || supabaseUser.email || 'Signed in';
      setKidsStatus(`${name} — uploads visible per your role.`, false);
    } else {
      setKidsStatus('Sign in to upload (uploads stay hidden until approved).', false);
    }
  }

  async function refreshKidsFromSupabase(showErrors = false) {
    const client = getSupabaseClient();
    if (!client) {
      kidsBackendMode = 'local';
      kidsGalleryData = kidsSample.slice();
      renderKids();
      return;
    }

    kidsLoading = true;
    updateKidsAuthUI();

    const { data: uploads, error } = await client
      .from('kids_uploads')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      if (showErrors) setKidsStatus(`Could not load uploads: ${error.message}`, true);
      kidsBackendMode = 'local';
      kidsGalleryData = kidsSample.slice();
      kidsLoading = false;
      renderKids();
      return;
    }

    let urlMap = {};
    const paths = uploads.map(u => u.file_path).filter(Boolean);
    if (paths.length) {
      const { data: signed, error: signedErr } = await client
        .storage
        .from(SUPABASE_BUCKET)
        .createSignedUrls(paths, 3600);

      if (!signedErr && signed) {
        urlMap = Object.fromEntries(signed.map(item => [item.path, item.signedUrl]));
      } else if (signedErr && showErrors) {
        console.warn('Signed URL generation failed', signedErr);
      }
    }

    kidsGalleryData = uploads.map(u => ({
      ...u,
      signedUrl: urlMap[u.file_path] || null
    }));
    kidsBackendMode = 'supabase';
    kidsLoading = false;
    renderKids();

    if (supabaseUser) {
      setKidsStatus(kidsGalleryData.length ? 'Uploads fetched from Supabase.' : 'Signed in. No uploads yet.', false);
    }
  }

  async function handleKidsLogin() {
    const client = getSupabaseClient();
    if (!client) {
      alert('Set SUPABASE_URL and SUPABASE_ANON_KEY first.');
      return;
    }
    const email = prompt('Email for Supabase login (create user in Supabase Auth)');
    if (!email) return;
    const password = prompt('Password');
    if (!password) return;
    const { error } = await client.auth.signInWithPassword({ email, password });
    if (error) {
      alert(`Login failed: ${error.message}`);
      return;
    }
    await refreshSession();
    await refreshKidsFromSupabase(true);
  }

  async function handleKidsLogout() {
    const client = getSupabaseClient();
    if (!client) return;
    await client.auth.signOut();
    supabaseUser = null;
    supabaseProfile = null;
    kidsBackendMode = 'local';
    kidsGalleryData = kidsSample.slice();
    updateKidsAuthUI();
    renderKids();
  }

  async function handleKidsUpload(file) {
    const client = getSupabaseClient();
    if (!client) {
      alert('Supabase not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY.');
      return;
    }
    if (!supabaseUser) {
      alert('Please sign in before uploading.');
      return;
    }

    const path = `${supabaseUser.id}/${Date.now()}-${file.name}`;

    const { error: uploadError } = await client.storage
      .from(SUPABASE_BUCKET)
      .upload(path, file, {
        upsert: false,
        metadata: { approved: 'false', kind: file.type || 'image' }
      });

    if (uploadError) {
      alert(`Upload failed: ${uploadError.message}`);
      return;
    }

    const { error: insertError } = await client
      .from('kids_uploads')
      .insert({
        user_id: supabaseUser.id,
        file_path: path,
        kind: file.type || 'image',
        approved: false
      });

    if (insertError) {
      await client.storage.from(SUPABASE_BUCKET).remove([path]);
      alert(`Could not save upload record: ${insertError.message}`);
      return;
    }

    setKidsStatus('Upload received. Pending admin approval.', false);
    await refreshKidsFromSupabase(true);
  }

  async function approveKidsUpload(id, filePath) {
    if (!isAdmin()) {
      alert('Only admins can approve.');
      return;
    }
    const client = getSupabaseClient();
    if (!client) return;

    const download = await client.storage.from(SUPABASE_BUCKET).download(filePath);
    if (download.error) {
      alert(`Failed to download object for approval: ${download.error.message}`);
      return;
    }

    const reupload = await client.storage.from(SUPABASE_BUCKET).update(filePath, download.data, {
      upsert: true,
      metadata: { approved: 'true' }
    });

    if (reupload.error) {
      alert(`Could not stamp approval metadata: ${reupload.error.message}`);
      return;
    }

    const { error: updateError } = await client
      .from('kids_uploads')
      .update({ approved: true, approved_at: new Date().toISOString(), approved_by: supabaseUser?.id || null })
      .eq('id', id);

    if (updateError) {
      alert(`Could not mark approved: ${updateError.message}`);
      return;
    }

    await refreshKidsFromSupabase(true);
  }

  async function deleteKidsUpload(id, filePath) {
    if (!isAdmin()) {
      alert('Only admins can delete uploads.');
      return;
    }
    const client = getSupabaseClient();
    if (!client) return;

    const { error: removeError } = await client.storage.from(SUPABASE_BUCKET).remove([filePath]);
    if (removeError) {
      alert(`Storage delete failed: ${removeError.message}`);
      return;
    }

    const { error: deleteError } = await client.from('kids_uploads').delete().eq('id', id);
    if (deleteError) {
      alert(`DB delete failed: ${deleteError.message}`);
    }
    await refreshKidsFromSupabase(true);
  }

  function renderKids() {
    if (!kidsGallery) return;
    kidsGallery.innerHTML = '';

    if (!kidsGalleryData.length) {
      kidsGallery.innerHTML = '<p class="small muted">No uploads yet.</p>';
      return;
    }

    kidsGalleryData.forEach((k) => {
      const card = document.createElement('article');
      card.className = 'kid-card';
      const placeholder = `<div class="kid-placeholder">🎨</div>`;
      const media = k.signedUrl ? `<img src="${k.signedUrl}" alt="${k.title || 'Kids upload'}" loading="lazy">` : placeholder;
      const displayTitle = k.title || (k.file_path ? k.file_path.split('/').pop() : 'Kids upload');
      const ownerLabel = kidsBackendMode === 'supabase'
        ? (k.user_id === supabaseUser?.id ? 'Uploaded by you' : 'Uploaded by community')
        : (k.child || 'Parent upload');

      const badges = [];
      if (kidsBackendMode === 'supabase' && !k.approved) badges.push('<span class="kid-badge pending">Pending</span>');
      if (kidsBackendMode === 'supabase' && k.user_id === supabaseUser?.id) badges.push('<span class="kid-badge mine">Yours</span>');

      const actions = [];
      if (kidsBackendMode === 'supabase' && isAdmin()) {
        if (!k.approved) actions.push(`<button class="btn tiny" data-approve="${k.id}" data-path="${k.file_path}">Approve</button>`);
        actions.push(`<button class="btn tiny warn" data-delete="${k.id}" data-path="${k.file_path}">Delete</button>`);
      }

      card.innerHTML = `
        ${media}
        <div class="kid-body">
          ${badges.length ? `<div class="kid-badges">${badges.join('')}</div>` : ''}
          <p class="item-title">${displayTitle}</p>
          <p class="small muted">${ownerLabel}${k.approved === false && kidsBackendMode === 'supabase' && !isAdmin() ? ' — pending review' : ''}</p>
          ${actions.length ? `<div class="kid-actions">${actions.join('')}</div>` : ''}
        </div>
      `;

      card.querySelectorAll('button[data-approve]').forEach(btn => {
        btn.addEventListener('click', async () => {
          const targetId = Number(btn.dataset.approve);
          const path = btn.dataset.path;
          await approveKidsUpload(targetId, path);
        });
      });

      card.querySelectorAll('button[data-delete]').forEach(btn => {
        btn.addEventListener('click', async () => {
          const targetId = Number(btn.dataset.delete);
          const path = btn.dataset.path;
          if (confirm('Delete this upload?')) {
            await deleteKidsUpload(targetId, path);
          }
        });
      });

      kidsGallery.appendChild(card);
    });
  }

  function renderAnnouncements() {
    if (!homeAnnouncements) return;
    homeAnnouncements.innerHTML = '';
    // Announcements are loaded from language-specific JSON when available
    const items = window.__ANNOUNCEMENTS || announcementsSeed;
    items.forEach(item => {
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
    // Use at most three recent sermons from data or seed
    const items = (window.__EMBEDDED_SERMONS || window.__EMBEDDED_SERMONS || sermonsSeed).slice(0,3);
    items.forEach(s => {
      const anchor = document.createElement('a');
      anchor.href = `https://www.youtube.com/watch?v=${s.youtubeId}`;
      anchor.target = '_blank';
      anchor.rel = 'noopener noreferrer';
      anchor.className = 'sermon-link';
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
      anchor.appendChild(card);
      homeSermons.appendChild(anchor);
    });
  }

  function renderPosts() {
    // Posts are shown on the Posts view (separate tab). Render to the posts-view container when present.
    const postsContainer = document.getElementById('postsContainer') || document.getElementById('homePosts');
    if (!postsContainer) return;
    postsContainer.innerHTML = '';
    const items = window.__POSTS || postsSeed;
    items.forEach(p => {
      const card = document.createElement('article');
      card.className = 'post-card';
      card.innerHTML = `
        <div class="post-head"><span class="avatar">${(p.author && p.author[0]) || 'A'}</span><div><p class="item-title">${p.author}</p><p class="small muted">${p.time}</p></div></div>
        <p class="post-content">${p.content}</p>
      `;
      postsContainer.appendChild(card);
    });
  }

  function renderQuiz() {
    if (!quizQuestionEl || !quizOptionsEl || !quizFeedbackEl) return;
    const items = window.__QUIZ || quizSeed;
    const idx = dayOfYear % items.length;
    const item = items[idx];
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

    // Do not read localStorage for completed days in testing; return empty array.
    function loadCompleted(planName) {
      return [];
    }

    // saveCompleted will NOT persist to localStorage; it writes remote when available.
    async function saveCompleted(planName, arr) {
      try {
        const client = getSupabaseClient();
        if (!client || !supabaseUser) return;
        await client
          .from('reading_progress')
          .upsert([{ user_id: supabaseUser.id, plan_name: planName, completed_days: arr }], { returning: 'minimal' });
      } catch (e) { console.warn('saveCompleted(remote) failed', e); }
    }

    // Check whether remote progress exists for this user. Do NOT write to localStorage.
    async function syncProgressFromRemote() {
      try {
        const client = getSupabaseClient();
        if (!client || !supabaseUser) return false;
        const { data, error } = await client
          .from('reading_progress')
          .select('plan_name')
          .eq('user_id', supabaseUser.id);
        if (error || !data) return false;
        return (data && data.length > 0);
      } catch (e) {
        console.warn('syncProgressFromRemote failed', e);
        return false;
      }
    }

    // Populate in-memory `state.readState` from remote per-chapter progress (completed_chapters jsonb)
    async function syncChaptersFromRemote() {
      try {
        const client = getSupabaseClient();
        if (!client || !supabaseUser) return;
        const { data, error } = await client
          .from('reading_progress')
          .select('plan_name, completed_chapters')
          .eq('user_id', supabaseUser.id);
        if (error || !data) return;
        // Reset in-memory chapter state and populate from remote
        state.readState = {};
        for (const row of data) {
          const chapters = row.completed_chapters || {};
          for (const key of Object.keys(chapters)) {
            try {
              const parts = String(key).split(':');
              if (parts.length < 2) continue;
              const bookName = parts.slice(0, parts.length - 1).join(':');
              const chapterNum = Number(parts[parts.length - 1]);
              if (!chapterNum) continue;
              const bookId = findBookIdByName(bookName) || state.selectedBookId;
              state.readState[bookId] = state.readState[bookId] || {};
              state.readState[bookId][chapterNum] = true;
            } catch (e) { /* ignore malformed keys */ }
          }
        }
        // Re-render with remote-backed in-memory state
        render();
      } catch (e) {
        console.warn('syncChaptersFromRemote failed', e);
      }
    }

    // Clear local progress cache (useful when switching to remote-backed data)
    window.clearLocalProgress = function() {
      try {
        // remove main state key
        localStorage.removeItem(STORAGE_KEY);
        // remove any completedDays:* keys
        try {
          for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && k.startsWith('completedDays:')) {
              localStorage.removeItem(k);
              // adjust index since storage length changed
              i--;
            }
          }
        } catch (e) { /* ignore */ }
        // re-render to reflect cleared state
        state = { selectedBookId: 'genesis', readState: {} };
        saveState(); render();
        console.log('Local progress cleared.');
      } catch (e) { console.warn('clearLocalProgress failed', e); }
    };

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
        if (!ok) showPlanStatus('Failed to load plan. See console.');
        else hidePlanStatus();
        // Plans view is intentionally minimal; do not populate days or render details.
      });
      if (daySelect) daySelect.addEventListener('change', ()=>{ renderSelectedDay(); });
      if (markBtn) markBtn.addEventListener('click', markCompleted);

  // initial population — try to ensure the selected plan is loaded, then populate
      const initialOk = await ensurePlanLoaded(getSelectedPlan());
      if (!initialOk) showPlanStatus('Plan not loaded. ' + (lastPlanError ? lastPlanError : 'You can retry or serve via HTTP.'));
      // show file:// hint when running from filesystem
      if (location && location.protocol === 'file:') {
        const fileHint = document.getElementById('fileHint'); if (fileHint) fileHint.hidden = false;
      }
  // Do not populate days or render selected day — Plans page is intentionally simplified.
      loadVerseOfTheDay('en');
  // Load verse likes counter (global)
  loadVerseLikes().catch(()=>{});

      renderAnnouncements();
      renderSermons();
      renderPosts();
      renderQuiz();

      updateKidsAuthUI();
      await refreshSession();
      await refreshKidsFromSupabase(true);
      // If user is signed in, synchronize remote reading progress into localStorage
      try {
        const hadRemote = await syncProgressFromRemote();
        if (hadRemote) {
          // Remote progress exists. Do NOT perform any client-side migration
          // or automatic clearing of local `completedDays` to preserve local test data.
          console.info('Remote reading_progress rows found; local completedDays left unchanged (no client migration).');
        }
      } catch (e) { /* ignore */ }
      // If signed in, populate in-memory chapter progress from remote so UI reflects server state.
      try { if (supabaseUser) await syncChaptersFromRemote(); } catch (e) { console.warn('initial syncChaptersFromRemote failed', e); }

      // Fallback render (supabase fetch also renders)
      renderKids();
      
      // Fetch latest sermons from YouTube
      fetchLatestSermons();

      if (kidsUpload) {
        kidsUpload.addEventListener('change', (e)=>{
          const file = e.target.files && e.target.files[0];
          if (file) handleKidsUpload(file);
          e.target.value = '';
        });
      }
      if (kidsLoginBtn) kidsLoginBtn.addEventListener('click', handleKidsLogin);
      if (kidsLogoutBtn) kidsLogoutBtn.addEventListener('click', handleKidsLogout);
      if (kidsRefreshBtn) kidsRefreshBtn.addEventListener('click', () => refreshKidsFromSupabase(true));

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
      const plan = (typeof window !== 'undefined' && window.__EMBEDDED_PLANS && window.__EMBEDDED_PLANS[planName]) ? window.__EMBEDDED_PLANS[planName] : plans[planName];
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
          const btn = document.createElement('button');
          btn.className = 'link-like';
          btn.textContent = `${e.book} ${e.chapter}`;
          btn.addEventListener('click', ()=>{
            // Open the Bible page and navigate to the selected book/chapter
            try { window.openBibleChapter && window.openBibleChapter(e.book, Number(e.chapter)); }
            catch(err){ console.warn('openBibleChapter failed', err); }
          });
          li.appendChild(btn);
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
      const plan = (typeof window !== 'undefined' && window.__EMBEDDED_PLANS && window.__EMBEDDED_PLANS[planName]) ? window.__EMBEDDED_PLANS[planName] : (plans && plans[planName]);
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
      const plan = (typeof window !== 'undefined' && window.__EMBEDDED_PLANS && window.__EMBEDDED_PLANS[planName]) ? window.__EMBEDDED_PLANS[planName] : (plans && plans[planName]);
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

    // Initialize
    init().catch(err => {
      console.error('Init failed', err);
      if (readingListEl) readingListEl.textContent = 'Failed to load reading plans. See console.';
    });

    // Expose plan-reading helper: returns today's entries plus any missed (previous days not marked completed)
    window.getSelectedPlanName = getSelectedPlan;
    window.getPlanReadingEntries = function() {
      try {
        const planName = getSelectedPlan();
        const plan = plans[planName];
        if (!plan) return [];
        const todayNum = dayOfYear();
        const completed = loadCompleted(planName) || [];
        const out = [];
        for (let d = 1; d <= todayNum; d++) {
          if (completed.includes(d)) continue;
          const entries = plan[String(d)];
          if (!entries || entries.length === 0) continue;
          for (const e of entries) {
            out.push({ day: d, book: e.book, chapter: Number(e.chapter) });
          }
        }
        return out;
      } catch (e) {
        console.warn('getPlanReadingEntries failed', e);
        return [];
      }
    };

  // Expose helper to get entries for a specific day number for the selected plan
  window.getPlanEntriesForDay = function(dayNumber) {
    try {
      const planName = getSelectedPlan();
      const plan = (typeof window !== 'undefined' && window.__EMBEDDED_PLANS && window.__EMBEDDED_PLANS[planName]) ? window.__EMBEDDED_PLANS[planName] : (plans && plans[planName]);
      if (!plan) return [];
      const entries = plan[String(dayNumber)];
      if (!entries || entries.length === 0) return [];
      return entries.map(e => ({ day: dayNumber, book: e.book, chapter: Number(e.chapter) }));
    } catch (e) { console.warn('getPlanEntriesForDay failed', e); return []; }
  };

  })();

  // Global function to load verse of the day (accessible from all modules)
  async function loadVerseOfTheDay(lang = 'en') {
    try {
      // Try loading language-specific verses file
      const res = await fetch(`data/verses-${lang}.json`);
      if (res.ok) {
        const verses = await res.json();
        // Calculate day of year (1-365)
        const now = new Date();
        const startOfYear = new Date(now.getFullYear(), 0, 1);
        const diffMs = now - startOfYear;
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const dayOfYear = diffDays + 1; // Day 1-365
        
        // Get verse for this day, cycling through available verses
        const idx = (dayOfYear - 1) % verses.length;
        const pick = verses[idx];
        
        console.log(`📖 Day ${dayOfYear} - Loading ${lang} verse index ${idx}/${verses.length}: ${pick.ref}`);
        
        if (pick) {
          const verseText = document.getElementById('verse-text');
          const verseRef = document.getElementById('verse-ref');
          if (verseText) verseText.textContent = pick.text;
          if (verseRef) verseRef.textContent = pick.ref;
          console.log('✅ Loaded verse of day:', lang, pick.ref);
          return;
        }
      } else {
        console.warn(`📖 Fetch returned status ${res.status} for data/verses-${lang}.json`);
      }
    } catch (e) {
      console.warn(`❌ Could not load data/verses-${lang}.json:`, e.message);
    }

    // Fallback: small local sample (keeps app functional if file is missing)
    try {
      const sample = lang === 'ta' ? [
        { text: "கர்த்தர் என் மேய்ப்பர்; எனக்குக் குறைவு இல்லை.", ref: "சங்கீதம் 23:1" },
        { text: "உம்முடைய வார்த்தை என் கால்களுக்கு விளக்கும் என் பாதைக்கு ஒளியுமாயிருக்கிறது.", ref: "சங்கீதம் 119:105" },
        { text: "தேவன் உலகத்தில் அன்பு கூர்ந்தார், அவர் தம்முடைய ஒரே பேறான குமாரனைத் தந்தருளினார்.", ref: "யோவான் 3:16" }
      ] : [
        { text: "The LORD is my shepherd; I shall not want.", ref: "Psalm 23:1" },
        { text: "Your word is a lamp to my feet and a light to my path.", ref: "Psalm 119:105" },
        { text: "For God so loved the world, that he gave his only Son.", ref: "John 3:16" }
      ];
      const pick = sample[Math.floor(Math.random() * sample.length)];
      const verseText = document.getElementById('verse-text');
      const verseRef = document.getElementById('verse-ref');
      if (verseText) verseText.textContent = pick.text;
      if (verseRef) verseRef.textContent = pick.ref;
      console.log('⚠️ Using fallback sample verse:', pick.ref);
    } catch (e) {
      console.error('Verse load error', e);
    }
  }

  // --- Books module (original bible-reader features) ---
  (function(){
    let BOOKS = [
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
    // Keep an immutable copy of original English book metadata so we can restore names
    const ORIGINAL_BOOKS = JSON.parse(JSON.stringify(BOOKS));

    const STORAGE_KEY = 'bible-tracker';
    let state = { selectedBookId: 'genesis', readState: {} };

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
    const bookSelectorForExtra = document.getElementById('bookSelectorForExtra');
    const extraBookSelect = document.getElementById('extraBookSelect');
    // Books view controls for plan-day navigation and display mode
    const prevDayBtn = document.getElementById('prevDayBtn');
    const nextDayBtn = document.getElementById('nextDayBtn');
    const currentPlanDayDisplay = document.getElementById('currentPlanDayDisplay');
    const showMissedToggle = document.getElementById('showMissedToggle');
    const showAllChaptersToggle = document.getElementById('showAllChaptersToggle');
    function getActivePlanName() {
      const el = document.getElementById('planSelect');
      return (el && el.value) ? el.value : 'canonical';
    }
    function getDayOfYearLocal(date = new Date()) {
      const start = new Date(date.getFullYear(), 0, 0);
      const diff = date - start;
      const oneDay = 1000 * 60 * 60 * 24;
      return Math.floor(diff / oneDay);
    }
    let currentPlanDayNumber = getDayOfYearLocal();
    function updatePlanDayDisplay(){ if(currentPlanDayDisplay) currentPlanDayDisplay.textContent = 'Day ' + String(currentPlanDayNumber); }
    updatePlanDayDisplay();
    function getPlanMaxDay(planName) {
      try {
        const plan = (typeof window !== 'undefined' && window.__EMBEDDED_PLANS && window.__EMBEDDED_PLANS[planName]) ? window.__EMBEDDED_PLANS[planName] : (plans && plans[planName]);
        if (!plan) return 365;
        const keys = Object.keys(plan).map(n=>Number(n)).filter(n=>!isNaN(n));
        return keys.length ? Math.max(...keys) : 365;
      } catch (e) { return 365; }
    }

    if (prevDayBtn) prevDayBtn.addEventListener('click', ()=>{
      currentPlanDayNumber = Math.max(1, currentPlanDayNumber - 1);
      updatePlanDayDisplay(); render();
    });
    if (nextDayBtn) nextDayBtn.addEventListener('click', ()=>{
      const maxDay = getPlanMaxDay(getActivePlanName());
      currentPlanDayNumber = Math.min(maxDay, currentPlanDayNumber + 1);
      updatePlanDayDisplay(); render();
    });
    if (showAllChaptersToggle) showAllChaptersToggle.addEventListener('change', ()=>{
      if (showAllChaptersToggle.checked && showMissedToggle) showMissedToggle.checked = false;
      // Show/hide book selector dropdown
      if (bookSelectorForExtra) {
        bookSelectorForExtra.hidden = !showAllChaptersToggle.checked;
        if (showAllChaptersToggle.checked) populateExtraBookDropdown();
      }
      render();
    });
    if (showMissedToggle) showMissedToggle.addEventListener('change', ()=>{
      if (showMissedToggle.checked && showAllChaptersToggle) showAllChaptersToggle.checked = false;
      render();
    });

    function populateExtraBookDropdown() {
      if (!extraBookSelect) return;
      extraBookSelect.innerHTML = '';
      BOOKS.forEach(b => {
        const option = document.createElement('option');
        option.value = b.id;
        option.textContent = b.name;
        if (b.id === state.selectedBookId) option.selected = true;
        extraBookSelect.appendChild(option);
      });
    }

    if (extraBookSelect) {
      extraBookSelect.addEventListener('change', () => {
        state.selectedBookId = extraBookSelect.value;
        saveState();
        render();
      });
    }

    // Do not persist state to localStorage in testing environment.
    function saveState(){ /* no-op - local persistence disabled */ }

    function getBookProgress(bookId){
      const b = BOOKS.find(b=>b.id===bookId);
      const readCount = Object.keys(state.readState[bookId]||{}).length;
      const pct = Math.round(readCount / b.chapters *100);
      return { readCount, total:b.chapters, pct };
    }

    function findBookIdByName(name) {
      if (!name) return null;
      const normalized = String(name).toLowerCase().replace(/\s+/g,' ').trim();
      let candidate = BOOKS.find(b => b.name.toLowerCase() === normalized);
      if (candidate) return candidate.id;
      candidate = BOOKS.find(b => b.name.toLowerCase().startsWith(normalized) || normalized.startsWith(b.name.toLowerCase()));
      if (candidate) return candidate.id;
      // try matching short names like '1 John' vs '1-john'
      candidate = BOOKS.find(b => b.id.replace(/-/g,'').toLowerCase() === normalized.replace(/\s+/g,'').toLowerCase());
      return candidate ? candidate.id : null;
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
      // Determine plan display mode
      const showAll = showAllChaptersToggle && showAllChaptersToggle.checked;
      const showMissed = showMissedToggle && showMissedToggle.checked;
      let planEntries = [];
      try {
        if (!showAll) {
          if (showMissed) {
            planEntries = (window.getPlanReadingEntries && typeof window.getPlanReadingEntries === 'function') ? window.getPlanReadingEntries() : [];
          } else {
            // show only the selected plan day
            planEntries = (window.getPlanEntriesForDay && typeof window.getPlanEntriesForDay === 'function') ? window.getPlanEntriesForDay(currentPlanDayNumber) : [];
          }
        }
        if (planEntries && planEntries.length > 0) {
          chaptersContainer.innerHTML = '';
          const list = document.createElement('div'); list.className = 'plan-entries-list';
          for (const item of planEntries) {
            const bookId = findBookIdByName(item.book) || state.selectedBookId;
            const bookObj = BOOKS.find(b=>b.id===bookId) || { name: item.book };
            const read = !!(state.readState[bookId] && state.readState[bookId][item.chapter]);
            // Apply filter: filter variable is passed into renderChapters
            if (filter === 'read' && !read) continue;
            if (filter === 'unread' && read) continue;
            const row = document.createElement('div'); row.className = 'plan-entry';
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.className = 'round-checkbox';
            checkbox.checked = read;
            checkbox.addEventListener('change', ()=>{ toggleChapter(bookId, item.chapter); checkbox.checked = !!(state.readState[bookId] && state.readState[bookId][item.chapter]); });
            const label = document.createElement('label'); label.className = 'plan-entry-label';
            label.textContent = `${bookObj.name} ${item.chapter}  `;
            const meta = document.createElement('span'); meta.className = 'muted small'; meta.textContent = `Day ${item.day}`;
            row.appendChild(checkbox);
            row.appendChild(label);
            row.appendChild(meta);
            list.appendChild(row);
          }
          chaptersContainer.appendChild(list);
          return;
        }
      } catch (e) {
        console.warn('renderChapters plan-entries render failed', e);
      }
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

    async function toggleChapter(bookId,ch){
      // Optimistic local update
      state.readState[bookId] = state.readState[bookId]||{};
      const wasRead = !!state.readState[bookId][ch];
      if(wasRead) delete state.readState[bookId][ch];
      else state.readState[bookId][ch] = true;
      saveState(); render();

      // If Supabase is configured and user is signed in, call the RPC to persist per-chapter state
      try {
        const client = getSupabaseClient();
        if (!client || !supabaseUser) return;
        const bookObj = BOOKS.find(b=>b.id===bookId);
        const bookName = bookObj ? bookObj.name : String(bookId);
        await client.rpc('mark_chapter_progress', {
          p_plan_name: getActivePlanName(),
          p_book: bookName,
          p_chapter: ch,
          p_completed: !wasRead
        });
      } catch (e) {
        console.warn('mark_chapter_progress RPC failed', e);
      }
    }

    if(markAllBtn) markAllBtn.onclick = ()=>{
      try {
        // Prefer operating on currently rendered plan-entry DOM nodes so we only affect visible items
        const rows = Array.from(document.querySelectorAll('#chaptersContainer .plan-entry'));
        if (rows && rows.length > 0) {
          rows.forEach(row => {
            try {
              const label = row.querySelector('.plan-entry-label');
              if (!label) return;
              const text = label.textContent.trim(); // e.g. "Genesis 5"
              const parts = text.split(/\s+/);
              const chapter = Number(parts[parts.length - 1]) || null;
              const bookName = parts.slice(0, parts.length - 1).join(' ');
              const bookId = findBookIdByName(bookName) || state.selectedBookId;
              if (!chapter) return;
              state.readState[bookId] = state.readState[bookId] || {};
              state.readState[bookId][chapter] = true;
            } catch (e) { /* ignore row parse errors */ }
          });
          saveState(); render();
          // Persist each visible plan-entry chapter to Supabase if available
          (async () => {
            try {
              const client = getSupabaseClient();
              if (!client || !supabaseUser) return;
              for (const row of rows) {
                try {
                  const label = row.querySelector('.plan-entry-label');
                  if (!label) continue;
                  const text = label.textContent.trim(); // e.g. "Genesis 5"
                  const parts = text.split(/\s+/);
                  const chapter = Number(parts[parts.length - 1]) || null;
                  const bookName = parts.slice(0, parts.length - 1).join(' ');
                  if (!chapter) continue;
                  await client.rpc('mark_chapter_progress', {
                    p_plan_name: getActivePlanName(),
                    p_book: bookName,
                    p_chapter: chapter,
                    p_completed: true
                  });
                } catch (e) { /* ignore per-row errors */ }
              }
            } catch (e) { console.warn('markAll remote sync failed', e); }
          })();
          return;
        }
      } catch (e) {
        console.warn('markAllBtn DOM-based mark failed', e);
      }
      // Fallback: mark entire selected book
      const b = BOOKS.find(b=>b.id===state.selectedBookId);
      state.readState[b.id] = {};
      for(let i=1;i<=b.chapters;i++) state.readState[b.id][i]=true;
      saveState(); render();
    };

    if(clearBtn) clearBtn.onclick = ()=>{
      try {
        const rows = Array.from(document.querySelectorAll('#chaptersContainer .plan-entry'));
        if (rows && rows.length > 0) {
          rows.forEach(row => {
            try {
              const label = row.querySelector('.plan-entry-label');
              if (!label) return;
              const text = label.textContent.trim();
              const parts = text.split(/\s+/);
              const chapter = Number(parts[parts.length - 1]) || null;
              const bookName = parts.slice(0, parts.length - 1).join(' ');
              const bookId = findBookIdByName(bookName) || state.selectedBookId;
              if (!chapter) return;
              if (state.readState[bookId] && state.readState[bookId][chapter]) {
                delete state.readState[bookId][chapter];
                if (Object.keys(state.readState[bookId]).length === 0) delete state.readState[bookId];
              }
            } catch (e) { /* ignore */ }
          });
          saveState(); render();
          // Persist unmarking of each visible plan-entry chapter to Supabase if available
          (async () => {
            try {
              const client = getSupabaseClient();
              if (!client || !supabaseUser) return;
              for (const row of rows) {
                try {
                  const label = row.querySelector('.plan-entry-label');
                  if (!label) continue;
                  const text = label.textContent.trim();
                  const parts = text.split(/\s+/);
                  const chapter = Number(parts[parts.length - 1]) || null;
                  const bookName = parts.slice(0, parts.length - 1).join(' ');
                  if (!chapter) continue;
                  await client.rpc('mark_chapter_progress', {
                    p_plan_name: getActivePlanName(),
                    p_book: bookName,
                    p_chapter: chapter,
                    p_completed: false
                  });
                } catch (e) { /* ignore per-row errors */ }
              }
            } catch (e) { console.warn('clear remote sync failed', e); }
          })();
          return;
        }
      } catch (e) {
        console.warn('clearBtn DOM-based clear failed', e);
      }
      // Fallback: clear entire selected book
      delete state.readState[state.selectedBookId]; saveState(); render();
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
      // If user is signed in and Supabase is available, prefer remote aggregate counts
      (async () => {
        try {
          const client = getSupabaseClient();
          if (!client || !supabaseUser) return;
          const { data, error } = await client
            .from('reading_progress_summary')
            .select('chapters_read');
          if (error || !data) return;
          const remoteRead = data.reduce((s, r) => s + (r.chapters_read || 0), 0);
          const remotePct = Math.round(remoteRead / total * 100);
          if (overallFill) overallFill.style.width = remotePct + '%';
          if (overallText) overallText.textContent = `${remoteRead} / ${total} chapters`;
          if (donutText) donutText.textContent = remotePct + '%';
        } catch (e) { /* ignore remote failures */ }
      })();
    }

    function render(){ renderBooks(); renderChapters(document.querySelector('.filters .btn.active')?.dataset.filter || 'all'); renderOverall(); }

    // Language support: load language-specific JSONs for announcements, quiz and posts
    let LANG = 'en';
    async function loadLocaleData(lang) {
      LANG = lang || 'en';
      const langBtn = document.getElementById('langToggle');
      if (langBtn) langBtn.textContent = LANG.toUpperCase();
      console.log('🌍 Loading locale:', lang);
      try {
        const aRes = await fetch(`data/announcements_${lang}.json`);
        if (aRes.ok) {
          window.__ANNOUNCEMENTS = await aRes.json();
          console.log('✅ Loaded announcements:', lang);
        }
      } catch (e) { 
        console.warn('❌ Failed announcements:', e);
        window.__ANNOUNCEMENTS = announcementsSeed; 
      }
      try {
        const qRes = await fetch(`data/quiz_${lang}.json`);
        if (qRes.ok) {
          window.__QUIZ = await qRes.json();
          console.log('✅ Loaded quiz:', lang);
        }
      } catch (e) { 
        console.warn('❌ Failed quiz:', e);
        window.__QUIZ = quizSeed; 
      }
      try {
        const pRes = await fetch(`data/posts_${lang}.json`);
        if (pRes.ok) {
          window.__POSTS = await pRes.json();
          console.log('✅ Loaded posts:', lang);
        }
      } catch (e) { 
        console.warn('❌ Failed posts:', e);
        window.__POSTS = postsSeed; 
      }
      // optional sermons JSON
      try {
        const sRes = await fetch('data/sermons.json');
        if (sRes.ok) window.__EMBEDDED_SERMONS = await sRes.json();
      } catch (e) { /* ignore */ }
      // Re-render things that depend on locale
      renderAnnouncements(); renderQuiz(); renderPosts();
      console.log('✅ Re-rendered UI elements');
      
      // Reload verse of the day for the selected language
      await loadVerseOfTheDay(lang);
      
      // Load localized reading plans (both canonical and chronological)
      try {
        // Always initialize embedded plans
        window.__EMBEDDED_PLANS = {};
        console.log('📚 Loading plans for:', lang);
        
        // Load both plan types for the selected language
        const [canonicalResp, chronologicalResp, enCanonicalResp] = await Promise.allSettled([
          fetch(`data/reading-plan-canonical-${lang}.json`),
          fetch(`data/reading-plan-chronological-${lang}.json`),
          fetch('data/reading-plan-canonical-en.json')
        ]);
        
        let canonicalPlan = null, chronologicalPlan = null, enPlan = null;
        
        if (canonicalResp.status === 'fulfilled' && canonicalResp.value.ok) {
          canonicalPlan = await canonicalResp.value.json();
          window.__EMBEDDED_PLANS['canonical'] = canonicalPlan;
          console.log('✅ Canonical plan loaded. Days:', Object.keys(canonicalPlan).length);
        } else {
          console.warn('❌ Failed canonical plan:', lang);
        }
        
        if (chronologicalResp.status === 'fulfilled' && chronologicalResp.value.ok) {
          chronologicalPlan = await chronologicalResp.value.json();
          window.__EMBEDDED_PLANS['chronological'] = chronologicalPlan;
          console.log('✅ Chronological plan loaded');
        } else {
          console.warn('❌ Failed chronological plan:', lang);
        }
        
        if (enCanonicalResp.status === 'fulfilled' && enCanonicalResp.value.ok) {
          enPlan = await enCanonicalResp.value.json();
          console.log('✅ English plan loaded for mapping');
        }
        
        // Update BOOKS names based on language
        if (lang === 'en') {
          // Restore original English book names
          BOOKS = JSON.parse(JSON.stringify(ORIGINAL_BOOKS));
          console.log('✅ Restored EN book names');
        } else if (canonicalPlan && enPlan) {
          // Build mapping from English to localized names
          const mapping = {};
          for (const day of Object.keys(enPlan)) {
            const enEntries = enPlan[day] || [];
            const langEntries = canonicalPlan[day] || [];
            for (let i = 0; i < Math.min(enEntries.length, langEntries.length); i++) {
              const enName = enEntries[i].book;
              const langName = langEntries[i].book;
              if (enName && langName && !mapping[enName]) mapping[enName] = langName;
            }
          }
          console.log('📖 Mapped', Object.keys(mapping).length, 'books');
          // Apply mapping to BOOKS
          if (Object.keys(mapping).length) {
            BOOKS = BOOKS.map(b => {
              const mapped = mapping[b.name];
              return Object.assign({}, b, { name: mapped || b.name });
            });
            console.log('✅ BOOKS updated. Sample:', BOOKS.slice(0,3).map(b=>b.name));
          }
        } else {
          // Fallback: restore English names if localized plans not found
          BOOKS = JSON.parse(JSON.stringify(ORIGINAL_BOOKS));
          console.warn('⚠️ No localized plans, using EN');
        }
        
        // Re-render books and chapters to reflect localized names
        renderBooks(); renderChapters(); renderOverall();
        // Refresh the extra dropdown if it's visible so names match the active locale
        if (showAllChaptersToggle && showAllChaptersToggle.checked) {
          populateExtraBookDropdown();
        }
        console.log('✅ Books/chapters/progress re-rendered');
      } catch (e) {
        console.error('❌ Plan load error:', e);
        // Ensure we restore English on error
        if (lang === 'en') {
          BOOKS = JSON.parse(JSON.stringify(ORIGINAL_BOOKS));
          renderBooks(); renderChapters();
        }
      }
    }

    // Language toggle UI wiring
    const langToggleBtn = document.getElementById('langToggle');
    if (langToggleBtn) {
      langToggleBtn.addEventListener('click', async () => {
        LANG = LANG === 'en' ? 'ta' : 'en';
        langToggleBtn.textContent = LANG.toUpperCase();
        console.log('🌍 Language toggled to:', LANG);
        await loadLocaleData(LANG);
      });
    }

    // Load default locale (english)
    loadLocaleData('en').catch(()=>{});
    // Verse likes helpers
    async function loadVerseLikes() {
      try {
        const btn = document.getElementById('verseLikeBtn');
        const countEl = document.getElementById('verseLikeCount');
        const client = getSupabaseClient();
        const verseId = 'votd-' + new Date().toISOString().slice(0,10);
        if (!client) {
          // no remote client; leave local count at 0
          if (countEl) countEl.textContent = '0';
          return;
        }
        const { data, error } = await client.rpc('get_verse_likes', { p_id: verseId });
        if (error) { console.warn('get_verse_likes failed', error); if (countEl) countEl.textContent = '0'; return; }
        if (data && data.length) {
          if (countEl) countEl.textContent = String(data[0].likes || 0);
        } else if (countEl) countEl.textContent = '0';
        if (btn) btn.addEventListener('click', async () => {
          try {
            // optimistic
            const prev = Number(countEl?.textContent || '0');
            if (countEl) countEl.textContent = String(prev + 1);
            const { data: incData, error: incErr } = await client.rpc('increment_verse_like', { p_id: verseId });
            if (incErr) { console.warn('increment_verse_like failed', incErr); if (countEl) countEl.textContent = String(prev); }
            else if (incData) { if (countEl) countEl.textContent = String(incData); }
          } catch(e) { console.warn('likeVerse error', e); }
        });
      } catch (e) { console.warn('loadVerseLikes failed', e); }
    }

    // Expose a helper to allow other code to open the Bible to a specific book/chapter
    window.openBibleChapter = function(bookName, chapter){
      try {
        // Map display name (e.g. 'Genesis') to book id used in BOOKS
        const normalized = String(bookName || '').toLowerCase().replace(/\s+/g,' ').trim();
        const candidate = BOOKS.find(b => b.name.toLowerCase() === normalized || b.name.toLowerCase().startsWith(normalized));
        const bookId = candidate ? candidate.id : (BOOKS.find(b=>b.name.toLowerCase().includes(normalized)) || BOOKS[0]).id;
        state.selectedBookId = bookId;
        saveState();
        render();
        // Show books view
        showBooks();
        // After rendering, try to scroll the chapter into view and highlight it briefly
        setTimeout(()=>{
          const chapBtns = Array.from(document.querySelectorAll('#chaptersContainer .chapter'));
          const num = Number(chapter) || 1;
          const target = chapBtns.find(b => b.textContent.trim() === String(num));
          if (target) {
            target.scrollIntoView({behavior:'smooth', block:'center'});
            target.classList.add('highlight');
            setTimeout(()=> target.classList.remove('highlight'), 2200);
          }
        }, 120);
      } catch (e) {
        console.warn('openBibleChapter error', e);
      }
    };

    // View toggle UI with bottom navigation
    const booksSidebar = document.getElementById('booksSidebar');
    const booksView = document.getElementById('books-view');
    const planView = document.getElementById('plans-view');
    const homeView = document.getElementById('home-view');
    const kidsView = document.getElementById('kids-view');
    const verseCard = document.getElementById('verse');
    const menuBtn = document.getElementById('menuBtn');
    const drawerBackdrop = document.getElementById('drawerBackdrop');
    const drawerCloseBtn = document.getElementById('drawerCloseBtn');

    function openDrawer() {
      try {
        if (booksSidebar) booksSidebar.classList.add('open');
        if (drawerBackdrop) { drawerBackdrop.classList.add('visible'); drawerBackdrop.hidden = false; }
        if (menuBtn) menuBtn.setAttribute('aria-expanded', 'true');
        if (booksSidebar) booksSidebar.setAttribute('aria-hidden', 'false');
      } catch (e) { /* ignore */ }
    }

    function closeDrawer() {
      try {
        if (booksSidebar) booksSidebar.classList.remove('open');
        if (drawerBackdrop) { drawerBackdrop.classList.remove('visible'); drawerBackdrop.hidden = true; }
        if (menuBtn) menuBtn.setAttribute('aria-expanded', 'false');
        if (booksSidebar) booksSidebar.setAttribute('aria-hidden', 'true');
      } catch (e) { /* ignore */ }
    }

    if (menuBtn) {
      menuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (booksSidebar && booksSidebar.classList.contains('open')) closeDrawer();
        else openDrawer();
      });
    }
    if (drawerBackdrop) drawerBackdrop.addEventListener('click', closeDrawer);
    if (drawerCloseBtn) drawerCloseBtn.addEventListener('click', closeDrawer);

    // Helper to animate view switches for consistency (adds/removes .showing and toggles [hidden])
    function showView(target) {
      const views = [homeView, booksView, planView, kidsView];
      // include posts view in the animated views
      const postsView = document.getElementById('posts-view');
      if (postsView) views.push(postsView);
      views.forEach(v => {
        if (!v) return;
        if (v === target) {
          // reveal and animate in
          if (v.hidden) v.hidden = false;
          // force a frame then add class to trigger transition
          requestAnimationFrame(() => v.classList.add('showing'));
        } else {
          // animate out if currently shown
          if (!v.hidden && v.classList.contains('showing')) {
            v.classList.remove('showing');
            // Only hide after transition if view is still not the target
            const checkAndHide = (e) => {
              if (e.target !== v || v === target) return;
              v.hidden = true;
              v.removeEventListener('transitionend', checkAndHide);
            };
            v.addEventListener('transitionend', checkAndHide, { once: true });
          }
        }
      });
      // Verse card visibility remains tied to Home view
      if (verseCard) {
        if (target === homeView) { verseCard.hidden = false; try { verseCard.removeAttribute('aria-hidden'); } catch(e){} }
        else { verseCard.hidden = true; try { verseCard.setAttribute('aria-hidden','true'); } catch(e){} }
      }
    }

    function setActiveNav(nav) {
      document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.toggle('active', item.dataset.nav === nav);
      });
    }

    function showBooks(){
      if (booksSidebar) booksSidebar.hidden = false;
      showView(booksView);
      // Close drawer overlay when switching views
      closeDrawer();
      setActiveNav('books');
    }

    function showPlans(){
      if (booksSidebar) booksSidebar.hidden = true;
      showView(planView);
      // Close drawer overlay when switching views
      closeDrawer();
      // Simplify Plans page: only show the plan selector card. Hide detailed plan content.
      const planSelectorCard = document.querySelector('.plan-selector-card');
      const planContent = document.querySelector('.plan-content-wrapper');
      const fullPlanEl = document.getElementById('fullPlan');
      const planStatus = document.getElementById('planStatus');
      if (planSelectorCard) planSelectorCard.hidden = false;
      if (planContent) planContent.hidden = true;
      if (fullPlanEl) fullPlanEl.hidden = true;
      if (planStatus) planStatus.hidden = true;
      setActiveNav('plans');
    }

    function showKids(){
      if (booksSidebar) booksSidebar.hidden = true;
      showView(kidsView);
      setActiveNav('kids');
    }

    function showHome(){
      if (booksSidebar) booksSidebar.hidden = true;
      showView(homeView);
      // Close drawer overlay when switching views
      closeDrawer();
      setActiveNav('home');
    }

    // Bottom navigation listeners
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', () => {
        const nav = item.dataset.nav;
        if (nav === 'home') showHome();
        else if (nav === 'books') {
          // On small screens, auto-open the books drawer for discoverability
          if (window.innerWidth <= 900) {
            showView(booksView);
            openDrawer();
            render();
          } else {
            showBooks();
            render();
          }
        }
        else if (nav === 'plans') showPlans();
        else if (nav === 'kids') { showKids(); renderKids(); }
        else if (nav === 'posts') {
          // Show Posts view
          const postsView = document.getElementById('posts-view');
          if (postsView) {
            showView(postsView);
            renderPosts();
            setActiveNav('posts');
          } else {
            alert('Posts coming soon');
          }
        }
        else if (nav === 'more') { alert('Coming soon'); }
      });
    });

    // Initialize to Home view (default landing page)
    showHome();
    render();
    // Render home widgets and posts
    renderAnnouncements();
    renderSermons();
    renderQuiz();
    renderPosts();
  })();

});
