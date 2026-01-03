import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthProvider';
import { supabase } from '../lib/supabaseClient';

const BUCKET = 'kids-zone';

export default function KidsZone() {
  const { user } = useAuth();
  const fileInputRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [uploads, setUploads] = useState([]);
  const [mode, setMode] = useState('local'); // 'local' | 'supabase'
  const [status, setStatus] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async function init() {
      await refreshSessionAndFetch();
      // determine admin via profiles.role
      try {
        if (user) {
          const { data, error } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
          if (!error && data && (data.role === 'admin' || data.role === 'super_admin' || data.role === 'owner')) {
            if (mounted) setIsAdmin(true);
          }
        }
      } catch (e) { /* ignore */ }
    })();
    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function refreshSessionAndFetch() {
    setLoading(true);
    try {
      // fetch uploads from DB if supabase available
      if (!supabase) {
        setMode('local');
        setUploads([]);
        return;
      }
      const { data, error } = await supabase.from('kids_uploads').select('*').order('created_at', { ascending: false });
      if (error || !data) {
        setMode('local');
        setUploads([]);
        return;
      }
      // generate signed urls for available file paths
      const rows = data;
      const withUrls = await Promise.all(rows.map(async (r) => {
        if (!r.file_path) return { ...r, signedUrl: null };
        try {
          const { data: signed, error: signedErr } = await supabase.storage.from(BUCKET).createSignedUrl(r.file_path, 3600);
          if (signedErr || !signed) return { ...r, signedUrl: null };
          return { ...r, signedUrl: signed.signedUrl || signed.signed_url || null };
        } catch (e) {
          return { ...r, signedUrl: null };
        }
      }));
      setMode('supabase');
      setUploads(withUrls);
    } catch (e) {
      console.warn('refreshKidsFromSupabase failed', e);
      setMode('local');
      setUploads([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleUploadFile(file) {
    if (!file) return;
    if (!supabase) { setStatus('Supabase not configured'); return; }
    if (!user) { setStatus('Sign in to upload'); return; }
    setStatus('Uploading…');
    try {
      const path = `${user.id}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: false });
      if (uploadError) throw uploadError;
      const { error: insertError } = await supabase.from('kids_uploads').insert({ user_id: user.id, file_path: path, kind: file.type || 'image', approved: false });
      if (insertError) {
        // attempt to clean up storage
        try { await supabase.storage.from(BUCKET).remove([path]); } catch (_) {}
        throw insertError;
      }
      setStatus('Upload received (pending approval)');
      await refreshSessionAndFetch();
    } catch (e) {
      console.error('handleKidsUpload failed', e);
      setStatus('Upload failed');
    }
  }

  async function approveUpload(id) {
    if (!isAdmin) { alert('Only admins can approve'); return; }
    try {
      const { error } = await supabase.from('kids_uploads').update({ approved: true, approved_at: new Date().toISOString(), approved_by: user?.id || null }).eq('id', id);
      if (error) throw error;
      await refreshSessionAndFetch();
    } catch (e) { console.warn('approveKidsUpload failed', e); alert('Could not approve'); }
  }

  async function deleteUpload(id, path) {
    if (!isAdmin) { alert('Only admins can delete'); return; }
    if (!confirm('Delete this upload?')) return;
    try {
      if (path) {
        const { error: remErr } = await supabase.storage.from(BUCKET).remove([path]);
        if (remErr) console.warn('Storage remove error', remErr);
      }
      const { error } = await supabase.from('kids_uploads').delete().eq('id', id);
      if (error) console.warn('DB delete error', error);
      await refreshSessionAndFetch();
    } catch (e) { console.warn('deleteKidsUpload failed', e); alert('Delete failed'); }
  }

  return (
    <section id="kids-view" className="card view-panel">
      <div className="plans-header mb-4">
        <div>
          <h2>Kids Corner 🎨</h2>
          <p className="small muted">Creative gallery — upload and celebrate kids' artwork</p>
        </div>
      </div>

      <div className="kids-panel space-y-4">
        <div className="kids-controls flex items-center gap-3">
          <label className="btn small-btn" htmlFor="kidsUpload">Upload</label>
          <input id="kidsUpload" ref={fileInputRef} type="file" accept="image/*" className="sr-only" onChange={(e) => { const f = e.target.files && e.target.files[0]; if (f) handleUploadFile(f); e.target.value = ''; }} />
          <div className="kids-actions ml-auto flex gap-2">
            {!user ? <button className="btn small-btn" onClick={() => alert('Sign in via the profile modal')}>Sign in</button> : <button className="btn small-btn" onClick={() => { supabase.auth.signOut(); }}>Sign out</button>}
            <button className="btn small-btn" onClick={refreshSessionAndFetch}>Refresh</button>
          </div>
        </div>

        <div id="kidsMetaRow" className="flex items-center justify-between">
          <div id="kidsStatus" className="small muted">{status || (mode === 'supabase' ? (user ? 'Uploads fetched from Supabase.' : 'Sign in to upload (uploads hidden until approved).') : 'Using local sample gallery.')}</div>
          {isAdmin && <div id="kidsAdminHint" className="pill pill-high">Admin: approve or delete uploads below.</div>}
        </div>

        <div id="kidsGallery" className="kids-grid grid gap-3 grid-cols-2 md:grid-cols-3">
          {loading && <div className="muted">Loading…</div>}
          {!loading && uploads.length === 0 && <div className="small muted">No uploads yet.</div>}
          {!loading && uploads.map((k) => (
            <article key={k.id} className="kid-card border rounded p-2">
              <div className="kid-media mb-2">
                {k.signedUrl ? <img src={k.signedUrl} alt={k.title || 'Kids upload'} loading="lazy" className="w-full h-40 object-cover" /> : <div className="kid-placeholder h-40 flex items-center justify-center bg-gray-50">🎨</div>}
              </div>
              <div className="kid-body">
                <div className="font-medium">{k.title || (k.file_path ? k.file_path.split('/').pop() : 'Kids upload')}</div>
                <div className="text-sm text-muted-foreground">{k.child || (k.user_id === user?.id ? 'Uploaded by you' : 'Community upload')}</div>
                <div className="mt-2 flex gap-2">
                  {!k.approved && isAdmin && <button className="btn tiny" onClick={() => approveUpload(k.id)}>Approve</button>}
                  {isAdmin && <button className="btn tiny warn" onClick={() => deleteUpload(k.id, k.file_path)}>Delete</button>}
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
