import { useEffect, useRef, useCallback, useState } from 'react';

const IDLE_MS = 58 * 60 * 1000;              // 58 minut neaktivity na stránce → varování
const WARNING_MS = 2 * 60 * 1000;           // 2 minuty → logout
const MAX_SESSION_MS = 24 * 60 * 60 * 1000; // 24 hodin od poslední aktivity → logout při opětovném otevření
const LAST_ACTIVITY_KEY = 'lastActivity';

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

  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onLogoutRef = useRef(onLogout);
  onLogoutRef.current = onLogout;

  const doLogout = useCallback(() => {
    localStorage.removeItem(LAST_ACTIVITY_KEY);
    onLogoutRef.current();
  }, []);

  const clearCountdown = useCallback(() => {
    if (countdownIntervalRef.current !== null) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
  }, []);

  const startCountdown = useCallback(() => {
    setShowWarning(true);
    setRemainingSeconds(WARNING_MS / 1000);

    const deadline = Date.now() + WARNING_MS;

    countdownIntervalRef.current = setInterval(() => {
      const remaining = Math.ceil((deadline - Date.now()) / 1000);
      if (remaining <= 0) {
        clearCountdown();
        setShowWarning(false);
        doLogout();
      } else {
        setRemainingSeconds(remaining);
      }
    }, 500);
  }, [clearCountdown, doLogout]);

  const resetTimer = useCallback(() => {
    clearCountdown();
    setShowWarning(false);
    setRemainingSeconds(WARNING_MS / 1000);
    localStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());

    if (idleTimerRef.current !== null) {
      clearTimeout(idleTimerRef.current);
    }
    idleTimerRef.current = setTimeout(startCountdown, IDLE_MS);
  }, [clearCountdown, startCountdown]);

  useEffect(() => {
    // Kontrola při načtení stránky: pokud od poslední aktivity uplynulo >24h → okamžitý logout
    const last = localStorage.getItem(LAST_ACTIVITY_KEY);
    if (last && Date.now() - parseInt(last, 10) > MAX_SESSION_MS) {
      doLogout();
      return;
    }
    localStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());

    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'] as const;

    const handleActivity = () => {
      // Resetovat jen pokud varování ještě neběží (jinak uživatel musí kliknout v modalu)
      setShowWarning(current => {
        if (!current) {
          resetTimer();
        }
        return current;
      });
    };

    events.forEach(e => window.addEventListener(e, handleActivity, { passive: true }));

    // Spustit první timer
    idleTimerRef.current = setTimeout(startCountdown, IDLE_MS);

    return () => {
      events.forEach(e => window.removeEventListener(e, handleActivity));
      if (idleTimerRef.current !== null) clearTimeout(idleTimerRef.current);
      clearCountdown();
    };
  }, [resetTimer, startCountdown, clearCountdown, doLogout]);

  return { showWarning, remainingSeconds, resetTimer };
}
