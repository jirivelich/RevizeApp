import { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { aiApi, type AIChatAkce, type AIChatPriloha } from '../services/api';
import { souborNaPrilohu, PRILOHA_ACCEPT } from '../utils/prilohaChat';
import { Icon } from './icons';
import { useDiktovani, usePredcitani } from '../hooks/useHlas';
import { oznamZmenuDat } from '../hooks/useDataZmena';

const PREDCITAT_KEY = 'aiChat.predcitat';
const nactiPredcitani = () => { try { return localStorage.getItem(PREDCITAT_KEY) === '1'; } catch { return false; } };

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  /** Záznamy, které asistent při této odpovědi vytvořil (jen pro zobrazení). */
  akce?: AIChatAkce[];
  /** Soubory přiložené ke zprávě uživatele (posílají se i v dalších dotazech konverzace). */
  prilohy?: AIChatPriloha[];
}

/** Nejvýš tolik příloh v konverzaci (stejný limit jako na serveru). */
const MAX_PRILOH = 5;

const AKCE_IKONA: Record<AIChatAkce['typ'], string> = {
  revize: '📋',
  zavada: '⚠️',
  udalost: '📅',
  zakaznik: '👤',
  rozvadec: '🗄️',
  okruh: '⚡',
  mistnost: '🚪',
  zarizeni: '🔌',
  odberne_misto: '🔢',
};

export function AIChatAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [aiAvailable, setAiAvailable] = useState<boolean | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const souborRef = useRef<HTMLInputElement>(null);
  const [prilohy, setPrilohy] = useState<AIChatPriloha[]>([]);
  const [nacitamPrilohy, setNacitamPrilohy] = useState(false);
  const [chybaPrilohy, setChybaPrilohy] = useState<string | null>(null);
  const pocetPrilohVKonverzaci = messages.reduce((n, m) => n + (m.prilohy?.length ?? 0), 0);

  const pridejSoubory = async (files: FileList | null) => {
    if (!files?.length) return;
    setChybaPrilohy(null);
    const volno = MAX_PRILOH - pocetPrilohVKonverzaci - prilohy.length;
    if (volno <= 0) { setChybaPrilohy(`V jedné konverzaci lze přiložit nejvýš ${MAX_PRILOH} souborů. Začněte novou konverzaci.`); return; }
    setNacitamPrilohy(true);
    try {
      const nove: AIChatPriloha[] = [];
      for (const f of Array.from(files).slice(0, volno)) nove.push(await souborNaPrilohu(f));
      setPrilohy((prev) => [...prev, ...nove]);
      if (files.length > volno) setChybaPrilohy(`Přiloženo jen ${volno} z ${files.length} souborů (limit ${MAX_PRILOH} na konverzaci).`);
      inputRef.current?.focus();
    } catch (e) {
      setChybaPrilohy(e instanceof Error ? e.message : 'Soubor se nepodařilo přiložit.');
    } finally {
      setNacitamPrilohy(false);
      if (souborRef.current) souborRef.current.value = '';
    }
  };
  const qc = useQueryClient();
  const location = useLocation();
  // Otevřená revize (/revize/123…) – „tahle revize“ v chatu
  const revizeId = Number(location.pathname.match(/^\/revize\/(\d+)/)?.[1]) || undefined;

  // Hlas: diktování zprávy a předčítání odpovědí
  const [predcitat, setPredcitat] = useState(nactiPredcitani);
  const predcitani = usePredcitani();
  const sendRef = useRef<(text?: string) => void>(() => {});
  const diktovani = useDiktovani({
    onText: (t) => setInput(t),
    onKonec: (t) => sendRef.current(t), // po domluvení rovnou odeslat
  });

  // Hlasový režim: poslech → odpověď nahlas → znovu poslech (rozhovor bez rukou)
  const [hlasovyRezim, setHlasovyRezim] = useState(false);
  const hlasovyRezimRef = useRef(false);
  useEffect(() => { hlasovyRezimRef.current = hlasovyRezim; }, [hlasovyRezim]);
  const hlasovyRezimDostupny = diktovani.podporovano && predcitani.podporovano;

  const prepniHlasovyRezim = () => {
    if (hlasovyRezim) {
      setHlasovyRezim(false);
      diktovani.stop();
      predcitani.zastav();
      return;
    }
    setHlasovyRezim(true);
    predcitani.zastav();
    if (!diktovani.posloucha && !loading) diktovani.start('');
  };

  /** Odpověď v hlasovém režimu přečíst a pak znovu poslouchat. */
  const odpovezHlasem = (text: string) => {
    predcitani.precti(text, () => {
      if (hlasovyRezimRef.current) diktovani.start('');
    });
  };

  const prepniPredcitani = () => {
    const nove = !predcitat;
    setPredcitat(nove);
    if (!nove) predcitani.zastav();
    try { localStorage.setItem(PREDCITAT_KEY, nove ? '1' : '0'); } catch { /* bez úložiště */ }
  };

  const handleMic = () => {
    if (diktovani.posloucha) { diktovani.stop(); return; }
    predcitani.zastav(); // ať asistent nemluví do mikrofonu
    diktovani.start(input);
  };

  // Check AI availability on mount
  useEffect(() => {
    aiApi.getStatus()
      .then(({ configured }) => setAiAvailable(configured))
      .catch(() => setAiAvailable(false));
  }, []);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  const handleSend = async (override?: string) => {
    const k = prilohy;
    const text = (override ?? input).trim() || (k.length ? 'Přečti přiložený dokument a navrhni, co z něj zapsat do revize.' : '');
    if (!text || loading || nacitamPrilohy) return;

    const newMessages: ChatMessage[] = [...messages, { role: 'user', content: text, ...(k.length ? { prilohy: k } : {}) }];
    setMessages(newMessages);
    setPrilohy([]);
    setChybaPrilohy(null);
    setInput('');
    if (inputRef.current) inputRef.current.style.height = 'auto';
    setLoading(true);

    try {
      const { reply, akce } = await aiApi.chat(
        newMessages.map(({ role, content, prilohy: p }) => ({ role, content, ...(p?.length ? { prilohy: p } : {}) })),
        revizeId ? { id: revizeId } : undefined,
      );
      setMessages([...newMessages, { role: 'assistant', content: reply, akce }]);
      if (hlasovyRezimRef.current) odpovezHlasem(reply);
      else if (predcitat) predcitani.precti(reply);
      // Asistent něco vytvořil → obnovit data v aplikaci
      if (akce && akce.length > 0) { qc.invalidateQueries(); oznamZmenuDat(); }
    } catch (err: any) {
      const chyba = err.message || 'Nepodařilo se získat odpověď.';
      setMessages([
        ...newMessages,
        { role: 'assistant', content: `Chyba: ${chyba}` },
      ]);
      if (hlasovyRezimRef.current) odpovezHlasem(`Chyba. ${chyba}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { sendRef.current = handleSend; });

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Don't render if AI is not configured
  if (aiAvailable === false) return null;

  return (
    <>
      {/* Floating button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-20 lg:bottom-6 right-4 lg:right-6 z-50 w-12 h-12 rounded-full bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-[var(--primary-fg)] shadow-[var(--shadow-lg)] transition-colors flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring-color)]"
          title="AI Asistent"
          aria-label="Otevřít AI asistenta"
        >
          <Icon name="sparkle" size={24} />
        </button>
      )}

      {/* Chat panel */}
      {isOpen && (
        <div className="fixed bottom-20 lg:bottom-6 right-2 lg:right-6 z-50 w-[calc(100vw-16px)] max-w-md h-[min(600px,calc(100dvh-96px))] bg-[var(--surface)] rounded-[var(--radius-xl)] shadow-[var(--shadow-lg)] border border-[var(--border-input)] flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-[var(--primary)] text-[var(--primary-fg)]">
            <div className="flex items-center gap-2">
              <Icon name="sparkle" size={20} />
              <span className="font-medium text-sm">AI Asistent</span>
            </div>
            <div className="flex items-center gap-1">
            {hlasovyRezimDostupny && (
              <button
                onClick={prepniHlasovyRezim}
                className={`flex items-center gap-1 px-2 py-1 rounded-[var(--radius-md)] text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-fg)] ${
                  hlasovyRezim ? 'bg-[var(--primary-fg)] text-[var(--primary)]' : 'hover:bg-[var(--primary-hover)]'
                }`}
                aria-pressed={hlasovyRezim}
                aria-label={hlasovyRezim ? 'Vypnout hlasový režim' : 'Zapnout hlasový režim'}
                title="Hlasový režim: mluvte, asistent odpoví nahlas a znovu poslouchá"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M3 18v-6a9 9 0 0118 0v6" />
                  <path d="M21 19a2 2 0 01-2 2h-1a2 2 0 01-2-2v-3a2 2 0 012-2h3zM3 19a2 2 0 002 2h1a2 2 0 002-2v-3a2 2 0 00-2-2H3z" />
                </svg>
                Hlas
              </button>
            )}
            {predcitani.podporovano && !hlasovyRezim && (
              <button
                onClick={prepniPredcitani}
                className="p-1 hover:bg-[var(--primary-hover)] rounded-[var(--radius-md)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-fg)]"
                aria-label={predcitat ? 'Vypnout předčítání odpovědí' : 'Zapnout předčítání odpovědí'}
                aria-pressed={predcitat}
                title={predcitat ? 'Předčítání odpovědí zapnuto' : 'Předčítat odpovědi nahlas'}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M11 5L6 9H2v6h4l5 4V5z" />
                  {predcitat
                    ? <><path d="M15.54 8.46a5 5 0 010 7.07" /><path d="M19.07 4.93a10 10 0 010 14.14" /></>
                    : <><line x1="23" y1="9" x2="17" y2="15" /><line x1="17" y1="9" x2="23" y2="15" /></>}
                </svg>
              </button>
            )}
            <button
              onClick={() => { setIsOpen(false); setHlasovyRezim(false); diktovani.stop(); predcitani.zastav(); }}
              className="p-1 hover:bg-[var(--primary-hover)] rounded-[var(--radius-md)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-fg)]"
              aria-label="Zavřít"
            >
              <Icon name="close" size={16} />
            </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {messages.length === 0 && (
              <div className="text-center py-8">
                <div className="w-12 h-12 rounded-full bg-[var(--bg-accent)] text-[var(--primary-text)] flex items-center justify-center mx-auto mb-3">
                  <Icon name="sparkle" size={24} />
                </div>
                <p className="text-sm text-[var(--text-secondary)] font-medium mb-1">AI Asistent pro revize</p>
                <p className="text-xs text-[var(--text-secondary)]">Vidí vaše zákazníky, revize, závady a kalendář. Umí zakládat a upravovat revize, události, závady, zákazníky, rozvaděče, okruhy, místnosti i zařízení. Přes 📎 mu můžete poslat smlouvu nebo fakturu a údaje přenese do zprávy.</p>
                <div className="mt-4 space-y-2">
                  {[
                    'Kterým revizím končí platnost v příštích 2 měsících?',
                    'Co mám v kalendáři tento týden?',
                    'Naplánuj revizi u zákazníka Novák na příští úterý v 9:00',
                    'Do téhle revize přidej rozvaděč RB1 v chodbě s okruhy: světla B10, zásuvky B16, sporák 3f B16',
                  ].map((q) => (
                    <button
                      key={q}
                      onClick={() => { setInput(q); inputRef.current?.focus(); }}
                      className="block w-full text-left px-3 py-2 text-xs bg-[var(--bg-surface)] hover:bg-[var(--bg-input)] rounded-[var(--radius-md)] border border-[var(--border)] hover:border-[var(--border-strong)] text-[var(--text-secondary)] transition-colors"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] px-3 py-2 rounded-[var(--radius-md)] text-sm whitespace-pre-wrap ${
                    msg.role === 'user'
                      ? 'bg-[var(--primary)] text-[var(--primary-fg)]'
                      : 'bg-[var(--bg-input)] text-[var(--text)]'
                  }`}
                >
                  {msg.prilohy && msg.prilohy.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-1.5">
                      {msg.prilohy.map((p, j) => (
                        <span key={j} className="inline-flex items-center gap-1 max-w-full px-1.5 py-0.5 rounded bg-black/15 text-[11px]">
                          <span aria-hidden="true">{p.typ === 'application/pdf' ? '📄' : '🖼️'}</span>
                          <span className="truncate">{p.nazev}</span>
                        </span>
                      ))}
                    </div>
                  )}
                  {msg.content}
                  {msg.akce && msg.akce.length > 0 && (
                    <ul className="mt-2 pt-2 border-t border-[var(--border)] space-y-1">
                      {msg.akce.map((a) => (
                        <li key={`${a.typ}-${a.id}`}>
                          <Link
                            to={a.odkaz}
                            className="flex items-center gap-1.5 text-xs font-medium text-[var(--primary-text)] hover:underline"
                          >
                            <span aria-hidden="true">{AKCE_IKONA[a.typ]}</span>
                            <span>{a.popis}</span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-[var(--bg-input)] px-3 py-2 rounded-[var(--radius-md)]">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-[var(--text-secondary)] rounded-full animate-bounce [animation-delay:-0.3s]" />
                    <span className="w-2 h-2 bg-[var(--text-secondary)] rounded-full animate-bounce [animation-delay:-0.15s]" />
                    <span className="w-2 h-2 bg-[var(--text-secondary)] rounded-full animate-bounce" />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {hlasovyRezim && (
            <div className="px-4 py-2 text-xs flex items-center justify-between gap-2 bg-[var(--bg-accent)] text-[var(--primary-text)] border-t border-[var(--border)]" role="status" aria-live="polite">
              <span className="flex items-center gap-2">
                <span className={`inline-block w-2 h-2 rounded-full ${diktovani.posloucha ? 'bg-[var(--danger)] animate-pulse' : predcitani.mluvi ? 'bg-[var(--success)] animate-pulse' : 'bg-[var(--text-muted)]'}`} />
                {diktovani.posloucha ? 'Poslouchám…' : loading ? 'Přemýšlím…' : predcitani.mluvi ? 'Odpovídám…' : 'Hlasový režim – klepněte na mikrofon a mluvte'}
              </span>
              {predcitani.mluvi && (
                <button type="button" className="underline" onClick={() => { predcitani.zastav(); diktovani.start(''); }}>
                  Přeskočit
                </button>
              )}
            </div>
          )}

          {/* Input */}
          <div className="border-t border-[var(--border)] px-3 py-2">
            {(prilohy.length > 0 || nacitamPrilohy) && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {prilohy.map((p, i) => (
                  <span key={i} className="inline-flex items-center gap-1 max-w-[220px] pl-2 pr-1 py-0.5 rounded-full text-xs bg-[var(--bg-accent)] text-[var(--primary-text)] border border-[var(--primary)]/25">
                    <span aria-hidden="true">{p.typ === 'application/pdf' ? '📄' : '🖼️'}</span>
                    <span className="truncate">{p.nazev}</span>
                    <button
                      type="button"
                      onClick={() => setPrilohy((prev) => prev.filter((_, j) => j !== i))}
                      className="ml-0.5 w-4 h-4 rounded-full hover:bg-[var(--bg-hover)] leading-none"
                      aria-label={`Odebrat ${p.nazev}`}
                    >×</button>
                  </span>
                ))}
                {nacitamPrilohy && <span className="text-xs text-[var(--text-secondary)]">Načítám soubor…</span>}
              </div>
            )}
            <div className="flex gap-2">
              <input
                ref={souborRef}
                type="file"
                accept={PRILOHA_ACCEPT}
                multiple
                className="hidden"
                onChange={(e) => pridejSoubory(e.target.files)}
              />
              <button
                type="button"
                onClick={() => souborRef.current?.click()}
                disabled={loading || nacitamPrilohy}
                className="px-2.5 py-2 rounded-[var(--radius-md)] bg-[var(--bg-input)] hover:bg-[var(--bg-hover)] text-[var(--text)] border border-[var(--border-input)] disabled:opacity-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring-color)]"
                aria-label="Přiložit soubor (smlouva, faktura, fotka)"
                title="Přiložit soubor – např. smlouvu od ČEZ, fakturu nebo fotku štítku"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
                </svg>
              </button>
              <textarea
                ref={inputRef}
                rows={1}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  e.target.style.height = 'auto';
                  e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
                }}
                onKeyDown={handleKeyDown}
                placeholder={diktovani.posloucha ? 'Poslouchám…' : 'Napsat zprávu…'}
                disabled={loading}
                className="flex-1 resize-none px-3 py-2 text-sm border border-[var(--border-input)] rounded-[var(--radius-md)] focus:outline-none focus:border-[var(--primary-text)] focus:ring-2 focus:ring-[var(--focus-ring-color)] bg-[var(--bg-input)] text-[var(--text)] disabled:bg-[var(--bg-surface)]"
              />
              {diktovani.podporovano && (
                <button
                  onClick={handleMic}
                  disabled={loading}
                  className={`px-3 py-2 rounded-[var(--radius-md)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring-color)] disabled:opacity-50 ${
                    diktovani.posloucha
                      ? 'bg-[var(--danger)] text-white animate-pulse'
                      : 'bg-[var(--bg-input)] hover:bg-[var(--bg-hover)] text-[var(--text)] border border-[var(--border-input)]'
                  }`}
                  aria-label={diktovani.posloucha ? 'Ukončit diktování' : 'Diktovat zprávu'}
                  aria-pressed={diktovani.posloucha}
                  title={diktovani.posloucha ? 'Poslouchám… (klepnutím ukončíte)' : 'Diktovat zprávu'}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <rect x="9" y="2" width="6" height="12" rx="3" />
                    <path d="M5 10v1a7 7 0 0014 0v-1" />
                    <line x1="12" y1="18" x2="12" y2="22" />
                  </svg>
                </button>
              )}
              <button
                onClick={() => handleSend()}
                disabled={(!input.trim() && prilohy.length === 0) || loading || nacitamPrilohy}
                className="px-3 py-2 bg-[var(--primary)] hover:bg-[var(--primary-hover)] disabled:bg-[var(--bg-hover)] disabled:text-[var(--text-muted)] text-[var(--primary-fg)] rounded-[var(--radius-md)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring-color)]"
                aria-label="Odeslat"
              >
                <Icon name="send" size={16} />
              </button>
            </div>
            {diktovani.chyba && <p role="alert" className="text-[11px] text-[var(--danger-text)] mt-1">{diktovani.chyba}</p>}
            {chybaPrilohy && <p role="alert" className="text-[11px] text-[var(--danger-text)] mt-1">{chybaPrilohy}</p>}
            <p className="text-[10px] text-[var(--text-secondary)] mt-1 text-center">AI může dělat chyby. Ověřte důležité informace.</p>
          </div>
        </div>
      )}
    </>
  );
}
