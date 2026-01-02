const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.warn('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars for subscribe function.');
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const { subscription, userId } = body;

    if (!subscription || !subscription.endpoint) {
      return { statusCode: 400, body: 'Missing subscription' };
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
      return { statusCode: 500, body: 'Failed to save subscription' };
    }

    return { statusCode: 200, body: 'Subscribed' };
  } catch (err) {
    console.error('Subscribe error', err);
    return { statusCode: 500, body: 'Internal Server Error' };
  }
};
