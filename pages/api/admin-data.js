// API route: validates password, fetches device data from Supabase
// Deployed at: /api/admin-data
// Required Vercel env vars: ADMIN_PASSWORD, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { password } = req.body || {};

  if (!password || password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ error: 'Supabase env vars not configured on Vercel' });
  }

  const headers = {
    apikey: supabaseKey,
    Authorization: `Bearer ${supabaseKey}`,
    'Content-Type': 'application/json',
  };

  try {
    // Fetch current status (view) — sorted by oldest event first (most concerning at top)
    const statusRes = await fetch(
      `${supabaseUrl}/rest/v1/device_current_status?select=*&order=last_event_at.asc`,
      { headers }
    );
    if (!statusRes.ok) {
      const txt = await statusRes.text();
      throw new Error(`device_current_status fetch failed: ${statusRes.status} ${txt}`);
    }
    const currentStatus = await statusRes.json();

    // Pull payload too so we can extract the Enplug monitoring link in the UI
    // Also enrich currentStatus rows with payload from the matching latest event
    const eventsRes = await fetch(
      `${supabaseUrl}/rest/v1/device_events?select=device_id,display_name,display_group,account,event_type,occurred_at,payload&order=occurred_at.desc&limit=200`,
      { headers }
    );
    if (!eventsRes.ok) {
      const txt = await eventsRes.text();
      throw new Error(`device_events fetch failed: ${eventsRes.status} ${txt}`);
    }
    const allEvents = await eventsRes.json();

    // Build a quick lookup: device_id -> latest payload
    const latestPayloadByDevice = {};
    for (const ev of allEvents) {
      if (ev.device_id && !latestPayloadByDevice[ev.device_id]) {
        latestPayloadByDevice[ev.device_id] = ev.payload;
      }
    }
    // Attach payload to currentStatus rows
    const enrichedStatus = currentStatus.map(d => ({
      ...d,
      payload: latestPayloadByDevice[d.device_id] || null,
    }));

    // Recent events feed = last 50
    const recentEvents = allEvents.slice(0, 50);

    // Stats
    const total = enrichedStatus.length;
    const offline = enrichedStatus.filter(d => d.current_status === 'offline').length;
    const oldestOffline = enrichedStatus
      .filter(d => d.current_status === 'offline' && d.last_event_at)
      .reduce((max, d) => {
        const days = Math.floor((Date.now() - new Date(d.last_event_at).getTime()) / 86400000);
        return Math.max(max, days);
      }, 0);

    return res.status(200).json({
      currentStatus: enrichedStatus,
      recentEvents,
      stats: { total, offline, oldestOffline },
    });
  } catch (err) {
    console.error('Admin API error:', err);
    return res.status(500).json({ error: err.message });
  }
}
