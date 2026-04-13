import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function LoginPage() {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    email: '',
    jmeno: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // V produkci používáme relativní URL (frontend i backend na stejném serveru)
      const API_BASE = import.meta.env.VITE_API_URL || '/api';
      const endpoint = isLogin ? '/auth/login' : '/auth/register';
      const payload = isLogin 
        ? { username: formData.username, password: formData.password }
        : formData;

      const response = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Chyba při ověřování');
        setLoading(false);
        return;
      }

      // Uložit token
      console.log('LoginPage: Login successful, saving token');
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      // Přesměrovat na dashboard
      console.log('LoginPage: Navigating to dashboard');
      navigate('/');
    } catch (err) {
      setError('Chyba připojení k serveru');
      console.error('Login error:', err);
      setLoading(false);
    }
  };

  const switchMode = (login: boolean) => {
    setIsLogin(login);
    setError('');
    setFormData({ username: '', password: '', email: '', jmeno: '' });
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '11px 14px',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: 10, fontSize: 14, color: '#e2e8f0',
    background: 'rgba(255,255,255,0.04)', outline: 'none',
    transition: 'all .2s', boxSizing: 'border-box',
  };
  const inputFocusStyle: React.CSSProperties = {
    ...inputStyle,
    borderColor: 'rgba(59,130,246,0.5)',
    background: 'rgba(59,130,246,0.06)',
    boxShadow: '0 0 0 3px rgba(59,130,246,0.10)',
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--background)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      position: 'relative',
      overflow: 'hidden',
      fontFamily: "'Segoe UI', system-ui, sans-serif",
    }}>
      {/* Grid pattern */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none',
        backgroundImage: 'linear-gradient(rgba(59,130,246,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.04) 1px, transparent 1px)',
        backgroundSize: '40px 40px',
      }} />
      {/* Glow orb top-left */}
      <div style={{
        position: 'fixed', top: '15%', left: '10%',
        width: 500, height: 500, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(59,130,246,0.12) 0%, transparent 65%)',
        pointerEvents: 'none',
      }} />
      {/* Glow orb bottom-right */}
      <div style={{
        position: 'fixed', bottom: '5%', right: '5%',
        width: 450, height: 450, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(99,102,241,0.10) 0%, transparent 65%)',
        pointerEvents: 'none',
      }} />
      {/* Circuit SVG decoration */}
      <svg style={{ position: 'fixed', inset: 0, pointerEvents: 'none', opacity: 0.20, width: '100%', height: '100%' }}
        viewBox="0 0 1440 900" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">
        <g stroke="#3b82f6" strokeWidth="1" fill="none">
          <polyline points="80,80 80,200 200,200 200,120 360,120"/>
          <circle cx="80" cy="80" r="5" fill="#3b82f6"/>
          <circle cx="200" cy="200" r="4" fill="#3b82f6" opacity="0.6"/>
          <circle cx="360" cy="120" r="5" fill="#3b82f6"/>
          <rect x="355" y="115" width="10" height="10" fill="none" stroke="#3b82f6"/>
          <polyline points="1360,60 1360,180 1200,180 1200,300 1100,300"/>
          <circle cx="1360" cy="60" r="5" fill="#3b82f6"/>
          <circle cx="1200" cy="180" r="4" fill="#3b82f6" opacity="0.6"/>
          <circle cx="1100" cy="300" r="5" fill="#3b82f6"/>
          <polyline points="60,820 60,680 220,680 220,780 420,780"/>
          <circle cx="60" cy="820" r="5" fill="#3b82f6"/>
          <circle cx="220" cy="680" r="4" fill="#3b82f6" opacity="0.6"/>
          <circle cx="420" cy="780" r="5" fill="#3b82f6"/>
          <polyline points="1380,840 1380,720 1240,720 1240,620 1060,620"/>
          <circle cx="1380" cy="840" r="5" fill="#3b82f6"/>
          <circle cx="1060" cy="620" r="5" fill="#3b82f6"/>
          <polyline points="120,420 260,420 260,500"/>
          <circle cx="120" cy="420" r="3" fill="#3b82f6" opacity="0.5"/>
          <polyline points="1320,450 1180,450 1180,380"/>
          <circle cx="1320" cy="450" r="3" fill="#3b82f6" opacity="0.5"/>
          <rect x="195" y="116" width="10" height="8" fill="rgba(59,130,246,0.15)" stroke="#3b82f6"/>
          <rect x="1095" y="296" width="10" height="8" fill="rgba(59,130,246,0.15)" stroke="#3b82f6"/>
          <rect x="415" y="776" width="10" height="8" fill="rgba(59,130,246,0.15)" stroke="#3b82f6"/>
        </g>
      </svg>

      {/* Card wrapper */}
      <div style={{ position: 'relative', zIndex: 10, width: '100%', maxWidth: 420 }}>
        {/* Glow behind card */}
        <div style={{
          position: 'absolute', inset: -30, zIndex: -1,
          borderRadius: 32,
          background: 'radial-gradient(ellipse at center, rgba(59,130,246,0.18) 0%, transparent 70%)',
          filter: 'blur(24px)',
        }} />

        {/* Glassmorphism card */}
        <div style={{
          background: 'rgba(255,255,255,0.035)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 22,
          padding: '44px 40px 36px',
        }}>
          {/* Brand */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 32 }}>
            <div style={{
              width: 52, height: 52,
              background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
              borderRadius: 14,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 28px rgba(59,130,246,0.55), 0 0 60px rgba(59,130,246,0.15)',
              marginBottom: 14,
            }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/>
              </svg>
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#f1f5f9', letterSpacing: '-0.4px' }}>RevizeApp</div>
            <div style={{ fontSize: 12, color: '#475569', marginTop: 4 }}>Správa elektro revizí</div>
          </div>

          {/* Status bar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 28 }}>
            <div style={{ flex: 1, maxWidth: 60, height: 1, background: '#1e293b' }} />
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 6px #22c55e' }} />
            <span style={{ fontSize: 11, color: '#334155' }}>Systém online</span>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 6px #22c55e' }} />
            <div style={{ flex: 1, maxWidth: 60, height: 1, background: '#1e293b' }} />
          </div>

          {/* Tabs */}
          <div style={{
            display: 'flex', marginBottom: 28,
            background: 'rgba(255,255,255,0.035)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 10, padding: 4,
          }}>
            {(['login', 'register'] as const).map((mode) => {
              const active = (mode === 'login') === isLogin;
              return (
                <button
                  key={mode}
                  type="button"
                  onClick={() => switchMode(mode === 'login')}
                  style={{
                    flex: 1, padding: '9px 0', border: active ? '1px solid rgba(59,130,246,0.28)' : 'none',
                    borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: 'pointer',
                    background: active ? 'rgba(59,130,246,0.18)' : 'transparent',
                    color: active ? '#93c5fd' : '#475569',
                    transition: 'all .2s',
                    boxShadow: active ? 'inset 0 1px 0 rgba(255,255,255,0.05)' : 'none',
                  }}
                >
                  {mode === 'login' ? 'Přihlášení' : 'Registrace'}
                </button>
              );
            })}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit}>
            {!isLogin && (
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#64748b', marginBottom: 7 }}>Jméno</label>
                <input
                  type="text" name="jmeno" value={formData.jmeno} onChange={handleChange}
                  placeholder="Jan Novák"
                  style={inputStyle}
                  onFocus={e => Object.assign(e.target.style, inputFocusStyle)}
                  onBlur={e => Object.assign(e.target.style, inputStyle)}
                />
              </div>
            )}

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#64748b', marginBottom: 7 }}>Uživatelské jméno</label>
              <input
                type="text" name="username" value={formData.username} onChange={handleChange}
                required placeholder="jan.novak"
                style={inputStyle}
                onFocus={e => Object.assign(e.target.style, inputFocusStyle)}
                onBlur={e => Object.assign(e.target.style, inputStyle)}
              />
            </div>

            {!isLogin && (
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#64748b', marginBottom: 7 }}>Email</label>
                <input
                  type="email" name="email" value={formData.email} onChange={handleChange}
                  required placeholder="jan@firma.cz"
                  style={inputStyle}
                  onFocus={e => Object.assign(e.target.style, inputFocusStyle)}
                  onBlur={e => Object.assign(e.target.style, inputStyle)}
                />
              </div>
            )}

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#64748b', marginBottom: 7 }}>Heslo</label>
              <input
                type="password" name="password" value={formData.password} onChange={handleChange}
                required placeholder="••••••••"
                style={inputStyle}
                onFocus={e => Object.assign(e.target.style, inputFocusStyle)}
                onBlur={e => Object.assign(e.target.style, inputStyle)}
              />
            </div>

            {error && (
              <div style={{
                marginBottom: 16, padding: '10px 14px',
                background: 'rgba(239,68,68,0.10)',
                border: '1px solid rgba(239,68,68,0.25)',
                borderRadius: 8, fontSize: 13, color: '#fca5a5',
              }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', padding: 13, marginTop: 4,
                background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                color: 'white', border: 'none', borderRadius: 10,
                fontSize: 15, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.6 : 1,
                boxShadow: '0 4px 18px rgba(59,130,246,0.40)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                transition: 'all .2s',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"/>
              </svg>
              {loading ? 'Čekání...' : (isLogin ? 'Přihlásit se' : 'Registrovat se')}
            </button>
          </form>

          {/* Footer link */}
          <div style={{ textAlign: 'center', fontSize: 13, color: '#334155', marginTop: 22 }}>
            {isLogin ? 'Nemáte účet?' : 'Již máte účet?'}{' '}
            <button
              type="button"
              onClick={() => switchMode(!isLogin)}
              style={{ background: 'none', border: 'none', color: '#60a5fa', fontWeight: 500, cursor: 'pointer', fontSize: 13 }}
            >
              {isLogin ? 'Zaregistrujte se' : 'Přihlaste se'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
