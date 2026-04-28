import { useState, useEffect } from 'react';
import Head from 'next/head';

export default function Admin() {
  const [password, setPassword] = useState('');
  const [authed, setAuthed] = useState(false);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [accountFilter, setAccountFilter] = useState('all');
  const [lastUpdated, setLastUpdated] = useState(null);

  // Auto-login from sessionStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = sessionStorage.getItem('clubos_admin_pw');
    if (saved) {
      setPassword(saved);
      attemptLogin(saved);
    }
  }, []);

  const attemptLogin = async (pw) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pw }),
      });
      if (res.status === 401) {
        setError('Incorrect password');
        setAuthed(false);
        sessionStorage.removeItem('clubos_admin_pw');
        setLoading(false);
        return;
      }
      if (!res.ok) {
        setError('Server error — check Vercel logs');
        setLoading(false);
        return;
      }
      const json = await res.json();
      setData(json);
      setAuthed(true);
      setLastUpdated(new Date());
      sessionStorage.setItem('clubos_admin_pw', pw);
    } catch (e) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  const refresh = () => attemptLogin(password);

  const logout = () => {
    sessionStorage.removeItem('clubos_admin_pw');
    setAuthed(false);
    setData(null);
    setPassword('');
  };

  // ── derived data ─────────────────────────────────────────────
  const currentStatus = data?.currentStatus || [];
  const recentEvents = data?.recentEvents || [];
  const stats = data?.stats || { total: 0, offline: 0, oldestOffline: 0 };

  const accounts = ['all', ...new Set(currentStatus.map(d => d.account).filter(Boolean))];
  const filteredOffline = currentStatus
    .filter(d => d.current_status === 'offline')
    .filter(d => accountFilter === 'all' || d.account === accountFilter);
  const filteredEvents = recentEvents
    .filter(e => accountFilter === 'all' || e.account === accountFilter);

  const daysOffline = (ts) => {
    if (!ts) return '—';
    const days = Math.floor((Date.now() - new Date(ts).getTime()) / 86400000);
    return days;
  };

  const fmtDate = (ts) => {
    if (!ts) return '—';
    return new Date(ts).toLocaleString('en-US', {
      month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
    });
  };

  // ── styles ───────────────────────────────────────────────────
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
  };

  // ── login screen ─────────────────────────────────────────────
  if (!authed) {
    return (
      <>
        <Head>
          <title>ClubOS Fleet Monitor</title>
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
        </Head>
        <div style={{ minHeight: '100dvh', background: colors.bg, fontFamily: "'Inter', system-ui, sans-serif", color: colors.text, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ width: '100%', maxWidth: 380, background: colors.panel, border: `1px solid ${colors.border}`, borderRadius: 14, padding: 32 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
              <div style={{ width: 38, height: 38, borderRadius: 9, background: `linear-gradient(135deg, ${colors.greenDark}, ${colors.green})`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <rect x="2" y="3" width="20" height="14" rx="2" stroke={colors.text} strokeWidth="2" fill="none" />
                  <circle cx="12" cy="10" r="3" fill={colors.gold} />
                </svg>
              </div>
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

  // ── main dashboard ───────────────────────────────────────────
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
            <div style={{ width: 34, height: 34, borderRadius: 8, background: `linear-gradient(135deg, ${colors.greenDark}, ${colors.green})`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <rect x="2" y="3" width="20" height="14" rx="2" stroke={colors.text} strokeWidth="2" fill="none" />
                <circle cx="12" cy="10" r="3" fill={colors.gold} />
              </svg>
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, lineHeight: 1 }}>ClubOS Fleet Monitor</div>
              <div style={{ fontSize: 11, color: colors.textDim, marginTop: 3, letterSpacing: 0.5 }}>
                {lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}` : ''}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={refresh} disabled={loading} style={{ background: colors.panelLight, border: `1px solid ${colors.border}`, borderRadius: 8, padding: '8px 14px', color: colors.text, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
              {loading ? 'Refreshing…' : '↻ Refresh'}
            </button>
            <button onClick={logout} style={{ background: 'transparent', border: `1px solid ${colors.border}`, borderRadius: 8, padding: '8px 14px', color: colors.textDim, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
              Logout
            </button>
          </div>
        </div>

        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '24px' }}>

          {/* Stats cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 28 }}>
            <StatCard label="Total Devices Tracked" value={stats.total} colors={colors} />
            <StatCard label="Currently Offline" value={stats.offline} accent={stats.offline > 0 ? colors.red : colors.green} colors={colors} />
            <StatCard label="Longest Offline" value={stats.oldestOffline > 0 ? `${stats.oldestOffline} days` : '—'} accent={stats.oldestOffline > 7 ? colors.red : colors.gold} colors={colors} />
          </div>

          {/* Account filter */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ fontSize: 16, fontWeight: 600 }}>Currently Offline</div>
            <select
              value={accountFilter}
              onChange={e => setAccountFilter(e.target.value)}
              style={{ background: colors.panel, border: `1px solid ${colors.border}`, borderRadius: 8, padding: '7px 12px', color: colors.text, fontSize: 13, fontFamily: 'inherit', cursor: 'pointer', outline: 'none' }}
            >
              {accounts.map(a => (
                <option key={a} value={a}>{a === 'all' ? 'All Accounts' : a}</option>
              ))}
            </select>
          </div>

          {/* Currently Offline Table */}
          <div style={{ background: colors.panel, border: `1px solid ${colors.border}`, borderRadius: 12, overflow: 'hidden', marginBottom: 32 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: colors.panelLight }}>
                  <Th>Device</Th>
                  <Th>Account</Th>
                  <Th>Network</Th>
                  <Th align="right">Days Offline</Th>
                  <Th>Last Seen</Th>
                  <Th align="right"></Th>
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
                          <a href={enplugLink} target="_blank" rel="noopener" style={{ color: colors.gold, fontSize: 12, textDecoration: 'none' }}>
                            Enplug ↗
                          </a>
                        )}
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Recent Events Feed */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ fontSize: 16, fontWeight: 600 }}>Recent Events <span style={{ color: colors.textDim, fontWeight: 400, fontSize: 13 }}>· last 50</span></div>
          </div>
          <div style={{ background: colors.panel, border: `1px solid ${colors.border}`, borderRadius: 12, overflow: 'hidden', marginBottom: 24 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: colors.panelLight }}>
                  <Th>Time</Th>
                  <Th>Device</Th>
                  <Th>Account</Th>
                  <Th>Network</Th>
                  <Th>Event</Th>
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
                    <Td>
                      <span style={{ display: 'inline-block', fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', padding: '3px 8px', borderRadius: 4, background: e.event_type === 'offline' ? 'rgba(224,82,82,0.15)' : 'rgba(74,140,92,0.15)', color: e.event_type === 'offline' ? colors.red : colors.green, border: `1px solid ${e.event_type === 'offline' ? 'rgba(224,82,82,0.3)' : 'rgba(74,140,92,0.3)'}` }}>
                        {e.event_type || '—'}
                      </span>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ fontSize: 11, color: colors.textFaint, textAlign: 'center', padding: '20px 0' }}>
            ClubOS · clubhousectv.com · Internal infrastructure tool
          </div>
        </div>

        <style>{`* { box-sizing: border-box; } body { margin: 0; } select { appearance: none; background-image: url("data:image/svg+xml;charset=US-ASCII,%3Csvg width='12' height='8' viewBox='0 0 12 8' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l5 5 5-5' stroke='rgba(240,235,227,0.5)' stroke-width='1.5' fill='none'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 12px center; padding-right: 32px; } button:disabled { cursor: default; opacity: 0.6; } a:hover { text-decoration: underline; }`}</style>
      </div>
    </>
  );
}

// ── Helper components ─────────────────────────────────────────
function StatCard({ label, value, accent, colors }) {
  return (
    <div style={{ background: colors.panel, border: `1px solid ${colors.border}`, borderRadius: 12, padding: '20px 22px' }}>
      <div style={{ fontSize: 11, color: colors.textDim, letterSpacing: 1.5, textTransform: 'uppercase', fontWeight: 600, marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 36, fontWeight: 800, lineHeight: 1, color: accent || colors.text, fontFamily: "'Inter', system-ui" }}>{value}</div>
    </div>
  );
}

function Th({ children, align = 'left' }) {
  return <th style={{ padding: '11px 14px', textAlign: align, fontSize: 10, fontWeight: 600, letterSpacing: 1.5, textTransform: 'uppercase', color: 'rgba(240,235,227,0.5)' }}>{children}</th>;
}

function Td({ children, align = 'left', color, weight }) {
  return <td style={{ padding: '11px 14px', textAlign: align, color: color || '#F0EBE3', fontWeight: weight || 400, verticalAlign: 'middle' }}>{children}</td>;
}
