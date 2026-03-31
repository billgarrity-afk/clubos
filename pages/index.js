import { useState, useRef, useEffect } from 'react';
import Head from 'next/head';

const QUICK_ACTIONS = [
  { label: 'Screen is black', emoji: '⚫', prompt: 'My screen is completely black and not showing anything.' },
  { label: 'Device offline', emoji: '📡', prompt: 'My Enplug device is showing as offline in the dashboard.' },
  { label: 'Content not updating', emoji: '🔄', prompt: 'The content on my display hasn\'t updated and it\'s showing old information.' },
  { label: 'Web Page blank', emoji: '🌐', prompt: 'The web page display is showing a blank white screen.' },
  { label: 'Court display issue', emoji: '🎾', prompt: 'The court reservation display isn\'t showing the right court availability.' },
  { label: 'Update content', emoji: '✏️', prompt: 'I need to update the content on my display — how do I do that?' },
];

export default function SupportAgent() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [started, setStarted] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const sendMessage = async (text) => {
    const userText = text || input.trim();
    if (!userText || loading) return;
    if (!started) setStarted(true);
    setInput('');
    const newMessages = [...messages, { role: 'user', content: userText }];
    setMessages(newMessages);
    setLoading(true);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages }),
      });
      const data = await res.json();
      const assistantText = data.content || 'Sorry, I had trouble responding. Please try again or contact support@spectrio.com.';
      setMessages([...newMessages, { role: 'assistant', content: assistantText }]);
    } catch {
      setMessages([...newMessages, {
        role: 'assistant',
        content: 'I\'m having trouble connecting. For urgent issues: support@spectrio.com or bill.garrity@clubhousectv.com.',
      }]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const renderMessage = (text) => {
    return text.split('\n').map((line, i) => {
      if (!line) return <div key={i} style={{ height: 8 }} />;
      return <div key={i} style={{ marginBottom: 2 }}>{line}</div>;
    });
  };

  return (
    <>
      <Head>
        <title>ClubOS Support — Clubhouse CTV</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </Head>
      <div style={{ display:'flex', flexDirection:'column', height:'100dvh', background:'#0C0F0A', fontFamily:"'Inter', system-ui, sans-serif", color:'#F0EBE3', overflow:'hidden' }}>
        <div style={{ background:'#111A13', borderBottom:'1px solid rgba(255,255,255,0.08)', padding:'0 20px', height:60, display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ width:36, height:36, borderRadius:8, background:'linear-gradient(135deg, #2D5A3D, #4A8C5C)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16 }}>📺</div>
            <div>
              <div style={{ fontSize:15, fontWeight:700, lineHeight:1 }}>ClubOS Support</div>
              <div style={{ fontSize:11, color:'rgba(240,235,227,0.5)', marginTop:2 }}>Powered by Clubhouse CTV</div>
            </div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:11, color:'#4A8C5C', background:'rgba(74,140,92,0.1)', border:'1px solid rgba(74,140,92,0.25)', borderRadius:20, padding:'4px 10px' }}>
            <div style={{ width:6, height:6, borderRadius:'50%', background:'#4A8C5C', animation:'pulse 2s infinite' }} />
            Online
          </div>
        </div>

        <div style={{ flex:1, overflow:'auto', padding:'20px 16px' }}>
          {!started ? (
            <div style={{ maxWidth:540, margin:'0 auto', paddingTop:16 }}>
              <div style={{ textAlign:'center', marginBottom:28 }}>
                <div style={{ width:60, height:60, borderRadius:14, margin:'0 auto 14px', background:'linear-gradient(135deg, #1A3A2A, #2D5A3D)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:26, border:'1px solid rgba(74,140,92,0.3)' }}>🛠️</div>
                <div style={{ fontSize:20, fontWeight:700, marginBottom:8 }}>How can I help?</div>
                <div style={{ fontSize:14, color:'rgba(240,235,227,0.55)', lineHeight:1.6 }}>I can troubleshoot Enplug devices, ClubOS displays,<br />connectivity issues, and content updates.</div>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:20 }}>
                {QUICK_ACTIONS.map((a) => (
                  <button key={a.label} onClick={() => sendMessage(a.prompt)} style={{ background:'#111A13', border:'1px solid rgba(255,255,255,0.1)', borderRadius:10, padding:'12px 14px', cursor:'pointer', color:'#F0EBE3', fontSize:13, textAlign:'left', display:'flex', alignItems:'center', gap:8 }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor='rgba(74,140,92,0.5)'; e.currentTarget.style.background='#142018'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor='rgba(255,255,255,0.1)'; e.currentTarget.style.background='#111A13'; }}>
                    <span style={{ fontSize:15 }}>{a.emoji}</span> {a.label}
                  </button>
                ))}
              </div>
              <div style={{ background:'#111A13', border:'1px solid rgba(201,168,67,0.2)', borderRadius:10, padding:'12px 14px', display:'flex', gap:10 }}>
                <span style={{ fontSize:15, flexShrink:0 }}>💡</span>
                <div style={{ fontSize:13, color:'rgba(240,235,227,0.6)', lineHeight:1.5 }}><span style={{ color:'#D4A843', fontWeight:600 }}>Tip:</span> Tell me which screen, which club, and any error message you see — the more detail, the faster I can help.</div>
              </div>
            </div>
          ) : (
            <div style={{ maxWidth:660, margin:'0 auto' }}>
              {messages.map((msg, i) => (
                <div key={i} style={{ display:'flex', justifyContent:msg.role==='user'?'flex-end':'flex-start', marginBottom:14, gap:10 }}>
                  {msg.role==='assistant' && <div style={{ width:30, height:30, borderRadius:8, flexShrink:0, marginTop:2, background:'linear-gradient(135deg, #1A3A2A, #2D5A3D)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, border:'1px solid rgba(74,140,92,0.3)' }}>🛠️</div>}
                  <div style={{ maxWidth:'78%', background:msg.role==='user'?'linear-gradient(135deg, #2D5A3D, #1A3A2A)':'#111A13', border:msg.role==='user'?'1px solid rgba(74,140,92,0.3)':'1px solid rgba(255,255,255,0.08)', borderRadius:msg.role==='user'?'14px 4px 14px 14px':'4px 14px 14px 14px', padding:'11px 15px', fontSize:14, lineHeight:1.6 }}>
                    {msg.role==='assistant' ? renderMessage(msg.content) : msg.content}
                  </div>
                </div>
              ))}
              {loading && (
                <div style={{ display:'flex', gap:10, marginBottom:14 }}>
                  <div style={{ width:30, height:30, borderRadius:8, flexShrink:0, background:'linear-gradient(135deg, #1A3A2A, #2D5A3D)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, border:'1px solid rgba(74,140,92,0.3)' }}>🛠️</div>
                  <div style={{ background:'#111A13', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'4px 14px 14px 14px', padding:'13px 16px', display:'flex', alignItems:'center', gap:5 }}>
                    {[0,1,2].map(n => <div key={n} style={{ width:6, height:6, borderRadius:'50%', background:'rgba(240,235,227,0.35)', animation:`bounce 1.2s ease-in-out ${n*0.2}s infinite` }} />)}
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        <div style={{ background:'#111A13', borderTop:'1px solid rgba(255,255,255,0.08)', padding:'12px 16px', flexShrink:0 }}>
          <div style={{ maxWidth:660, margin:'0 auto', display:'flex', gap:8, alignItems:'flex-end' }}>
            <textarea ref={inputRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKey} placeholder="Describe your issue…" rows={1}
              style={{ flex:1, background:'#0C0F0A', border:'1px solid rgba(255,255,255,0.12)', borderRadius:12, padding:'10px 14px', color:'#F0EBE3', fontSize:14, resize:'none', outline:'none', fontFamily:'inherit', lineHeight:1.5, minHeight:42, maxHeight:120 }}
              onFocus={e => e.target.style.borderColor='rgba(74,140,92,0.6)'}
              onBlur={e => e.target.style.borderColor='rgba(255,255,255,0.12)'} />
            <button onClick={() => sendMessage()} disabled={!input.trim()||loading}
              style={{ width:42, height:42, borderRadius:10, flexShrink:0, background:input.trim()&&!loading?'linear-gradient(135deg, #2D5A3D, #4A8C5C)':'#1A1A1A', border:'1px solid '+(input.trim()&&!loading?'rgba(74,140,92,0.4)':'rgba(255,255,255,0.08)'), cursor:input.trim()&&!loading?'pointer':'default', color:'#F0EBE3', fontSize:18, display:'flex', alignItems:'center', justifyContent:'center' }}>↑</button>
          </div>
          <div style={{ maxWidth:660, margin:'7px auto 0', fontSize:11, color:'rgba(240,235,227,0.22)', textAlign:'center' }}>Hardware emergencies: support@spectrio.com · 1-800-584-4653 opt 2</div>
        </div>

        <style>{`* { box-sizing:border-box; } body { margin:0; } @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.4;transform:scale(0.8)} } @keyframes bounce { 0%,80%,100%{transform:translateY(0);opacity:0.3} 40%{transform:translateY(-5px);opacity:1} } textarea{overflow:hidden} ::-webkit-scrollbar{width:4px} ::-webkit-scrollbar-track{background:transparent} ::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.1);border-radius:2px}`}</style>
      </div>
    </>
  );
}
