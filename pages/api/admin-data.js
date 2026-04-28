// API route: validates password, fetches device data from Supabase
// Deployed at: /api/admin-data
// Required Vercel env vars: ADMIN_PASSWORD, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//
// Actions:
//   action: 'dashboard' (default) — current device status + recent events
//   action: 'audit' — multi-month snapshot audit data
//   action: 'triage_update' — save Ana audit decisions

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { password, action = 'dashboard', payload } = req.body || {};

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
    if (action === 'dashboard') return await handleDashboard(supabaseUrl, headers, res);
    if (action === 'audit') return await handleAudit(supabaseUrl, headers, res);
    if (action === 'triage_update') return await handleTriageUpdate(supabaseUrl, headers, res, payload);
    return res.status(400).json({ error: 'Unknown action' });
  } catch (err) {
    console.error('Admin API error:', err);
    return res.status(500).json({ error: err.message });
  }
}

// ─── DASHBOARD ────────────────────────────────────────────────
async function handleDashboard(supabaseUrl, headers, res) {
  const statusRes = await fetch(
    `${supabaseUrl}/rest/v1/device_current_status?select=*&order=last_event_at.asc`,
    { headers }
  );
  if (!statusRes.ok) throw new Error(`device_current_status: ${statusRes.status} ${await statusRes.text()}`);
  const currentStatus = await statusRes.json();

  const eventsRes = await fetch(
    `${supabaseUrl}/rest/v1/device_events?select=device_id,display_name,display_group,account,event_type,occurred_at,payload&order=occurred_at.desc&limit=200`,
    { headers }
  );
  if (!eventsRes.ok) throw new Error(`device_events: ${eventsRes.status} ${await eventsRes.text()}`);
  const allEvents = await eventsRes.json();

  const latestPayloadByDevice = {};
  for (const ev of allEvents) {
    if (ev.device_id && !latestPayloadByDevice[ev.device_id]) {
      latestPayloadByDevice[ev.device_id] = ev.payload;
    }
  }
  const enrichedStatus = currentStatus.map(d => ({
    ...d,
    payload: latestPayloadByDevice[d.device_id] || null,
  }));

  const recentEvents = allEvents.slice(0, 50);
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
}

// ─── AUDIT ────────────────────────────────────────────────────
async function handleAudit(supabaseUrl, headers, res) {
  const auditRes = await fetch(
    `${supabaseUrl}/rest/v1/device_audit_status?select=*&order=last_known_pulse.asc.nullsfirst`,
    { headers }
  );
  if (!auditRes.ok) throw new Error(`device_audit_status: ${auditRes.status} ${await auditRes.text()}`);
  const audit = await auditRes.json();

  const summaryRes = await fetch(
    `${supabaseUrl}/rest/v1/spectrio_snapshots?select=snapshot_month,status&order=snapshot_month.asc&limit=10000`,
    { headers: { ...headers, Range: '0-9999' } }
  );
  if (!summaryRes.ok) throw new Error(`spectrio_snapshots: ${summaryRes.status} ${await summaryRes.text()}`);
  const allSnapRows = await summaryRes.json();
  const monthSummary = {};
  for (const row of allSnapRows) {
    const m = row.snapshot_month;
    if (!monthSummary[m]) monthSummary[m] = { total: 0, ok: 0, offline: 0, error: 0 };
    monthSummary[m].total++;
    monthSummary[m][row.status] = (monthSummary[m][row.status] || 0) + 1;
  }
  const months = Object.entries(monthSummary)
    .map(([month, counts]) => ({ month, ...counts }))
    .sort((a, b) => a.month.localeCompare(b.month));

  const buckets = {
    persistent_dead: audit.filter(d => d.audit_bucket === 'persistent_dead'),
    newly_failed: audit.filter(d => d.audit_bucket === 'newly_failed'),
    recovered: audit.filter(d => d.audit_bucket === 'recovered'),
    active: audit.filter(d => d.audit_bucket === 'active' || d.audit_bucket === 'active_with_history'),
    mixed: audit.filter(d => d.audit_bucket === 'mixed'),
  };

  const stats = {
    totalDevices: audit.length,
    persistentDead: buckets.persistent_dead.length,
    newlyFailed: buckets.newly_failed.length,
    recovered: buckets.recovered.length,
    active: buckets.active.length,
    mixed: buckets.mixed.length,
  };

  return res.status(200).json({ months, audit, buckets, stats });
}

// ─── TRIAGE UPDATE ────────────────────────────────────────────
async function handleTriageUpdate(supabaseUrl, headers, res, payload) {
  if (!payload?.display_group || !payload?.display_name) {
    return res.status(400).json({ error: 'Missing display_group or display_name' });
  }
  const validStatuses = ['pending', 'delete', 'repair', 'replaced', 'abandoned'];
  if (payload.triage_status && !validStatuses.includes(payload.triage_status)) {
    return res.status(400).json({ error: 'Invalid triage_status' });
  }

  const body = {
    account: payload.account || null,
    display_group: payload.display_group,
    display_name: payload.display_name,
    triage_status: payload.triage_status || 'pending',
    notes: payload.notes ?? null,
    last_updated: new Date().toISOString(),
  };
  if (payload.triage_status && payload.triage_status !== 'pending') {
    body.ana_confirmed_at = new Date().toISOString();
  }

  const upsertRes = await fetch(
    `${supabaseUrl}/rest/v1/device_triage?on_conflict=display_group,display_name`,
    {
      method: 'POST',
      headers: { ...headers, Prefer: 'resolution=merge-duplicates,return=representation' },
      body: JSON.stringify(body),
    }
  );

  if (!upsertRes.ok) {
    const txt = await upsertRes.text();
    throw new Error(`triage upsert failed: ${upsertRes.status} ${txt}`);
  }

  const result = await upsertRes.json();
  return res.status(200).json({ success: true, record: result[0] || body });
}
