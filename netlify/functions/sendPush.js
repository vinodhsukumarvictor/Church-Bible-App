const webpush = require('web-push');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const vapidPublic = process.env.VAPID_PUBLIC_KEY;
const vapidPrivate = process.env.VAPID_PRIVATE_KEY;
const contactEmail = process.env.VAPID_CONTACT_EMAIL || 'mailto:admin@example.com';

if (!supabaseUrl || !serviceRoleKey) {
  console.warn('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars.');
}
if (!vapidPublic || !vapidPrivate) {
  console.warn('Missing VAPID_PUBLIC_KEY or VAPID_PRIVATE_KEY env vars.');
}

webpush.setVapidDetails(contactEmail, vapidPublic || '', vapidPrivate || '');

const supabase = createClient(supabaseUrl, serviceRoleKey);

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { title, body, url = '/', userId } = JSON.parse(event.body || '{}');
    if (!title) return { statusCode: 400, body: 'Missing title' };

    // Fetch subscriptions (all or by user)
    let query = supabase.from('push_subscriptions').select('*');
    if (userId) query = query.eq('user_id', userId);
    const { data: subs, error } = await query;
    if (error) {
      console.error('Supabase fetch error', error);
      return { statusCode: 500, body: 'Failed to fetch subscriptions' };
    }

    const payload = JSON.stringify({ title, body, url });
    const results = await Promise.allSettled(
      (subs || []).map(sub => webpush.sendNotification({
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth },
      }, payload))
    );

    // Clean up failed endpoints (410/404)
    const failures = results
      .map((r, i) => ({ r, sub: subs[i] }))
      .filter(x => x.r.status === 'rejected' && x.r.reason?.statusCode && [404, 410].includes(x.r.reason.statusCode));

    if (failures.length) {
      const endpointsToDelete = failures.map(x => x.sub.endpoint);
      await supabase.from('push_subscriptions').delete().in('endpoint', endpointsToDelete);
      console.warn('Removed stale subscriptions', endpointsToDelete.length);
    }

    return { statusCode: 200, body: JSON.stringify({ sent: results.length, failed: failures.length }) };
  } catch (err) {
    console.error('sendPush error', err);
    return { statusCode: 500, body: 'Internal Server Error' };
  }
};
