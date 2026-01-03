import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthProvider';

export default function Admin() {
  const { user, loading: authLoading } = useAuth();
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [audit, setAudit] = useState([]);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [cursors, setCursors] = useState([]); // stack of previous 'after' cursors
  const [currentCursor, setCurrentCursor] = useState(null);
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    if (!user) return;
    fetchProfiles();
    (async () => {
      // Load first page
      await fetchAudit(null);
      setCurrentCursor(null);
      setCursors([]);
    })();
  }, [user]);

  async function fetchProfiles() {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, role, created_at, email')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setProfiles(data || []);
    } catch (e) {
      console.warn('Could not load profiles', e);
      setError(e.message || String(e));
      setProfiles([]);
    } finally {
      setLoading(false);
    }
  }

  // Fetch audit page; 'after' is an optional cursor (ISO timestamp) to fetch rows older than that cursor
  async function fetchAudit(after = null) {
    setLoadingAudit(true);
    try {
      const token = (await supabase.auth.getSession()).data?.session?.access_token;
      const params = new URLSearchParams();
      params.set('limit', '25');
      if (after) params.set('after', after);
      const url = `/api/admin/audit?${params.toString()}`;
      const resp = await fetch(url, {
        headers: { Authorization: token ? `Bearer ${token}` : '' },
      });
      if (!resp.ok) {
        const json = await resp.json().catch(() => ({}));
        throw new Error(json?.error || 'Failed to load audit');
      }
      const json = await resp.json();
      setAudit(json.data || []);
      setHasMore(Boolean(json.has_more));
      return json.next_cursor || null;
    } catch (e) {
      console.warn('Failed to fetch audit', e);
      setAudit([]);
      setHasMore(false);
      return null;
    } finally {
      setLoadingAudit(false);
    }
  }

  async function changeRole(id, role) {
    if (!confirm(`Change role for user ${id} to ${role}?`)) return;
    try {
      // Use server-side API to perform role change and audit logging
      const token = (await supabase.auth.getSession()).data?.session?.access_token;
      const resp = await fetch('/api/admin/changeRole', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({ targetUserId: id, newRole: role }),
      });
      const json = await resp.json();
      if (!resp.ok) throw new Error(json?.error || 'Request failed');
      await fetchProfiles();
      alert('Role updated');
    } catch (e) {
      console.error('Could not update role', e);
      alert('Could not update role: ' + (e.message || e));
    }
  }

  if (authLoading) return <div className="p-6">Checking authentication…</div>;
  if (!user) return <div className="p-6">Sign in as an admin to manage users.</div>;

  return (
    <section id="admin-view" className="card view-panel">
      <div className="plans-header mb-4">
        <div>
          <h2 className="text-lg font-semibold">Admin Console</h2>
          <p className="text-sm text-muted-foreground">Manage users, promotions, and moderation queues</p>
        </div>
      </div>

      <div className="admin-panel">
        <h3 className="text-base font-medium mb-2">Users</h3>
        {loading && <div>Loading users…</div>}
        {error && <div className="text-sm text-destructive">{error}</div>}
        {!loading && !profiles.length && <div className="small muted">No users found or insufficient permissions.</div>}

        {profiles.length > 0 && (
          <div className="overflow-auto border rounded">
            <table className="min-w-full divide-y">
              <thead className="bg-secondary p-2">
                <tr>
                  <th className="px-4 py-2 text-left">Name / Email</th>
                  <th className="px-4 py-2 text-left">Role</th>
                  <th className="px-4 py-2 text-left">Joined</th>
                  <th className="px-4 py-2">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-card divide-y">
                {profiles.map((p) => (
                  <tr key={p.id}>
                    <td className="px-4 py-3">
                      <div className="font-medium">{p.full_name || p.id}</div>
                      <div className="text-sm text-muted-foreground">{p.email || ''}</div>
                    </td>
                    <td className="px-4 py-3">{p.role || 'member'}</td>
                    <td className="px-4 py-3">{p.created_at ? new Date(p.created_at).toLocaleString() : ''}</td>
                    <td className="px-4 py-3 text-center space-x-2">
                      <button className="btn" onClick={() => changeRole(p.id, 'admin')}>Promote</button>
                      <button className="btn warn" onClick={() => changeRole(p.id, 'member')}>Demote</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-medium">Audit Log</h3>
            <div className="flex items-center gap-2">
              <button
                className="btn"
                onClick={async () => {
                  // refresh current page
                  await fetchAudit(currentCursor);
                }}
                disabled={loadingAudit}
              >{loadingAudit ? 'Loading…' : 'Refresh'}</button>
              <button
                className="btn"
                onClick={async () => {
                  // Prev: pop last cursor and fetch
                  if (cursors.length === 0) return;
                  const prev = cursors[cursors.length - 1] || null;
                  const remaining = cursors.slice(0, -1);
                  setCursors(remaining);
                  setCurrentCursor(prev || null);
                  await fetchAudit(prev || null);
                }}
                disabled={loadingAudit || cursors.length === 0}
              >Prev</button>
              <button
                className="btn"
                onClick={async () => {
                  // Next: fetch using currentCursor as 'after' and push current onto stack
                  const nextCursor = await fetchAudit(currentCursor);
                  if (nextCursor) {
                    setCursors((s) => [...s, currentCursor]);
                    setCurrentCursor(nextCursor);
                  }
                }}
                disabled={loadingAudit || !hasMore}
              >Next</button>
            </div>
          </div>
          {loadingAudit && <div>Loading audit…</div>}
          {!loadingAudit && audit.length === 0 && <div className="small muted">No recent audit entries.</div>}
          {audit.length > 0 && (
            <div className="overflow-auto border rounded">
              <table className="min-w-full text-sm">
                <thead className="bg-secondary"><tr>
                  <th className="px-3 py-2 text-left">When</th>
                      <th className="px-3 py-2 text-left">Actor</th>
                      <th className="px-3 py-2 text-left">Target</th>
                  <th className="px-3 py-2 text-left">Change</th>
                  <th className="px-3 py-2 text-left">Reason</th>
                </tr></thead>
                <tbody>
                  {audit.map((a) => (
                    <tr key={a.id} className="border-t">
                      <td className="px-3 py-2">{new Date(a.created_at).toLocaleString()}</td>
                          <td className="px-3 py-2">
                            <div className="font-medium">{a.changed_by_name || a.changed_by}</div>
                            <div className="text-sm text-muted-foreground">{a.changed_by_email || ''}</div>
                          </td>
                          <td className="px-3 py-2">
                            <div className="font-medium">{a.target_user_name || a.target_user}</div>
                            <div className="text-sm text-muted-foreground">{a.target_user_email || ''}</div>
                          </td>
                      <td className="px-3 py-2">{a.old_role || '—'} → {a.new_role || '—'}</td>
                      <td className="px-3 py-2">{a.reason || (a.details ? JSON.stringify(a.details) : '')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
