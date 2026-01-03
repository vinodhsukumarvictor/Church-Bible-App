import { createClient } from '@supabase/supabase-js';
import Sentry from '../../../lib/sentry';

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const service = supabaseUrl && serviceRoleKey ? createClient(supabaseUrl, serviceRoleKey) : null;

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method Not Allowed' });
  if (!service) return res.status(500).json({ error: 'Supabase service role not configured' });

  try {
    const authHeader = req.headers.authorization || '';
    const token = (authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : authHeader) || null;
    if (!token) return res.status(401).json({ error: 'Missing access token' });

    const { data: userData, error: userErr } = await service.auth.getUser(token ? { access_token: token } : undefined);
    if (userErr || !userData || !userData.user) return res.status(401).json({ error: 'Invalid token' });
    const requester = userData.user;

    if (Sentry && requester) {
      try {
        Sentry.setUser({ id: requester.id, email: requester.email || null });
      } catch (e) {
        console.warn('Sentry setUser failed', e?.message || e);
      }
    }

    const { data: me, error: meErr } = await service
      .from('profiles')
      .select('role')
      .eq('id', requester.id)
      .maybeSingle();
    if (meErr) throw meErr;
    const role = me?.role || null;
    if (!role || (role !== 'admin' && role !== 'super_admin' && role !== 'owner')) {
      return res.status(403).json({ error: 'Forbidden: admin role required' });
    }

    const limit = Math.min(Number(req.query.limit) || 25, 200);
    // Cursor-based pagination: 'after' is an ISO timestamp (created_at) - fetch rows with created_at < after (since ordering is DESC)
    const after = req.query.after || null;

    // Fetch one extra row to determine has_more
    const fetchLimit = limit + 1;
    let q = service
      .from('admin_audit_log')
      .select('id, changed_by, target_user, old_role, new_role, reason, details, created_at')
      .order('created_at', { ascending: false });

    if (after) {
      // only include rows strictly older than the cursor
      q = q.lt('created_at', after);
    }

    const { data, error } = await q.limit(fetchLimit);
    if (error) throw error;

    let has_more = false;
    let pageRows = data || [];
    if (pageRows.length > limit) {
      has_more = true;
      pageRows = pageRows.slice(0, limit);
    }

    // Enrich entries with profile lookup for human-friendly names/emails
    const ids = new Set();
    for (const row of pageRows) {
      if (row.changed_by) ids.add(row.changed_by);
      if (row.target_user) ids.add(row.target_user);
    }
    const idList = Array.from(ids);
    let profiles = {};
    if (idList.length) {
      const { data: profs, error: profErr } = await service
        .from('profiles')
        .select('id, full_name, email')
        .in('id', idList);
      if (!profErr && profs) {
        for (const p of profs) profiles[p.id] = p;
      }
    }

    const enriched = pageRows.map((row) => ({
      ...row,
      changed_by_name: profiles[row.changed_by]?.full_name || null,
      changed_by_email: profiles[row.changed_by]?.email || null,
      target_user_name: profiles[row.target_user]?.full_name || null,
      target_user_email: profiles[row.target_user]?.email || null,
    }));

    const next_cursor = pageRows.length ? pageRows[pageRows.length - 1].created_at : null;

    return res.status(200).json({ data: enriched, next_cursor, has_more });
  } catch (err) {
    console.error('audit fetch error', err);
    if (Sentry) {
      try { Sentry.captureException(err); } catch (e) { console.warn('Sentry capture failed', e?.message || e); }
    }
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
