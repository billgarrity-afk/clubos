export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  try {
    const payload = req.body;
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

    const response = await fetch(
      `${process.env.SUPABASE_URL}/rest/v1/device_events`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': process.env.SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify(rows),
      }
    );

    if (!response.ok) {
      const err = await response.text();
      console.error('Supabase error:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    return res.status(200).json({ received: rows.length });
  } catch (err) {
    console.error('Webhook error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}
