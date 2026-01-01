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
  const kidsStatus = document.getElementById('kidsStatus');
  const kidsLoginBtn = document.getElementById('kidsLoginBtn');
  const kidsLogoutBtn = document.getElementById('kidsLogoutBtn');
  const kidsRefreshBtn = document.getElementById('kidsRefreshBtn');
  const kidsAdminHint = document.getElementById('kidsAdminHint');
  const quizQuestionEl = document.getElementById('quizQuestion');
  const quizOptionsEl = document.getElementById('quizOptions');
  const quizFeedbackEl = document.getElementById('quizFeedback');
  const authModal = document.getElementById('authModal');
  const authOverlay = document.getElementById('authOverlay');
  const authEmail = document.getElementById('authEmail');
  const authFirst = document.getElementById('authFirst');
  const authLast = document.getElementById('authLast');
  const authUsername = document.getElementById('authUsername');
  const logoutBtn = document.getElementById('logoutBtn');
  const userBadge = document.getElementById('userBadge');
  const adminNavBtn = document.querySelector('[data-nav="admin"]');

  const startOfYear = new Date(new Date().getFullYear(), 0, 1);
  const today = new Date();
  const dayOfYear = Math.floor((today - startOfYear) / (1000 * 60 * 60 * 24)) + 1;

  let readingPlan = {};
  let readingProgressMap = {}; // { book: { chapter: true } }

  const normalizeBook = (book) => (book || '').toLowerCase();

  let supabaseRole = 'user';

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
    // If no API key set, use fallback data
    if (YOUTUBE_API_KEY === 'YOUR_API_KEY') {
      console.warn('YouTube API key not configured. Using fallback sermon data.');
      return;
    }

    try {
      console.log('🔍 Fetching sermons from YouTube...');
      
      // First, get the channel ID from the handle
      const channelResponse = await fetch(
        `https://www.googleapis.com/youtube/v3/search?key=${YOUTUBE_API_KEY}&q=${YOUTUBE_CHANNEL_HANDLE}&type=channel&part=snippet&maxResults=1`
      );
      
      if (!channelResponse.ok) {
        throw new Error(`Failed to find channel: ${channelResponse.status}`);
      }
      
      const channelData = await channelResponse.json();
      console.log('📡 Channel search response:', channelData);
      
      if (!channelData.items || channelData.items.length === 0) {
        // Try direct search for videos from the channel name
        console.log('🔍 Trying direct video search for FCM Liverpool...');
        const directResponse = await fetch(
          `https://www.googleapis.com/youtube/v3/search?key=${YOUTUBE_API_KEY}&q=FCM+Liverpool+sermon&type=video&order=date&maxResults=6&part=snippet`
        );
        
        if (!directResponse.ok) {
          throw new Error(`Direct search failed: ${directResponse.status}`);
        }
        
        const directData = await directResponse.json();
        console.log('📦 Direct search response:', directData);
        
        if (directData.items && directData.items.length > 0) {
          sermonsSeed = directData.items.map(item => {
            const videoId = item.id?.videoId || item.id;
            return {
              title: item.snippet?.title || 'Untitled',
              speaker: 'FCM Liverpool',
              youtubeId: typeof videoId === 'string' ? videoId : '',
              date: new Date(item.snippet?.publishedAt).toLocaleDateString('en-GB', { 
                year: 'numeric', 
                month: '2-digit', 
                day: '2-digit' 
              })
            };
          }).filter(sermon => sermon.youtubeId);
          
          console.log('✅ Loaded latest sermons from YouTube:', sermonsSeed);
          renderSermons();
          return;
        }
      }
      
      const channelId = channelData.items[0].snippet.channelId;
      console.log('📺 Channel ID found:', channelId);
      
      // Now fetch videos from that channel
      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/search?key=${YOUTUBE_API_KEY}&channelId=${channelId}&part=snippet,id&order=date&maxResults=6&type=video`
      );
      
      console.log('📡 Response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('YouTube API Error:', errorData);
        throw new Error(`YouTube API returned ${response.status}: ${errorData.error?.message || 'Unknown error'}`);
      }
      
      const data = await response.json();
      console.log('📦 YouTube API response:', data);
      console.log('📦 Items in response:', data.items);
      console.log('📦 Number of items:', data.items?.length);
      
      if (data.items && data.items.length > 0) {
        console.log('📦 First item structure:', data.items[0]);
        
        sermonsSeed = data.items.map(item => {
          const videoId = item.id?.videoId || item.id;
          return {
            title: item.snippet?.title || 'Untitled',
            speaker: 'FCM Liverpool',
            youtubeId: typeof videoId === 'string' ? videoId : '',
            date: new Date(item.snippet?.publishedAt).toLocaleDateString('en-GB', { 
              year: 'numeric', 
              month: '2-digit', 
              day: '2-digit' 
            })
          };
        }).filter(sermon => sermon.youtubeId);
        
        console.log('✅ Loaded latest sermons from YouTube:', sermonsSeed);
        renderSermons();
      } else {
        console.warn('⚠️ No videos found in response. Full response:', JSON.stringify(data, null, 2));
      }
    } catch (error) {
      console.error('❌ Could not fetch latest sermons from YouTube:', error);
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

  // Supabase config (fill in your project URL and anon key; leave as-is for local preview)
  const SUPABASE_URL = window.SUPABASE_URL || 'https://bthurnklynjzchcvxcur.supabase.co';
  const SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY || 'sb_publishable_YKEcgIUqXuY7P0rhZLmiXg_GJvvewjo';
  const SUPABASE_BUCKET = 'kids-zone';
  let supabaseClient = null;
  let supabaseUser = null;
  let supabaseProfile = null;
  let supabaseRoleRow = null;
  let kidsGalleryData = [];
  let kidsBackendMode = 'local'; // 'local' fallback, 'supabase' when pulling from backend
  let kidsLoading = false;

  // Web push configuration (replace VAPID key; subscribe URL already points to Netlify function)
  const VAPID_PUBLIC_KEY = window.VAPID_PUBLIC_KEY || 'BMOe1X6kVj174Ojwy6--1Qvl3D7d5bkJEerbI2DlRnUU_oqH7_zLPXw8xVvQo3AT9ZWp9JXHDebPKFFvvsug8Ds';
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
    const role = supabaseProfile?.role || supabaseRoleRow?.role || supabaseRole;
    return role === 'admin' || role === 'super_admin';
  }

  function requireAuth() {
    if (!supabaseUser) {
      if (authModal) authModal.removeAttribute('hidden');
      if (authOverlay) authOverlay.removeAttribute('hidden');
      throw new Error('Auth required');
    }
  }

  function hideAuthModal() {
    if (authModal) authModal.setAttribute('hidden', 'true');
    if (authOverlay) authOverlay.setAttribute('hidden', 'true');
  }

  function showToast(message, isError = false) {
    const el = document.getElementById('toast');
    if (!el) return;
    el.textContent = message;
    el.classList.toggle('warn', !!isError);
    el.classList.add('show');
    el.hidden = false;
    clearTimeout(el._timer);
    el._timer = setTimeout(() => {
      el.classList.remove('show');
      el._timer = setTimeout(() => { el.hidden = true; }, 250);
    }, 2200);
  }

  async function fetchUserRoleRow() {
    const client = getSupabaseClient();
    if (!client || !supabaseUser) return null;
    const { data, error } = await client
      .from('user_roles')
      .select('role')
      .eq('user_id', supabaseUser.id)
      .maybeSingle();
    if (error) {
      console.warn('Could not load user role', error);
      return null;
    }
    return data || null;
  }

  async function loadReadingProgress() {
    const client = getSupabaseClient();
    if (!client || !supabaseUser) return;
    const { data, error } = await client
      .from('reading_progress')
      .select('book, chapter, is_read')
      .eq('user_id', supabaseUser.id);
    if (error) {
      console.warn('Could not load reading progress', error);
      readingProgressMap = {};
      return;
    }
    const map = {};
    (data || []).forEach(row => {
      const b = normalizeBook(row.book);
      if (!map[b]) map[b] = {};
      if (row.is_read) map[b][row.chapter] = true;
    });
    readingProgressMap = map;
  }

  async function ensureProfileAndRole(meta = {}) {
    const client = getSupabaseClient();
    if (!client || !supabaseUser) return;
    const profilePayload = {
      id: supabaseUser.id,
      username: meta.username || supabaseUser.user_metadata?.username || undefined,
      first_name: meta.first_name || supabaseUser.user_metadata?.first_name || undefined,
      last_name: meta.last_name || supabaseUser.user_metadata?.last_name || undefined,
      full_name: meta.full_name || [meta.first_name || supabaseUser.user_metadata?.first_name || '', meta.last_name || supabaseUser.user_metadata?.last_name || ''].join(' ').trim() || null
    };
    await client.from('profiles').upsert(profilePayload, { onConflict: 'id' });
    // Ensure user role exists
    const { data: roleRow } = await client.from('user_roles').select('role').eq('user_id', supabaseUser.id).maybeSingle();
    if (!roleRow) {
      await client.from('user_roles').upsert({ user_id: supabaseUser.id, role: 'user' });
    }
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
      if (supabaseUser) await ensureProfileAndRole();
      supabaseProfile = supabaseUser ? await fetchProfile() : null;
      supabaseRoleRow = supabaseUser ? await fetchUserRoleRow() : null;
      if (supabaseUser) await loadReadingProgress();
      updateKidsAuthUI();
      refreshKidsFromSupabase();
      updateAuthUI();
    });
    return supabaseClient;
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
    supabaseRoleRow = supabaseUser ? await fetchUserRoleRow() : null;
    if (supabaseUser) await ensureProfileAndRole();
    if (supabaseUser) await loadReadingProgress();
    updateKidsAuthUI();
    updateAuthUI();
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

  function updateAuthUI() {
    const loggedIn = !!supabaseUser;
    if (userBadge) {
      userBadge.textContent = loggedIn ? (supabaseUser.email || 'User') : 'Guest';
    }
    if (logoutBtn) logoutBtn.hidden = !loggedIn;
    if (adminNavBtn) adminNavBtn.hidden = !(loggedIn && isAdmin());
    if (loggedIn) hideAuthModal();
  }

  const authRedirectTo = typeof window !== 'undefined' ? `${window.location.origin}` : undefined;

  async function handleMagicLink(email, meta = {}) {
    const client = getSupabaseClient();
    if (!client) return alert('Supabase not configured.');
    if (!email) return alert('Email is required.');
    
    // Check if profile fields are filled (indicates new user signup intent)
    const hasProfileData = meta.first_name || meta.last_name || meta.username;
    
    if (hasProfileData) {
      // New user flow: use signUp with metadata
      const cleanMeta = {
        first_name: meta.first_name?.trim() || undefined,
        last_name: meta.last_name?.trim() || undefined,
        username: meta.username?.trim() || undefined,
        full_name: [meta.first_name, meta.last_name].filter(Boolean).join(' ').trim() || undefined
      };
      const { error } = await client.auth.signUp({
        email,
        options: {
          data: cleanMeta,
          emailRedirectTo: authRedirectTo
        }
      });
      if (error) {
        alert(`Magic link failed: ${error.message}`);
        return;
      }
      alert('Check your email for a magic link to complete signup!');
    } else {
      // Existing user flow: use OTP
      const { error } = await client.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: authRedirectTo }
      });
      if (error) {
        alert(`Magic link failed: ${error.message}`);
        return;
      }
      alert('Check your email for a magic link to sign in!');
    }
  }

  async function handleLogout() {
    const client = getSupabaseClient();
    if (!client) return;
    await client.auth.signOut();
    supabaseUser = null;
    supabaseProfile = null;
    supabaseRoleRow = null;
    readingProgressMap = {};
    updateAuthUI();
    updateKidsAuthUI();
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
        try { requireAuth(); } catch { return; }
        const client = getSupabaseClient();
        if (!client || !supabaseUser) return;
        client.from('quiz_submissions').insert({
          user_id: supabaseUser.id,
          quiz_id: `daily-${dayOfYear}`,
          answers: { selected: optIdx, correctAnswer: item.answer },
          score: correct ? 1 : 0
        }).then(({ error }) => {
          if (error) console.warn('Quiz submission failed', error);
        });
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

    function isChapterRead(book, chapter) {
      const b = normalizeBook(book);
      return !!(readingProgressMap[b] && readingProgressMap[b][chapter]);
    }

    function dayIsComplete(planName, day) {
      const plan = plans[planName];
      const entries = plan ? plan[String(day)] : null;
      if (!entries || entries.length === 0) return false;
      return entries.every(e => isChapterRead(e.book, e.chapter));
    }

    function loadCompleted(planName) {
      const plan = plans[planName];
      if (!plan) return [];
      const keys = Object.keys(plan).map(n => Number(n)).filter(n => !isNaN(n));
      const done = [];
      for (const k of keys) {
        if (dayIsComplete(planName, k)) done.push(k);
      }
      return done.sort((a,b)=>a-b);
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
      renderQuiz();

      updateKidsAuthUI();
      await refreshSession();
      await refreshKidsFromSupabase(true);
      updateAuthUI();

      if (!supabaseUser) {
        if (authModal) authModal.removeAttribute('hidden');
        if (authOverlay) authOverlay.removeAttribute('hidden');
      }

      const magicLinkBtn = document.getElementById('magicLinkBtn');
      if (magicLinkBtn) magicLinkBtn.addEventListener('click', async ()=>{
        await handleMagicLink(authEmail?.value?.trim(), {
          first_name: authFirst?.value,
          last_name: authLast?.value,
          username: authUsername?.value
        });
      });
      if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
      if (authOverlay) authOverlay.addEventListener('click', hideAuthModal);

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
      try { requireAuth(); } catch { return; }
      const client = getSupabaseClient();
      if (!client || !supabaseUser) return;
      const planName = getSelectedPlan();
      const day = daySelect ? Number(daySelect.value) : dayOfYear();
      const plan = plans[planName];
      const entries = plan ? plan[String(day)] : null;
      if (!entries || entries.length === 0) {
        alert('No reading assigned for this day.');
        return;
      }
      const rows = entries.map(e => ({
        user_id: supabaseUser.id,
        book: normalizeBook(e.book),
        chapter: e.chapter,
        is_read: true
      }));
      client.from('reading_progress').upsert(rows, { onConflict: 'user_id,book,chapter' })
        .then(async ({ error }) => {
          if (error) {
            alert(`Could not save progress: ${error.message}`);
            return;
          }
          await loadReadingProgress();
          renderHistory();
          renderSelectedDay();
          render();
        });
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
    const exportBtn = document.getElementById('exportBtn');
    const importFile = document.getElementById('importFile');

    function saveState(){ /* no-op: state kept in memory; server is source of truth */ }

    function getBookProgress(bookId){
      const b = BOOKS.find(b=>b.id===bookId);
      const readCount = Object.keys(readingProgressMap[bookId]||{}).length;
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
        const read = !!(readingProgressMap[book.id] && readingProgressMap[book.id][i]);
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
      try { requireAuth(); } catch { return; }
      const client = getSupabaseClient();
      if (!client || !supabaseUser) return;
      const currentlyRead = !!(readingProgressMap[bookId] && readingProgressMap[bookId][ch]);
      if (currentlyRead) {
        const { error } = await client
          .from('reading_progress')
          .delete()
          .eq('user_id', supabaseUser.id)
          .eq('book', bookId)
          .eq('chapter', ch);
        if (error) {
          alert(`Could not update progress: ${error.message}`);
          return;
        }
      } else {
        const { error } = await client
          .from('reading_progress')
          .upsert([{ user_id: supabaseUser.id, book: bookId, chapter: ch, is_read: true }], { onConflict: 'user_id,book,chapter' });
        if (error) {
          alert(`Could not update progress: ${error.message}`);
          return;
        }
      }
      await loadReadingProgress();
      render();
    }

    if(markAllBtn) markAllBtn.onclick = async ()=>{
      try { requireAuth(); } catch { return; }
      const client = getSupabaseClient();
      if (!client || !supabaseUser) return;
      const b = BOOKS.find(b=>b.id===state.selectedBookId);
      const rows = [];
      for(let i=1;i<=b.chapters;i++) rows.push({ user_id: supabaseUser.id, book: b.id, chapter: i, is_read: true });
      const { error } = await client.from('reading_progress').upsert(rows, { onConflict: 'user_id,book,chapter' });
      if (error) { alert(`Could not mark all: ${error.message}`); return; }
      await loadReadingProgress();
      render();
    };

    if(clearBtn) clearBtn.onclick = async ()=>{
      try { requireAuth(); } catch { return; }
      const client = getSupabaseClient();
      if (!client || !supabaseUser) return;
      const bookId = state.selectedBookId;
      const { error } = await client
        .from('reading_progress')
        .delete()
        .eq('user_id', supabaseUser.id)
        .eq('book', bookId);
      if (error) { alert(`Could not clear: ${error.message}`); return; }
      await loadReadingProgress();
      render();
    };

    if(exportBtn) exportBtn.onclick = ()=>{
      const blob = new Blob([JSON.stringify(readingProgressMap,null,2)],{type:'application/json'});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download='bible-progress.json'; a.click(); URL.revokeObjectURL(url);
    };

    if(importFile) importFile.onchange = (e)=>{
      const file = e.target.files[0]; if(!file) return; const reader = new FileReader();
      reader.onload = async ev=>{
        try { requireAuth(); } catch { return; }
        const imported = JSON.parse(ev.target.result);
        const client = getSupabaseClient();
        if (!client || !supabaseUser) return;
        const rows = [];
        Object.entries(imported || {}).forEach(([book, chapters]) => {
          Object.keys(chapters || {}).forEach(ch => {
            rows.push({ user_id: supabaseUser.id, book, chapter: Number(ch), is_read: true });
          });
        });
        if (rows.length) {
          const { error } = await client.from('reading_progress').upsert(rows, { onConflict: 'user_id,book,chapter' });
          if (error) { alert(`Import failed: ${error.message}`); return; }
        }
        await loadReadingProgress();
        render();
        e.target.value='';
      };
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
      const read = BOOKS.reduce((sum,b)=>sum+(Object.keys(readingProgressMap[b.id]||{}).length),0);
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
    const adminView = document.getElementById('admin-view');
    const adminUsers = document.getElementById('adminUsers');
    const adminReading = document.getElementById('adminReading');
    const adminQuiz = document.getElementById('adminQuiz');
    const statUsers = document.getElementById('statUsers');
    const statReading = document.getElementById('statReading');
    const statQuiz = document.getElementById('statQuiz');
    const roleUserIdInput = document.getElementById('roleUserId');
    const roleSelect = document.getElementById('roleSelect');
    const roleUpdateBtn = document.getElementById('roleUpdateBtn');
    const roleUpdateStatus = document.getElementById('roleUpdateStatus');

    function copyText(text) {
      if (!text) return;
      if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(text).then(()=>showToast('Copied user_id'), ()=>showToast('Copy failed', true));
      } else {
        try {
          const ta = document.createElement('textarea');
          ta.value = text; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
          showToast('Copied user_id');
        } catch {
          showToast('Copy failed', true);
        }
      }
    }

    function setRoleStatus(message, isError = false) {
      if (roleUpdateStatus) {
        roleUpdateStatus.textContent = message;
        roleUpdateStatus.classList.toggle('warn', !!isError);
      }
    }

    function setActiveNav(nav) {
      document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.toggle('active', item.dataset.nav === nav);
      });
    }

    function showBooks(){
      try { requireAuth(); } catch { return; }
      if(homeView) homeView.hidden = true;
      if(booksSidebar) booksSidebar.hidden = false;
      if(booksView) booksView.hidden = false;
      if(planView) planView.hidden = true;
      if(verseCard) verseCard.hidden = false;
      setActiveNav('books');
    }

    function showPlans(){
      try { requireAuth(); } catch { return; }
      if(homeView) homeView.hidden = true;
      if(booksSidebar) booksSidebar.hidden = true;
      if(booksView) booksView.hidden = true;
      if(planView) planView.hidden = false;
      if(verseCard) verseCard.hidden = true;
      if(adminView) adminView.hidden = true;
      setActiveNav('plans');
    }

    function showHome(){
      if(homeView) homeView.hidden = false;
      if(booksSidebar) booksSidebar.hidden = true;
      if(booksView) booksView.hidden = true;
      if(planView) planView.hidden = true;
      if(verseCard) verseCard.hidden = false;
      if(adminView) adminView.hidden = true;
      setActiveNav('home');
    }

    async function showAdmin(){
      try { requireAuth(); } catch { return; }
      if (!isAdmin()) { alert('Admin only'); return; }
      if(homeView) homeView.hidden = true;
      if(booksSidebar) booksSidebar.hidden = true;
      if(booksView) booksView.hidden = true;
      if(planView) planView.hidden = true;
      if(verseCard) verseCard.hidden = true;
      if(adminView) adminView.hidden = false;
      setActiveNav('admin');
      setRoleStatus('');
      await loadAdminData();
    }

    async function loadAdminData(){
      const client = getSupabaseClient();
      if (!client || !supabaseUser) return;
      const [{ count: userCount }, { count: rpCount }, { count: quizCount }] = await Promise.all([
        client.from('user_roles').select('*', { count: 'exact', head: true }),
        client.from('reading_progress').select('*', { count: 'exact', head: true }),
        client.from('quiz_submissions').select('*', { count: 'exact', head: true })
      ]).then(res => res.map(r => r || {}));

      if (statUsers) statUsers.textContent = userCount ?? '-';
      if (statReading) statReading.textContent = rpCount ?? '-';
      if (statQuiz) statQuiz.textContent = quizCount ?? '-';

      const [{ data: usersData }, { data: rpData }, { data: quizData }] = await Promise.all([
        client.from('user_roles').select('user_id, role, created_at').order('created_at', { ascending: false }).limit(10),
        client.from('reading_progress').select('user_id, book, chapter, updated_at').order('updated_at', { ascending: false }).limit(10),
        client.from('quiz_submissions').select('user_id, quiz_id, score, created_at').order('created_at', { ascending: false }).limit(10)
      ]);

      if (adminUsers) {
        adminUsers.innerHTML = '';
        (usersData||[]).forEach(u=>{
          const li = document.createElement('li');
          li.innerHTML = `
            <div>
              <div class="small muted">${u.user_id.slice(0,6)}…</div>
              <div>role: ${u.role}</div>
            </div>
            <button class="btn tiny" data-copy-user="${u.user_id}">Copy user_id</button>
          `;
          adminUsers.appendChild(li);
        });
        adminUsers.querySelectorAll('button[data-copy-user]').forEach(btn => {
          btn.addEventListener('click', () => copyText(btn.dataset.copyUser));
        });
      }

      if (adminReading) {
        adminReading.innerHTML = '';
        (rpData||[]).forEach(r=>{
          const li = document.createElement('li');
          li.textContent = `${r.user_id.slice(0,6)} • ${r.book} ${r.chapter}`;
          adminReading.appendChild(li);
        });
      }

      if (adminQuiz) {
        adminQuiz.innerHTML = '';
        (quizData||[]).forEach(q=>{
          const li = document.createElement('li');
          li.textContent = `${q.user_id.slice(0,6)} • ${q.quiz_id} • score: ${q.score ?? ''}`;
          adminQuiz.appendChild(li);
        });
      }
    }

    async function updateUserRole() {
      try { requireAuth(); } catch { return; }
      if (!isAdmin()) { alert('Admin only'); return; }
      const targetId = roleUserIdInput?.value?.trim();
      const role = roleSelect?.value || 'user';
      if (!targetId) {
        setRoleStatus('Enter a user_id to update.', true);
        return;
      }
      const client = getSupabaseClient();
      if (!client) return;
      setRoleStatus('Updating…', false);
      const { error } = await client.rpc('set_user_role', { target_user_id: targetId, new_role: role });
      if (error) {
        setRoleStatus(`Update failed: ${error.message}`, true);
        showToast('Role update failed', true);
        return;
      }
      setRoleStatus('Role updated. Refreshing list…', false);
      showToast('Role updated');
      await loadAdminData();
    }

    // Bottom navigation listeners
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', () => {
        const nav = item.dataset.nav;
        if (nav === 'home') showHome();
        else if (nav === 'books') { showBooks(); render(); }
        else if (nav === 'plans') showPlans();
        else if (nav === 'discover') { alert('Discover coming soon'); }
        else if (nav === 'admin') { showAdmin(); }
        else if (nav === 'more') { alert('More coming soon'); }
      });
    });

    if (roleUpdateBtn) roleUpdateBtn.addEventListener('click', updateUserRole);

    // Initialize to Home view
    showHome();
    render();
  })();

});
