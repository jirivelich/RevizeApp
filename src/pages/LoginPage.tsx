import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { buildApiUrl, setAuthState } from '../services/httpClient';
import { Button, Input } from '../components/ui';
import { Icon } from '../components/icons';
import type { IconName } from '../components/icons';
import { LogoIcon, Wordmark } from '../components/ReVeliLogo';

const JMENO_KEY = 'reveli_posledni_jmeno';
const nactiJmeno = (): string => { try { return localStorage.getItem(JMENO_KEY) || ''; } catch { return ''; } };
const ulozJmeno = (j: string) => { try { localStorage.setItem(JMENO_KEY, j.trim()); } catch { /* nedostupné úložiště */ } };

function OkoIkona({ preskrtnute }: { preskrtnute: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
      {preskrtnute && <path d="M4 4l16 16" />}
    </svg>
  );
}

export default function LoginPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState(() => ({ username: nactiJmeno(), password: '' }));
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [ukazatHeslo, setUkazatHeslo] = useState(false);

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
      ulozJmeno(formData.username);
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
          <LogoIcon size={40} />
          <div>
            <Wordmark className="text-2xl leading-none" />
            <div className="text-xs text-[var(--text-muted)] mt-1">Revize elektrických zařízení</div>
          </div>
        </div>

        <div>
          <h2 className="text-3xl font-bold text-[var(--text)] leading-tight mb-3.5">
            Digitální správa<br />
            <span className="text-[var(--primary-text)]">revizních zpráv</span>
          </h2>
          <p className="text-sm leading-relaxed text-[var(--text-secondary)] mb-9">
            Komplexní systém pro revizní techniky. Plánujte, dokumentujte a archivujte revize na jednom místě.
          </p>
          <ul className="flex flex-col gap-3.5">
            {features.map((f) => (
              <li key={f.text} className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-[var(--radius-lg)] shrink-0 grid place-items-center bg-[var(--bg-accent)] text-[var(--primary-text)]">
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

      {/* Pravý panel – na mobilu celá obrazovka bez karty */}
      <main className="relative flex-1 flex flex-col md:items-center md:justify-center px-6 sm:px-4 md:px-10 md:py-12
        pt-[max(env(safe-area-inset-top),2.5rem)] pb-[max(env(safe-area-inset-bottom),1.25rem)] overflow-hidden">
        {/* jemná vínová záře za logem (jen mobil) */}
        <div aria-hidden="true" className="md:hidden pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[520px] h-[420px] rounded-full opacity-[0.18] blur-3xl bg-[var(--primary)]" />

        {/* Mobilní logo */}
        <div className="md:hidden relative flex flex-col items-center text-center pt-6 pb-10 sm:pb-8">
          <LogoIcon size={72} className="drop-shadow-lg" />
          <Wordmark className="text-[34px] leading-none mt-4" />
          <div className="text-sm font-medium text-[var(--text-muted)] mt-2">Revize elektrických zařízení</div>
        </div>

        <div className="relative w-full sm:max-w-[420px] sm:mx-auto md:mx-0 sm:bg-[var(--surface)] sm:border sm:border-[var(--border)] sm:rounded-[var(--radius-xl)] sm:shadow-[var(--shadow-lg)] sm:px-9 sm:pt-10 sm:pb-9">
          <div className="mb-6">
            <h1 className="text-2xl sm:text-[21px] font-bold text-[var(--text)] mb-1">Přihlášení</h1>
            <p className="text-sm sm:text-[13px] text-[var(--text-secondary)]">Zadejte přihlašovací údaje</p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              type="text" name="username" label="Uživatelské jméno"
              value={formData.username} onChange={handleChange}
              required placeholder="jan.novak" autoComplete="username"
              autoCapitalize="none" autoCorrect="off" spellCheck={false} enterKeyHint="next"
              className="min-h-[50px] sm:min-h-[40px]"
            />
            <div className="relative">
              <Input
                type={ukazatHeslo ? 'text' : 'password'} name="password" label="Heslo"
                value={formData.password} onChange={handleChange}
                required placeholder="••••••••" autoComplete="current-password"
                autoCapitalize="none" autoCorrect="off" spellCheck={false} enterKeyHint="go"
                className="min-h-[50px] sm:min-h-[40px] pr-12"
              />
              <button
                type="button"
                onClick={() => setUkazatHeslo(v => !v)}
                aria-label={ukazatHeslo ? 'Skrýt heslo' : 'Zobrazit heslo'}
                aria-pressed={ukazatHeslo}
                className="absolute right-1 bottom-[3px] sm:bottom-0 w-11 h-11 sm:h-10 grid place-items-center rounded-[var(--radius-md)] text-[var(--text-muted)] hover:text-[var(--text)] cursor-pointer"
              >
                <OkoIkona preskrtnute={ukazatHeslo} />
              </button>
            </div>

            {error && (
              <div role="alert" className="px-3.5 py-2.5 rounded-[var(--radius-md)] border border-[var(--danger)]/30 border-l-[3px] border-l-[var(--danger)] bg-[var(--danger-bg)] text-[var(--danger-text)] text-[13px]">
                {error}
              </div>
            )}

            <Button type="submit" size="lg" disabled={loading} className="w-full gap-2 mt-2 min-h-[52px] sm:min-h-[44px] text-base sm:text-sm">
              {loading
                ? <span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" aria-hidden="true" />
                : <Icon name="login" size={16} />}
              {loading ? 'Přihlašuji…' : 'Přihlásit se'}
            </Button>
          </form>
        </div>

        {/* Patička (mobil) */}
        <div className="md:hidden relative mt-auto pt-10 flex items-center justify-center gap-2 text-xs text-[var(--text-muted)]">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--success)]" />
          © {new Date().getFullYear()} ReVeli
        </div>
      </main>
    </div>
  );
}
