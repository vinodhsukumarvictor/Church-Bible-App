import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const vapidPublic = process.env.VAPID_PUBLIC_KEY;
const vapidPrivate = process.env.VAPID_PRIVATE_KEY;
const contactEmail = process.env.VAPID_CONTACT_EMAIL || 'mailto:admin@example.com';

if (vapidPublic && vapidPrivate) {
  webpush.setVapidDetails(contactEmail, vapidPublic, vapidPrivate);
}

const supabase = supabaseUrl && serviceRoleKey ? createClient(supabaseUrl, serviceRoleKey) : null;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');
  if (!supabase) return res.status(500).send('Supabase service role not configured');
  if (!vapidPublic || !vapidPrivate) return res.status(500).send('VAPID keys not configured');

  try {
    const { title, body, url = '/', userId } = req.body || {};
    if (!title) return res.status(400).send('Missing title');

    let query = supabase.from('push_subscriptions').select('*');
    if (userId) query = query.eq('user_id', userId);
    const { data: subs, error } = await query;
    if (error) {
      console.error('Supabase fetch error', error);
      return res.status(500).send('Failed to fetch subscriptions');
    }

    const payload = JSON.stringify({ title, body, url });
    const results = await Promise.allSettled(
      (subs || []).map((sub) =>
        webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          payload
        )
      )
    );

    const failures = results
      .map((r, i) => ({ r, sub: subs[i] }))
      .filter((x) => x.r.status === 'rejected' && x.r.reason?.statusCode && [404, 410].includes(x.r.reason.statusCode));

    if (failures.length) {
      const endpointsToDelete = failures.map((x) => x.sub.endpoint);
      await supabase.from('push_subscriptions').delete().in('endpoint', endpointsToDelete);
      console.warn('Removed stale subscriptions', endpointsToDelete.length);
    }

    return res.status(200).json({ sent: results.length, failed: failures.length });
  } catch (err) {
    console.error('sendPush error', err);
    return res.status(500).send('Internal Server Error');
  }
}
