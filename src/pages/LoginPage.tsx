import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const RED = '#F00807';
const RED_DARK = '#CC0706';

export default function LoginPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const API_BASE = import.meta.env.VITE_API_URL || '/api';
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: formData.username, password: formData.password }),
      });
      const data = await response.json();
      if (!response.ok) { setError(data.error || 'Chyba při ověřování'); setLoading(false); return; }
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      navigate('/');
    } catch {
      setError('Chyba připojení k serveru');
      setLoading(false);
    }
  };

  const baseInput: React.CSSProperties = {
    width: '100%', padding: '11px 14px',
    border: '1px solid rgba(226,225,233,0.10)',
    borderRadius: 10, fontSize: 14, color: '#e2e8f0',
    background: 'rgba(226,225,233,0.05)', outline: 'none',
    transition: 'all .18s', boxSizing: 'border-box', fontFamily: 'inherit',
  };
  const getInputStyle = (name: string): React.CSSProperties =>
    focusedField === name
      ? { ...baseInput, borderColor: 'rgba(240,8,7,0.5)', background: 'rgba(240,8,7,0.06)', boxShadow: '0 0 0 3px rgba(240,8,7,0.12)' }
      : baseInput;

  const features = [
    { icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z', text: 'Správa revizních zpráv a protokolů' },
    { icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z', text: 'Plánování termínů revizí' },
    { icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9', text: 'Automatická upozornění na lhůty' },
    { icon: 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', text: 'Export zpráv do PDF / DOCX' },
  ];

  const formCard = (
    <div style={{
      background: 'rgba(30,30,46,0.85)',
      backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
      border: '1px solid rgba(226,225,233,0.08)',
      borderRadius: 20, padding: '40px 36px 36px',
      boxShadow: '0 8px 40px rgba(0,0,0,0.45)',
      width: '100%',
    }}>
      {/* Mobilní logo — skryté na desktopu via CSS */}
      <div className="login-mobile-brand" style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 }}>
        <div style={{
          width: 36, height: 36,
          background: `linear-gradient(135deg, ${RED} 0%, ${RED_DARK} 100%)`,
          borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 0 18px rgba(240,8,7,0.45)',
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <div>
          <div style={{ fontSize: 17, fontWeight: 700, color: '#f1f5f9' }}>JV Revize</div>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#f1f5f9' }}>Správa elektro revizí</div>
        </div>
      </div>

      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 21, fontWeight: 700, color: '#f1f5f9', marginBottom: 4 }}>
          Přihlášení
        </h1>
        <p style={{ fontSize: 13, color: '#475569' }}>
          Zadejte přihlašovací údaje
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#64748b', marginBottom: 6 }}>Uživatelské jméno</label>
          <input type="text" name="username" value={formData.username} onChange={handleChange}
            required placeholder="jan.novak" autoComplete="username" style={getInputStyle('username')}
            onFocus={() => setFocusedField('username')} onBlur={() => setFocusedField(null)} />
        </div>
        <div style={{ marginBottom: 22 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#64748b', marginBottom: 6 }}>Heslo</label>
          <input type="password" name="password" value={formData.password} onChange={handleChange}
            required placeholder="••••••••" autoComplete="current-password" style={getInputStyle('password')}
            onFocus={() => setFocusedField('password')} onBlur={() => setFocusedField(null)} />
        </div>

        {error && (
          <div style={{
            marginBottom: 16, padding: '10px 14px',
            background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.25)',
            borderRadius: 8, fontSize: 13, color: '#fca5a5',
          }}>{error}</div>
        )}

        <button type="submit" disabled={loading} style={{
          width: '100%', padding: 13,
          background: `linear-gradient(135deg, ${RED} 0%, ${RED_DARK} 100%)`,
          color: 'white', border: 'none', borderRadius: 10,
          fontSize: 14, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
          opacity: loading ? 0.65 : 1,
          boxShadow: '0 4px 20px rgba(240,8,7,0.38)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          transition: 'all .18s', fontFamily: 'inherit',
        }}>
          {loading ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"
              style={{ animation: 'login-spin 1s linear infinite' }}>
              <path strokeLinecap="round" d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
            </svg>
          )}
          {loading ? 'Čekání...' : 'Přihlásit se'}
        </button>
      </form>


    </div>
  );

  return (
    <>
      <style>{`
        @keyframes login-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .login-left { display: flex; }
        .login-mobile-brand { display: none !important; }
        @media (max-width: 767px) {
          .login-left { display: none !important; }
          .login-mobile-brand { display: flex !important; }
          .login-right { padding: 24px 16px !important; align-items: flex-start !important; }
          .login-card-wrap { max-width: 100% !important; padding-top: 16px; }
        }
        @media (max-width: 400px) {
          .login-card-wrap > div { padding: 28px 20px 24px !important; }
        }
      `}</style>

      <div style={{ minHeight: '100vh', display: 'flex', fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif" }}>

        {/* LEVÝ PANEL */}
        <div className="login-left" style={{
          width: '42%', minWidth: 340,
          background: '#0F0F1A',
          flexDirection: 'column', justifyContent: 'space-between',
          padding: '48px 44px',
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            backgroundImage: 'linear-gradient(rgba(240,8,7,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(240,8,7,0.035) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }} />
          <div style={{
            position: 'absolute', top: '5%', right: '-10%',
            width: 380, height: 380, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(240,8,7,0.14) 0%, transparent 65%)',
            pointerEvents: 'none',
          }} />
          <div style={{
            position: 'absolute', bottom: '-5%', left: '-8%',
            width: 300, height: 300, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(240,8,7,0.10) 0%, transparent 65%)',
            pointerEvents: 'none',
          }} />
          <svg style={{ position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.22, width: '100%', height: '100%' }}
            viewBox="0 0 600 900" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">
            <g stroke={RED} strokeWidth="1" fill="none">
              <polyline points="40,40 40,140 140,140 140,80 280,80" />
              <circle cx="40" cy="40" r="4" fill={RED} />
              <circle cx="140" cy="140" r="3" fill={RED} opacity="0.5" />
              <circle cx="280" cy="80" r="4" fill={RED} />
              <rect x="276" y="76" width="8" height="8" fill="none" stroke={RED} />
              <polyline points="560,860 560,740 420,740 420,820 220,820" />
              <circle cx="560" cy="860" r="4" fill={RED} />
              <circle cx="420" cy="740" r="3" fill={RED} opacity="0.5" />
              <circle cx="220" cy="820" r="4" fill={RED} />
              <rect x="216" y="816" width="8" height="8" fill="rgba(240,8,7,0.15)" stroke={RED} />
              <polyline points="30,440 120,440 120,520" />
              <circle cx="30" cy="440" r="3" fill={RED} opacity="0.4" />
            </g>
          </svg>

          {/* Brand */}
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 42, height: 42,
                background: `linear-gradient(135deg, ${RED} 0%, ${RED_DARK} 100%)`,
                borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 0 24px rgba(240,8,7,0.50)',
              }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#f1f5f9', letterSpacing: '-0.4px' }}>JV Revize</div>
                <div style={{ fontSize: 11, color: '#475569', marginTop: 1 }}>Správa elektro revizí</div>
              </div>
            </div>
          </div>

          {/* Hero */}
          <div style={{ position: 'relative', zIndex: 1 }}>
            <h2 style={{ fontSize: 30, fontWeight: 700, color: '#f1f5f9', lineHeight: 1.25, marginBottom: 14 }}>
              Digitální správa<br />
              <span style={{ color: RED }}>revizních zpráv</span>
            </h2>
            <p style={{ color: '#64748b', fontSize: 14, lineHeight: 1.7, marginBottom: 36 }}>
              Komplexní systém pro revizní techniky. Plánujte, dokumentujte a archivujte revize na jednom místě.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {features.map((f, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                    background: 'rgba(240,8,7,0.10)', border: '1px solid rgba(240,8,7,0.20)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={RED} strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d={f.icon} />
                    </svg>
                  </div>
                  <span style={{ color: '#94a3b8', fontSize: 13 }}>{f.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 6px #22c55e' }} />
              <span style={{ fontSize: 12, color: '#334155' }}>Systém online · v2.0</span>
            </div>
          </div>
        </div>

        {/* PRAVÝ PANEL */}
        <div className="login-right" style={{
          flex: 1, background: '#141420',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '48px 40px', position: 'relative',
        }}>
          <div style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            background: 'radial-gradient(ellipse at 60% 40%, rgba(240,8,7,0.07) 0%, transparent 60%)',
          }} />
          <div className="login-card-wrap" style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 420 }}>
            {formCard}
          </div>
        </div>

      </div>
    </>
  );
}