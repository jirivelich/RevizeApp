import { useState, useRef, useEffect } from 'react';
import { aiApi } from '../services/api';
import { Icon } from './icons';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export function AIChatAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [aiAvailable, setAiAvailable] = useState<boolean | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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
    setLoading(true);

    try {
      const { reply } = await aiApi.chat(newMessages);
      setMessages([...newMessages, { role: 'assistant', content: reply }]);
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
        <div className="fixed bottom-20 lg:bottom-6 right-2 lg:right-6 z-50 w-[calc(100vw-16px)] max-w-96 h-[min(520px,calc(100dvh-96px))] bg-[var(--surface)] rounded-[var(--radius-xl)] shadow-[var(--shadow-lg)] border border-[var(--border-input)] flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-[var(--primary)] text-[var(--primary-fg)]">
            <div className="flex items-center gap-2">
              <Icon name="sparkle" size={20} />
              <span className="font-medium text-sm">AI Asistent — Revize</span>
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
                <div className="w-12 h-12 rounded-full bg-[var(--bg-accent)] text-[var(--primary)] flex items-center justify-center mx-auto mb-3">
                  <Icon name="sparkle" size={24} />
                </div>
                <p className="text-sm text-[var(--text-secondary)] font-medium mb-1">AI Asistent pro revize</p>
                <p className="text-xs text-[var(--text-secondary)]">Zeptejte se na normy ČSN, postupy měření, klasifikaci závad...</p>
                <div className="mt-4 space-y-2">
                  {[
                    'Jaké jsou lhůty revizí dle ČSN 33 1500?',
                    'Jak klasifikovat závadu C1 vs C2?',
                    'Jaký je min. izolační odpor pro 230V?',
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
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Napsat zprávu..."
                disabled={loading}
                className="flex-1 px-3 py-2 text-sm border border-[var(--border-input)] rounded-[var(--radius-md)] focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--focus-ring-color)] bg-[var(--bg-input)] text-[var(--text)] disabled:bg-[var(--bg-surface)]"
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
