import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  try {
    const payload = req.body;

    // Enplug sends an array of device events
    const events = Array.isArray(payload) ? payload : [payload];

    const rows = events.map(event => ({
      device_id: event.DeviceId || event.device_id || null,
      display_name: event.DisplayName || event.display_name || null,
      display_group: event.DisplayGroupName || event.display_group || null,
      account: event.AccountName || event.account || null,
      event_type: event.EventType || event.event_type || 'offline',
      occurred_at: event.OccurredAt || event.occurred_at || new Date().toISOString(),
      payload: event,
    }));

    const { error } = await supabase.from('device_events').insert(rows);

    if (error) {
      console.error('Supabase insert error:', error);
      return res.status(500).json({ error: 'Database error' });
    }

    return res.status(200).json({ received: rows.length });
  } catch (err) {
    console.error('Webhook error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}
