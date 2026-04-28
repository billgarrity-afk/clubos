import { useState, useEffect, useMemo } from 'react';
import Head from 'next/head';

export default function Admin() {
  const [password, setPassword] = useState('');
  const [authed, setAuthed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('monitor'); // 'monitor' | 'audit'
  const [dashData, setDashData] = useState(null);
  const [auditData, setAuditData] = useState(null);
  const [accountFilter, setAccountFilter] = useState('all');
  const [auditBucketTab, setAuditBucketTab] = useState('newly_failed');
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = sessionStorage.getItem('clubos_admin_pw');
    if (saved) {
      setPassword(saved);
      attemptLogin(saved);
    }
  }, []);

  const callAPI = async (pw, action, payload) => {
    const res = await fetch('/api/admin-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: pw, action, payload }),
    });
    if (res.status === 401) {
      sessionStorage.removeItem('clubos_admin_pw');
      throw new Error('Incorrect password');
    }
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      throw new Error(j.error || `Server error (${res.status})`);
    }
    return await res.json();
  };

  const attemptLogin = async (pw) => {
    setLoading(true);
    setError('');
    try {
      const dash = await callAPI(pw, 'dashboard');
      setDashData(dash);
      setAuthed(true);
      setLastUpdated(new Date());
      sessionStorage.setItem('clubos_admin_pw', pw);
      // Pre-load audit data in the background
      callAPI(pw, 'audit').then(setAuditData).catch(() => {});
    } catch (e) {
      setError(e.message);
      setAuthed(false);
    } finally {
      setLoading(false);
    }
  };

  const refresh = async () => {
    setLoading(true);
    try {
      if (tab === 'monitor') {
        const d = await callAPI(password, 'dashboard');
        setDashData(d);
      } else {
        const d = await callAPI(password, 'audit');
        setAuditData(d);
      }
      setLastUpdated(new Date());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const switchTab = async (t) => {
    setTab(t);
    setError('');
    if (t === 'audit' && !auditData) {
      setLoading(true);
      try {
        const d = await callAPI(password, 'audit');
        setAuditData(d);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
  };

  const updateTriage = async (device, newStatus) => {
    try {
      await callAPI(password, 'triage_update', {
        display_group: device.display_group,
        display_name: device.display_name,
        account: device.account,
        triage_status: newStatus,
      });
      // Optimistically update local state
      setAuditData(prev => {
        if (!prev) return prev;
        const updateDevice = d =>
          d.display_group === device.display_group && d.display_name === device.display_name
            ? { ...d, triage_status: newStatus, ana_confirmed_at: newStatus !== 'pending' ? new Date().toISOString() : null }
            : d;
        return {
          ...prev,
          audit: prev.audit.map(updateDevice),
          buckets: Object.fromEntries(
            Object.entries(prev.buckets).map(([k, v]) => [k, v.map(updateDevice)])
          ),
        };
      });
    } catch (e) {
      alert('Failed to save: ' + e.message);
    }
  };

  const logout = () => {
    sessionStorage.removeItem('clubos_admin_pw');
    setAuthed(false);
    setDashData(null);
    setAuditData(null);
    setPassword('');
  };

  const colors = {
    bg: '#0C0F0A',
    panel: '#111A13',
    panelLight: '#142018',
    border: 'rgba(255,255,255,0.08)',
    borderHi: 'rgba(74,140,92,0.3)',
    text: '#F0EBE3',
    textDim: 'rgba(240,235,227,0.55)',
    textFaint: 'rgba(240,235,227,0.3)',
    green: '#4A8C5C',
    greenDark: '#2D5A3D',
    gold: '#C9A84C',
    red: '#E05252',
    blue: '#5AA0D6',
  };

  // ── login screen ─────────────────────────────────────────────
  if (!authed) {
    return (
      <>
        <Head>
          <title>ClubOS Fleet Monitor</title>
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
        </Head>
        <div style={{ minHeight: '100dvh', background: colors.bg, fontFamily: "'Inter', system-ui, sans-serif", color: colors.text, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ width: '100%', maxWidth: 380, background: colors.panel, border: `1px solid ${colors.border}`, borderRadius: 14, padding: 32 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
              <Logo colors={colors} size={38} />
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, lineHeight: 1 }}>ClubOS Fleet Monitor</div>
                <div style={{ fontSize: 11, color: colors.textDim, marginTop: 4, letterSpacing: 0.5 }}>Internal · Bill only</div>
              </div>
            </div>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && attemptLogin(password)}
              placeholder="Enter password"
              autoFocus
              style={{ width: '100%', background: colors.bg, border: `1px solid ${colors.border}`, borderRadius: 10, padding: '12px 14px', color: colors.text, fontSize: 14, outline: 'none', fontFamily: 'inherit', marginBottom: 12 }}
            />
            <button
              onClick={() => attemptLogin(password)}
              disabled={!password || loading}
              style={{ width: '100%', background: password && !loading ? `linear-gradient(135deg, ${colors.greenDark}, ${colors.green})` : '#1A1A1A', border: `1px solid ${password && !loading ? colors.borderHi : colors.border}`, borderRadius: 10, padding: '12px', color: colors.text, fontSize: 14, fontWeight: 600, cursor: password && !loading ? 'pointer' : 'default' }}
            >
              {loading ? 'Checking…' : 'Sign in'}
            </button>
            {error && <div style={{ marginTop: 14, fontSize: 13, color: colors.red, textAlign: 'center' }}>{error}</div>}
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>ClubOS Fleet Monitor</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </Head>
      <div style={{ minHeight: '100dvh', background: colors.bg, fontFamily: "'Inter', system-ui, sans-serif", color: colors.text }}>

        {/* Header */}
        <div style={{ background: colors.panel, borderBottom: `1px solid ${colors.border}`, padding: '0 24px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Logo colors={colors} size={34} />
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, lineHeight: 1 }}>ClubOS Fleet Monitor</div>
              <div style={{ fontSize: 11, color: colors.textDim, marginTop: 3, letterSpacing: 0.5 }}>
                {lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}` : ''}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={refresh} disabled={loading} style={btnSecondary(colors)}>{loading ? 'Refreshing…' : '↻ Refresh'}</button>
            <button onClick={logout} style={btnGhost(colors)}>Logout</button>
          </div>
        </div>

        {/* Tab nav */}
        <div style={{ borderBottom: `1px solid ${colors.border}`, background: colors.panel, padding: '0 24px', display: 'flex', gap: 4 }}>
          <TabButton active={tab === 'monitor'} onClick={() => switchTab('monitor')} colors={colors}>Live Monitor</TabButton>
          <TabButton active={tab === 'audit'} onClick={() => switchTab('audit')} colors={colors}>Network Audit</TabButton>
        </div>

        {error && (
          <div style={{ background: 'rgba(224,82,82,0.1)', borderBottom: `1px solid rgba(224,82,82,0.3)`, padding: '10px 24px', fontSize: 13, color: colors.red }}>
            {error}
          </div>
        )}

        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '24px' }}>
          {tab === 'monitor' && dashData && <MonitorTab data={dashData} accountFilter={accountFilter} setAccountFilter={setAccountFilter} colors={colors} />}
          {tab === 'audit' && auditData && <AuditTab data={auditData} bucketTab={auditBucketTab} setBucketTab={setAuditBucketTab} accountFilter={accountFilter} setAccountFilter={setAccountFilter} updateTriage={updateTriage} colors={colors} />}
          {tab === 'audit' && !auditData && loading && <div style={{ padding: 40, textAlign: 'center', color: colors.textDim }}>Loading audit data…</div>}
          <div style={{ fontSize: 11, color: colors.textFaint, textAlign: 'center', padding: '24px 0' }}>
            ClubOS · clubhousectv.com · Internal infrastructure tool
          </div>
        </div>

        <style>{`* { box-sizing: border-box; } body { margin: 0; } select { appearance: none; background-image: url("data:image/svg+xml;charset=US-ASCII,%3Csvg width='12' height='8' viewBox='0 0 12 8' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l5 5 5-5' stroke='rgba(240,235,227,0.5)' stroke-width='1.5' fill='none'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 12px center; padding-right: 32px; } button:disabled { cursor: default; opacity: 0.6; } a:hover { text-decoration: underline; }`}</style>
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════
// MONITOR TAB (live webhook view)
// ═══════════════════════════════════════════════════════════════
function MonitorTab({ data, accountFilter, setAccountFilter, colors }) {
  const { currentStatus = [], recentEvents = [], stats = { total: 0, offline: 0, oldestOffline: 0 } } = data;

  const accounts = ['all', ...new Set(currentStatus.map(d => d.account).filter(Boolean))];
  const filteredOffline = currentStatus
    .filter(d => d.current_status === 'offline')
    .filter(d => accountFilter === 'all' || d.account === accountFilter);
  const filteredEvents = recentEvents.filter(e => accountFilter === 'all' || e.account === accountFilter);

  const daysOffline = ts => {
    if (!ts) return '—';
    return Math.floor((Date.now() - new Date(ts).getTime()) / 86400000);
  };
  const fmtDate = ts => ts ? new Date(ts).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—';

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 28 }}>
        <StatCard label="Total Devices Tracked" value={stats.total} colors={colors} />
        <StatCard label="Currently Offline" value={stats.offline} accent={stats.offline > 0 ? colors.red : colors.green} colors={colors} />
        <StatCard label="Longest Offline" value={stats.oldestOffline > 0 ? `${stats.oldestOffline} days` : '—'} accent={stats.oldestOffline > 7 ? colors.red : colors.gold} colors={colors} />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ fontSize: 16, fontWeight: 600 }}>Currently Offline</div>
        <select value={accountFilter} onChange={e => setAccountFilter(e.target.value)} style={selectStyle(colors)}>
          {accounts.map(a => <option key={a} value={a}>{a === 'all' ? 'All Accounts' : a}</option>)}
        </select>
      </div>

      <div style={tableWrap(colors)}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: colors.panelLight }}>
              <Th>Device</Th><Th>Account</Th><Th>Network</Th><Th align="right">Days Offline</Th><Th>Last Seen</Th><Th align="right"></Th>
            </tr>
          </thead>
          <tbody>
            {filteredOffline.length === 0 ? (
              <tr><td colSpan="6" style={{ padding: '32px 16px', textAlign: 'center', color: colors.textDim }}>No offline devices for this filter</td></tr>
            ) : filteredOffline.map(d => {
              const days = daysOffline(d.last_event_at);
              const enplugLink = d.payload?.Data?.MonitoringLink;
              return (
                <tr key={d.device_id} style={{ borderTop: `1px solid ${colors.border}` }}>
                  <Td weight={500}>{d.display_name || d.device_id}</Td>
                  <Td color={colors.textDim}>{d.account || '—'}</Td>
                  <Td color={colors.textDim}>{d.display_group || '—'}</Td>
                  <Td align="right" color={days > 7 ? colors.red : days > 3 ? colors.gold : colors.text} weight={600}>{days}</Td>
                  <Td color={colors.textDim}>{fmtDate(d.last_event_at)}</Td>
                  <Td align="right">
                    {enplugLink && (
                      <a href={enplugLink} target="_blank" rel="noopener" style={{ color: colors.gold, fontSize: 11, textDecoration: 'none', fontFamily: 'monospace' }} title={d.device_id}>
                        {d.device_id?.slice(-8)} ↗
                      </a>
                    )}
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '28px 0 14px' }}>
        <div style={{ fontSize: 16, fontWeight: 600 }}>Recent Events <span style={{ color: colors.textDim, fontWeight: 400, fontSize: 13 }}>· last 50</span></div>
      </div>
      <div style={tableWrap(colors)}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: colors.panelLight }}>
              <Th>Time</Th><Th>Device</Th><Th>Account</Th><Th>Network</Th><Th>Event</Th>
            </tr>
          </thead>
          <tbody>
            {filteredEvents.length === 0 ? (
              <tr><td colSpan="5" style={{ padding: '32px 16px', textAlign: 'center', color: colors.textDim }}>No events</td></tr>
            ) : filteredEvents.map((e, i) => (
              <tr key={i} style={{ borderTop: `1px solid ${colors.border}` }}>
                <Td color={colors.textDim}>{fmtDate(e.occurred_at)}</Td>
                <Td weight={500}>{e.display_name || e.device_id}</Td>
                <Td color={colors.textDim}>{e.account || '—'}</Td>
                <Td color={colors.textDim}>{e.display_group || '—'}</Td>
                <Td><EventBadge type={e.event_type} colors={colors} /></Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════
// AUDIT TAB (multi-month snapshot view)
// ═══════════════════════════════════════════════════════════════
function AuditTab({ data, bucketTab, setBucketTab, accountFilter, setAccountFilter, updateTriage, colors }) {
  const { months = [], buckets = {}, stats = {} } = data;
  const accounts = ['all', ...new Set((data.audit || []).map(d => d.account).filter(Boolean))];

  const fmtMonth = m => new Date(m + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  const fmtPulse = ts => ts ? new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
  const monthsOffline = ts => {
    if (!ts) return '—';
    const d = Math.floor((Date.now() - new Date(ts).getTime()) / 86400000 / 30);
    return d;
  };

  const bucketTabs = [
    { key: 'newly_failed', label: 'Newly Failed', count: stats.newlyFailed, accent: colors.red, desc: 'Was Ok, now offline — repair priority' },
    { key: 'persistent_dead', label: 'Persistent Dead', count: stats.persistentDead, accent: colors.gold, desc: 'Offline in every snapshot — likely abandoned, candidates for delete' },
    { key: 'recovered', label: 'Recovered', count: stats.recovered, accent: colors.green, desc: 'Was offline, now Ok — proves the network can come back' },
    { key: 'active', label: 'Active', count: stats.active, accent: colors.blue, desc: 'Currently Ok' },
  ];

  const activeBucket = buckets[bucketTab] || [];
  const filtered = activeBucket.filter(d => accountFilter === 'all' || d.account === accountFilter);

  const exportCSV = () => {
    const rows = filtered.map(d => ({
      account: d.account || '',
      display_group: d.display_group || '',
      display_name: d.display_name || '',
      audit_bucket: d.audit_bucket || '',
      offline_count: d.offline_count,
      total_snapshots: d.total_snapshots,
      last_known_pulse: d.last_known_pulse || '',
      months_offline: monthsOffline(d.last_known_pulse),
      triage_status: d.triage_status || 'pending',
      triage_notes: d.triage_notes || '',
    }));
    if (rows.length === 0) return alert('No rows to export');
    const headers = Object.keys(rows[0]);
    const csv = [
      headers.join(','),
      ...rows.map(r => headers.map(h => {
        const v = String(r[h] ?? '');
        return v.includes(',') || v.includes('"') ? `"${v.replace(/"/g, '""')}"` : v;
      }).join(','))
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `clubos-audit-${bucketTab}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      {/* Snapshot summary across months */}
      <div style={{ background: colors.panel, border: `1px solid ${colors.border}`, borderRadius: 12, padding: '20px 22px', marginBottom: 24 }}>
        <div style={{ fontSize: 11, color: colors.textDim, letterSpacing: 1.5, textTransform: 'uppercase', fontWeight: 600, marginBottom: 14 }}>Snapshot History · Spectrio Monthly Reports</div>
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${months.length}, 1fr)`, gap: 14 }}>
          {months.map(m => (
            <div key={m.month} style={{ borderLeft: `2px solid ${colors.borderHi}`, paddingLeft: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: colors.gold, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>{fmtMonth(m.month)}</div>
              <div style={{ fontSize: 24, fontWeight: 700 }}>{m.total}</div>
              <div style={{ fontSize: 11, color: colors.textDim, marginTop: 3 }}>
                {m.ok || 0} ok · <span style={{ color: colors.red }}>{m.offline || 0} off</span>{m.error ? ` · ${m.error} err` : ''}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 28 }}>
        <StatCard label="Total Devices Audited" value={stats.totalDevices} colors={colors} />
        <StatCard label="Newly Failed" value={stats.newlyFailed} accent={colors.red} colors={colors} />
        <StatCard label="Persistent Dead" value={stats.persistentDead} accent={colors.gold} colors={colors} />
        <StatCard label="Recovered" value={stats.recovered} accent={colors.green} colors={colors} />
      </div>

      {/* Bucket tab nav */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 18, flexWrap: 'wrap' }}>
        {bucketTabs.map(b => (
          <button key={b.key} onClick={() => setBucketTab(b.key)} style={{
            background: bucketTab === b.key ? colors.panelLight : 'transparent',
            border: `1px solid ${bucketTab === b.key ? b.accent : colors.border}`,
            borderRadius: 8, padding: '8px 14px', color: bucketTab === b.key ? b.accent : colors.textDim,
            fontSize: 12, fontWeight: 600, letterSpacing: 0.5, cursor: 'pointer', fontFamily: 'inherit',
          }}>
            {b.label} <span style={{ marginLeft: 6, fontWeight: 400 }}>· {b.count}</span>
          </button>
        ))}
      </div>

      <div style={{ fontSize: 13, color: colors.textDim, marginBottom: 16, lineHeight: 1.5 }}>
        {bucketTabs.find(b => b.key === bucketTab)?.desc}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, gap: 8 }}>
        <select value={accountFilter} onChange={e => setAccountFilter(e.target.value)} style={selectStyle(colors)}>
          {accounts.map(a => <option key={a} value={a}>{a === 'all' ? 'All Accounts' : a}</option>)}
        </select>
        <button onClick={exportCSV} style={btnSecondary(colors)}>↓ Export CSV ({filtered.length})</button>
      </div>

      <div style={tableWrap(colors)}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: colors.panelLight }}>
              <Th>Display Group / Device</Th>
              <Th>Account</Th>
              <Th align="right">Months Offline</Th>
              <Th>Last Known Pulse</Th>
              <Th align="right">Triage</Th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan="5" style={{ padding: '32px 16px', textAlign: 'center', color: colors.textDim }}>No devices in this bucket{accountFilter !== 'all' ? ` for ${accountFilter}` : ''}</td></tr>
            ) : filtered.map((d, i) => (
              <tr key={`${d.display_group}-${d.display_name}-${i}`} style={{ borderTop: `1px solid ${colors.border}` }}>
                <Td weight={500}>
                  <div>{d.display_group || '—'}</div>
                  {d.display_name && d.display_name !== d.display_group && (
                    <div style={{ fontSize: 11, color: colors.textDim, marginTop: 2, fontWeight: 400 }}>{d.display_name}</div>
                  )}
                </Td>
                <Td color={colors.textDim}>{d.account || '—'}</Td>
                <Td align="right" color={monthsOffline(d.last_known_pulse) > 6 ? colors.red : monthsOffline(d.last_known_pulse) > 2 ? colors.gold : colors.text} weight={600}>
                  {monthsOffline(d.last_known_pulse)}
                </Td>
                <Td color={colors.textDim}>{fmtPulse(d.last_known_pulse)}</Td>
                <Td align="right">
                  <TriageDropdown
                    device={d}
                    onChange={s => updateTriage(d, s)}
                    colors={colors}
                  />
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

// ─── reusable bits ────────────────────────────────────────────
function Logo({ colors, size = 32 }) {
  return (
    <div style={{ width: size, height: size, borderRadius: size * 0.22, background: `linear-gradient(135deg, ${colors.greenDark}, ${colors.green})`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <svg width={size * 0.55} height={size * 0.55} viewBox="0 0 24 24" fill="none">
        <rect x="2" y="3" width="20" height="14" rx="2" stroke={colors.text} strokeWidth="2" fill="none" />
        <circle cx="12" cy="10" r="3" fill={colors.gold} />
      </svg>
    </div>
  );
}
function StatCard({ label, value, accent, colors }) {
  return (
    <div style={{ background: colors.panel, border: `1px solid ${colors.border}`, borderRadius: 12, padding: '20px 22px' }}>
      <div style={{ fontSize: 11, color: colors.textDim, letterSpacing: 1.5, textTransform: 'uppercase', fontWeight: 600, marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 36, fontWeight: 800, lineHeight: 1, color: accent || colors.text }}>{value}</div>
    </div>
  );
}
function Th({ children, align = 'left' }) {
  return <th style={{ padding: '11px 14px', textAlign: align, fontSize: 10, fontWeight: 600, letterSpacing: 1.5, textTransform: 'uppercase', color: 'rgba(240,235,227,0.5)' }}>{children}</th>;
}
function Td({ children, align = 'left', color, weight }) {
  return <td style={{ padding: '11px 14px', textAlign: align, color: color || '#F0EBE3', fontWeight: weight || 400, verticalAlign: 'top' }}>{children}</td>;
}
function TabButton({ active, onClick, colors, children }) {
  return (
    <button onClick={onClick} style={{
      background: 'transparent',
      border: 'none',
      borderBottom: `2px solid ${active ? colors.green : 'transparent'}`,
      color: active ? colors.text : colors.textDim,
      fontSize: 14,
      fontWeight: active ? 600 : 500,
      padding: '14px 18px',
      cursor: 'pointer',
      fontFamily: 'inherit',
      marginBottom: -1,
    }}>{children}</button>
  );
}
function EventBadge({ type, colors }) {
  const isOffline = type === 'offline';
  return (
    <span style={{
      display: 'inline-block', fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase',
      padding: '3px 8px', borderRadius: 4,
      background: isOffline ? 'rgba(224,82,82,0.15)' : 'rgba(74,140,92,0.15)',
      color: isOffline ? colors.red : colors.green,
      border: `1px solid ${isOffline ? 'rgba(224,82,82,0.3)' : 'rgba(74,140,92,0.3)'}`,
    }}>{type || '—'}</span>
  );
}
function TriageDropdown({ device, onChange, colors }) {
  const current = device.triage_status || 'pending';
  const colorMap = {
    pending: colors.textDim,
    delete: colors.red,
    repair: colors.gold,
    replaced: colors.blue,
    abandoned: colors.textFaint,
  };
  return (
    <select
      value={current}
      onChange={e => onChange(e.target.value)}
      style={{
        background: colors.panelLight, border: `1px solid ${colors.border}`, borderRadius: 6,
        padding: '5px 10px', color: colorMap[current] || colors.text,
        fontSize: 12, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer', outline: 'none',
      }}>
      <option value="pending">Pending</option>
      <option value="delete">Delete</option>
      <option value="repair">Repair</option>
      <option value="replaced">Replaced</option>
      <option value="abandoned">Abandoned</option>
    </select>
  );
}
const btnSecondary = c => ({ background: c.panelLight, border: `1px solid ${c.border}`, borderRadius: 8, padding: '8px 14px', color: c.text, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' });
const btnGhost = c => ({ background: 'transparent', border: `1px solid ${c.border}`, borderRadius: 8, padding: '8px 14px', color: c.textDim, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' });
const selectStyle = c => ({ background: c.panel, border: `1px solid ${c.border}`, borderRadius: 8, padding: '7px 12px', color: c.text, fontSize: 13, fontFamily: 'inherit', cursor: 'pointer', outline: 'none' });
const tableWrap = c => ({ background: c.panel, border: `1px solid ${c.border}`, borderRadius: 12, overflow: 'hidden' });
