import React, { useState } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

interface ZmenaHeslaModalProps {
  onClose: () => void;
}

export default function ZmenaHeslaModal({ onClose }: ZmenaHeslaModalProps) {
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (form.newPassword.length < 8) {
      setError('Nové heslo musí mít alespoň 8 znaků');
      return;
    }
    if (form.newPassword !== form.confirmPassword) {
      setError('Nová hesla se neshodují');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/auth/change-password`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          currentPassword: form.currentPassword,
          newPassword: form.newPassword,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || 'Chyba při změně hesla');
      } else {
        setSuccess(true);
        setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      }
    } catch {
      setError('Chyba připojení k serveru');
    } finally {
      setLoading(false);
    }
  };

  const baseInput: React.CSSProperties = {
    width: '100%',
    padding: '10px 13px',
    border: '1px solid var(--border-input)',
    borderRadius: 8,
    fontSize: 13,
    color: 'var(--text)',
    background: 'var(--bg-input)',
    outline: 'none',
    transition: 'all .15s',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
  };
  const focusedInput: React.CSSProperties = {
    ...baseInput,
    borderColor: 'rgba(43,136,255,0.5)',
    background: 'rgba(43,136,255,0.05)',
    boxShadow: '0 0 0 3px rgba(43,136,255,0.10)',
  };
  const inputStyle = (name: string) => focused === name ? focusedInput : baseInput;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(0,0,0,0.55)',
          backdropFilter: 'blur(3px)', WebkitBackdropFilter: 'blur(3px)',
        }}
      />

      {/* Modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Změna hesla"
        style={{
          position: 'fixed', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 1001,
          width: '100%', maxWidth: 400,
          background: 'var(--surface)',
          border: '1px solid var(--border-medium)',
          borderRadius: 16,
          padding: '28px 28px 24px',
          boxShadow: 'var(--shadow-elevated)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8, flexShrink: 0,
              background: 'rgba(43,136,255,0.12)', border: '1px solid rgba(43,136,255,0.22)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="15" height="15" fill="none" stroke="#2B88FF" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>Změna hesla</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>Zadejte aktuální a nové heslo</div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-muted)', padding: 4, borderRadius: 6,
              display: 'flex', alignItems: 'center',
            }}
            aria-label="Zavřít"
          >
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {success ? (
          <div style={{
            padding: '18px 16px', borderRadius: 10,
            background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
          }}>
            <svg width="28" height="28" fill="none" stroke="#4ade80" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#4ade80' }}>Heslo bylo úspěšně změněno</div>
            <button
              onClick={onClose}
              style={{
                marginTop: 6, padding: '8px 22px', borderRadius: 8,
                background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.30)',
                color: '#4ade80', fontSize: 13, fontWeight: 500, cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              Zavřít
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 5 }}>
                Aktuální heslo
              </label>
              <input
                type="password" name="currentPassword" value={form.currentPassword}
                onChange={handleChange} required placeholder="••••••••"
                autoComplete="current-password" style={inputStyle('currentPassword')}
                onFocus={() => setFocused('currentPassword')} onBlur={() => setFocused(null)}
              />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 5 }}>
                Nové heslo <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(min. 8 znaků)</span>
              </label>
              <input
                type="password" name="newPassword" value={form.newPassword}
                onChange={handleChange} required placeholder="••••••••"
                autoComplete="new-password" style={inputStyle('newPassword')}
                onFocus={() => setFocused('newPassword')} onBlur={() => setFocused(null)}
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 5 }}>
                Potvrzení nového hesla
              </label>
              <input
                type="password" name="confirmPassword" value={form.confirmPassword}
                onChange={handleChange} required placeholder="••••••••"
                autoComplete="new-password" style={inputStyle('confirmPassword')}
                onFocus={() => setFocused('confirmPassword')} onBlur={() => setFocused(null)}
              />
            </div>

            {error && (
              <div style={{
                marginBottom: 14, padding: '9px 13px',
                background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.25)',
                borderRadius: 8, fontSize: 13, color: '#fca5a5',
              }}>
                {error}
              </div>
            )}

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button" onClick={onClose}
                style={{
                  flex: 1, padding: '10px 0',
                  background: 'var(--bg-surface)', border: '1px solid var(--border-medium)',
                  borderRadius: 8, fontSize: 13, fontWeight: 500,
                  color: 'var(--text-secondary)', cursor: 'pointer', fontFamily: 'inherit',
                  transition: 'all .15s',
                }}
              >
                Zrušit
              </button>
              <button
                type="submit" disabled={loading}
                style={{
                  flex: 1, padding: '10px 0',
                  background: 'var(--primary)',
                  border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600,
                  color: 'white', cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.65 : 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  fontFamily: 'inherit', transition: 'all .15s',
                  boxShadow: '0 2px 10px rgba(43,136,255,0.30)',
                }}
              >
                {loading ? (
                  <svg width="13" height="13" fill="none" stroke="white" strokeWidth="2"
                    viewBox="0 0 24 24" style={{ animation: 'zmena-spin 1s linear infinite' }}>
                    <path strokeLinecap="round" d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                  </svg>
                ) : (
                  <svg width="13" height="13" fill="none" stroke="white" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
                {loading ? 'Ukládám...' : 'Změnit heslo'}
              </button>
            </div>
          </form>
        )}
        <style>{`@keyframes zmena-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    </>
  );
}
