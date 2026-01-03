import { createClient } from '@supabase/supabase-js';
import { rateLimit } from '../../../lib/rateLimiter';
import Sentry from '../../../lib/sentry';

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const service = supabaseUrl && serviceRoleKey ? createClient(supabaseUrl, serviceRoleKey) : null;

const limiter = rateLimit({ tokens: 20, refillInterval: 60 * 1000 });

export default async function handler(req, res) {
  if (!limiter(req, res)) return; // enforce rate limiting
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
  if (!service) return res.status(500).json({ error: 'Supabase service role not configured' });

  try {
    const authHeader = req.headers.authorization || '';
    const token = (authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : authHeader) || null;
    if (!token) return res.status(401).json({ error: 'Missing access token' });

    // Verify the calling user from the access token
    const { data: userData, error: userErr } = await service.auth.getUser(token ? { access_token: token } : undefined);
    if (userErr || !userData || !userData.user) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    const requester = userData.user;

    if (Sentry && requester) {
      try {
        Sentry.setUser({ id: requester.id, email: requester.email || null });
      } catch (e) {
        console.warn('Sentry setUser failed', e?.message || e);
      }
    }
    // Ensure requester is an app admin (check profiles.role)
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

    const { targetUserId, newRole, reason } = req.body || {};
    if (!targetUserId || !newRole) return res.status(400).json({ error: 'Missing parameters' });

    // Fetch old role
    const { data: target, error: targetErr } = await service
      .from('profiles')
      .select('role')
      .eq('id', targetUserId)
      .maybeSingle();
    if (targetErr) throw targetErr;
    const oldRole = target?.role || null;

    // Update role
    const { error: updErr } = await service
      .from('profiles')
      .update({ role: newRole })
      .eq('id', targetUserId);
    if (updErr) throw updErr;

    // Insert audit log
    const { error: logErr } = await service.from('admin_audit_log').insert([{ changed_by: requester.id, target_user: targetUserId, old_role: oldRole, new_role: newRole, reason: reason || null }]);
    if (logErr) console.warn('Failed to write audit log', logErr);

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('changeRole error', err);
    if (Sentry) {
      try { Sentry.captureException(err); } catch (e) { console.warn('Sentry capture failed', e?.message || e); }
    }
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
