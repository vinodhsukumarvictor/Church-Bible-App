import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = supabaseUrl && serviceRoleKey ? createClient(supabaseUrl, serviceRoleKey) : null;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  if (!supabase) {
    return res.status(500).send('Supabase service role not configured');
  }

  try {
    const { subscription, userId } = req.body || {};
    if (!subscription || !subscription.endpoint) {
      return res.status(400).send('Missing subscription');
    }

    const payload = {
      user_id: userId || null,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys?.p256dh || null,
      auth: subscription.keys?.auth || null,
    };

    const { error } = await supabase
      .from('push_subscriptions')
      .upsert(payload, { onConflict: 'user_id,endpoint' });

    if (error) {
      console.error('Supabase upsert error', error);
      return res.status(500).send('Failed to save subscription');
    }

    return res.status(200).send('Subscribed');
  } catch (err) {
    console.error('Subscribe error', err);
    return res.status(500).send('Internal Server Error');
  }
}
