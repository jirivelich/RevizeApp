import { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { aiApi, type AIChatAkce } from '../services/api';
import { Icon } from './icons';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  /** Záznamy, které asistent při této odpovědi vytvořil (jen pro zobrazení). */
  akce?: AIChatAkce[];
}

const AKCE_IKONA: Record<AIChatAkce['typ'], string> = {
  revize: '📋',
  zavada: '⚠️',
  udalost: '📅',
  zakaznik: '👤',
};

export function AIChatAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [aiAvailable, setAiAvailable] = useState<boolean | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const qc = useQueryClient();
  const location = useLocation();
  // Otevřená revize (/revize/123…) – „tahle revize“ v chatu
  const revizeId = Number(location.pathname.match(/^\/revize\/(\d+)/)?.[1]) || undefined;

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

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const newMessages: ChatMessage[] = [...messages, { role: 'user', content: text }];
    setMessages(newMessages);
    setInput('');
    if (inputRef.current) inputRef.current.style.height = 'auto';
    setLoading(true);

    try {
      const { reply, akce } = await aiApi.chat(
        newMessages.map(({ role, content }) => ({ role, content })),
        revizeId ? { id: revizeId } : undefined,
      );
      setMessages([...newMessages, { role: 'assistant', content: reply, akce }]);
      // Asistent něco vytvořil → obnovit data v aplikaci
      if (akce && akce.length > 0) qc.invalidateQueries();
    } catch (err: any) {
      setMessages([
        ...newMessages,
        { role: 'assistant', content: `Chyba: ${err.message || 'Nepodařilo se získat odpověď.'}` },
      ]);
    } finally {
      setLoading(false);
    }
  };

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
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 hover:bg-[var(--primary-hover)] rounded-[var(--radius-md)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-fg)]"
              aria-label="Zavřít"
            >
              <Icon name="close" size={16} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {messages.length === 0 && (
              <div className="text-center py-8">
                <div className="w-12 h-12 rounded-full bg-[var(--bg-accent)] text-[var(--primary-text)] flex items-center justify-center mx-auto mb-3">
                  <Icon name="sparkle" size={24} />
                </div>
                <p className="text-sm text-[var(--text-secondary)] font-medium mb-1">AI Asistent pro revize</p>
                <p className="text-xs text-[var(--text-secondary)]">Vidí vaše zákazníky, revize, závady a kalendář. Umí založit revizi, událost, závadu nebo zákazníka – vždy se nejdřív zeptá.</p>
                <div className="mt-4 space-y-2">
                  {[
                    'Kterým revizím končí platnost v příštích 2 měsících?',
                    'Co mám v kalendáři tento týden?',
                    'Naplánuj revizi u zákazníka Novák na příští úterý v 9:00',
                    'Jaký je min. izolační odpor pro 230 V?',
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

          {/* Input */}
          <div className="border-t border-[var(--border)] px-3 py-2">
            <div className="flex gap-2">
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
                placeholder="Napsat zprávu… (Shift+Enter = nový řádek)"
                disabled={loading}
                className="flex-1 resize-none px-3 py-2 text-sm border border-[var(--border-input)] rounded-[var(--radius-md)] focus:outline-none focus:border-[var(--primary-text)] focus:ring-2 focus:ring-[var(--focus-ring-color)] bg-[var(--bg-input)] text-[var(--text)] disabled:bg-[var(--bg-surface)]"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || loading}
                className="px-3 py-2 bg-[var(--primary)] hover:bg-[var(--primary-hover)] disabled:bg-[var(--bg-hover)] disabled:text-[var(--text-muted)] text-[var(--primary-fg)] rounded-[var(--radius-md)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring-color)]"
                aria-label="Odeslat"
              >
                <Icon name="send" size={16} />
              </button>
            </div>
            <p className="text-[10px] text-[var(--text-secondary)] mt-1 text-center">AI může dělat chyby. Ověřte důležité informace.</p>
          </div>
        </div>
      )}
    </>
  );
}
