import { useEffect, useRef, useCallback, useState } from 'react';

const IDLE_MS = 58 * 60 * 1000;              // 58 minut neaktivity → varování
const WARNING_MS = 2 * 60 * 1000;           // 2 minuty → logout
const MAX_SESSION_MS = 24 * 60 * 60 * 1000; // 24 hodin při zavřené záložce → logout
const POLL_MS = 10_000;                      // kontrola každých 10s (odolné vůči throttlingu)
const LAST_ACTIVITY_KEY = 'lastActivity';    // klíč v localStorage

interface UseIdleTimeoutOptions {
  onLogout: () => void;
}

interface UseIdleTimeoutResult {
  showWarning: boolean;
  remainingSeconds: number;
  resetTimer: () => void;
}

export function useIdleTimeout({ onLogout }: UseIdleTimeoutOptions): UseIdleTimeoutResult {
  const [showWarning, setShowWarning] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(WARNING_MS / 1000);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onLogoutRef = useRef(onLogout);
  onLogoutRef.current = onLogout;

  // Čas, kdy začalo varování (null = varování neběží)
  const warningStartRef = useRef<number | null>(null);

  const doLogout = useCallback(() => {
    localStorage.removeItem(LAST_ACTIVITY_KEY);
    onLogoutRef.current();
  }, []);

  const resetTimer = useCallback(() => {
    warningStartRef.current = null;
    setShowWarning(false);
    setRemainingSeconds(WARNING_MS / 1000);
    localStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());
  }, []);

  useEffect(() => {
    // Kontrola při načtení stránky: pokud od poslední aktivity uplynulo >24h → okamžitý logout
    const last = localStorage.getItem(LAST_ACTIVITY_KEY);
    if (last && Date.now() - parseInt(last, 10) > MAX_SESSION_MS) {
      doLogout();
      return;
    }
    localStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());

    // Aktivita uživatele — resetovat jen pokud varování ještě neběží
    const handleActivity = () => {
      if (warningStartRef.current === null) {
        localStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());
      }
    };

    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'] as const;
    events.forEach(e => window.addEventListener(e, handleActivity, { passive: true }));

    // Polling — spolehlivější než dlouhý setTimeout (prohlížeče throttlují bg záložky)
    pollRef.current = setInterval(() => {
      const stored = localStorage.getItem(LAST_ACTIVITY_KEY);
      if (!stored) return;

      const elapsed = Date.now() - parseInt(stored, 10);

      if (elapsed >= IDLE_MS + WARNING_MS) {
        // Čas na logout
        if (pollRef.current !== null) clearInterval(pollRef.current);
        warningStartRef.current = null;
        setShowWarning(false);
        doLogout();
        return;
      }

      if (elapsed >= IDLE_MS) {
        // Zobrazit varování
        if (warningStartRef.current === null) {
          warningStartRef.current = Date.now();
          setShowWarning(true);
        }
        const timeLeft = Math.ceil((IDLE_MS + WARNING_MS - elapsed) / 1000);
        setRemainingSeconds(Math.max(0, timeLeft));
      } else {
        // Uživatel byl aktivní — skrýt varování pokud bylo zobrazeno
        if (warningStartRef.current !== null) {
          warningStartRef.current = null;
          setShowWarning(false);
          setRemainingSeconds(WARNING_MS / 1000);
        }
      }
    }, POLL_MS);

    return () => {
      events.forEach(e => window.removeEventListener(e, handleActivity));
      if (pollRef.current !== null) clearInterval(pollRef.current);
    };
  }, [doLogout]);

  return { showWarning, remainingSeconds, resetTimer };
}
