import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { buildApiUrl, setAuthState } from '../services/httpClient';
import { Button, Input } from '../components/ui';
import { Icon } from '../components/icons';
import type { IconName } from '../components/icons';

export default function LoginPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ username: '', password: '' });
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
      const response = await fetch(buildApiUrl('/auth/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: formData.username, password: formData.password }),
      });
      const data = await response.json();
      if (!response.ok) { setError(data.error || 'Chyba při ověřování'); setLoading(false); return; }
      setAuthState(data.token, data.user);
      navigate('/');
    } catch {
      setError('Chyba připojení k serveru');
      setLoading(false);
    }
  };

  const features: { icon: IconName; text: string }[] = [
    { icon: 'checkCircle', text: 'Správa revizních zpráv a protokolů' },
    { icon: 'calendar', text: 'Plánování termínů revizí' },
    { icon: 'bell', text: 'Automatická upozornění na lhůty' },
    { icon: 'report', text: 'Export zpráv do PDF / DOCX' },
  ];

  return (
    <div className="min-h-dvh flex bg-[var(--background)]">
      {/* Levý panel */}
      <aside className="hidden md:flex w-[42%] min-w-[340px] flex-col justify-between px-11 py-12 bg-[var(--bg-sidebar)] border-r border-[var(--border)]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-[var(--radius-lg)] bg-[var(--primary)] text-[var(--primary-fg)] grid place-items-center font-extrabold">JV</div>
          <div>
            <div className="text-xl font-extrabold text-[var(--text)] tracking-tight">JV Revize</div>
            <div className="text-xs text-[var(--text-muted)]">Správa elektro revizí</div>
          </div>
        </div>

        <div>
          <h2 className="text-3xl font-bold text-[var(--text)] leading-tight mb-3.5">
            Digitální správa<br />
            <span className="text-[var(--primary)]">revizních zpráv</span>
          </h2>
          <p className="text-sm leading-relaxed text-[var(--text-secondary)] mb-9">
            Komplexní systém pro revizní techniky. Plánujte, dokumentujte a archivujte revize na jednom místě.
          </p>
          <ul className="flex flex-col gap-3.5">
            {features.map((f) => (
              <li key={f.text} className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-[var(--radius-lg)] shrink-0 grid place-items-center bg-[var(--bg-accent)] text-[var(--primary)]">
                  <Icon name={f.icon} size={16} />
                </span>
                <span className="text-[13px] text-[var(--text-secondary)]">{f.text}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--success)]" />
          Systém online · v2.0
        </div>
      </aside>

      {/* Pravý panel */}
      <main className="flex-1 flex items-start md:items-center justify-center px-4 py-6 md:px-10 md:py-12">
        <div className="w-full max-w-[420px] bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-xl)] shadow-[var(--shadow-lg)] px-5 py-7 sm:px-9 sm:pt-10 sm:pb-9">
          {/* Mobilní logo */}
          <div className="md:hidden flex items-center gap-2.5 mb-7">
            <div className="w-9 h-9 rounded-[var(--radius-lg)] bg-[var(--primary)] text-[var(--primary-fg)] grid place-items-center text-sm font-extrabold">JV</div>
            <div>
              <div className="text-[17px] font-bold text-[var(--text)]">JV Revize</div>
              <div className="text-[11px] font-semibold text-[var(--text-muted)]">Správa elektro revizí</div>
            </div>
          </div>

          <div className="mb-6">
            <h1 className="text-[21px] font-bold text-[var(--text)] mb-1">Přihlášení</h1>
            <p className="text-[13px] text-[var(--text-secondary)]">Zadejte přihlašovací údaje</p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              type="text" name="username" label="Uživatelské jméno"
              value={formData.username} onChange={handleChange}
              required placeholder="jan.novak" autoComplete="username"
            />
            <Input
              type="password" name="password" label="Heslo"
              value={formData.password} onChange={handleChange}
              required placeholder="••••••••" autoComplete="current-password"
            />

            {error && (
              <div role="alert" className="px-3.5 py-2.5 rounded-[var(--radius-md)] border border-[var(--danger)]/30 border-l-[3px] border-l-[var(--danger)] bg-[var(--danger-bg)] text-[var(--danger-text)] text-[13px]">
                {error}
              </div>
            )}

            <Button type="submit" size="lg" disabled={loading} className="w-full gap-2 mt-1">
              <Icon name="login" size={16} />
              {loading ? 'Čekání...' : 'Přihlásit se'}
            </Button>
          </form>
        </div>
      </main>
    </div>
  );
}
