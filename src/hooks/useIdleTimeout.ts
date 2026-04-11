import { useEffect, useRef, useCallback, useState } from 'react';

const IDLE_MS = 58 * 60 * 1000;
const WARNING_MS = 2 * 60 * 1000;
const POLL_MS = 30_000; // 30s stačí pro detekci 58min nečinnosti

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

  const lastActivityRef = useRef<number>(Date.now());
  const warningActiveRef = useRef(false);

  const resetTimer = useCallback(() => {
    lastActivityRef.current = Date.now();
    warningActiveRef.current = false;
    setShowWarning(false);
    setRemainingSeconds(WARNING_MS / 1000);
  }, []);

  useEffect(() => {
    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'] as const;
    const handleActivity = () => {
      if (!warningActiveRef.current) {
        lastActivityRef.current = Date.now();
      }
    };
    events.forEach(e => window.addEventListener(e, handleActivity, { passive: true }));

    const tick = () => {
      const elapsed = Date.now() - lastActivityRef.current;
      if (elapsed >= IDLE_MS + WARNING_MS) {
        stopPoll();
        warningActiveRef.current = false;
        setShowWarning(false);
        onLogoutRef.current();
        return;
      }
      if (elapsed >= IDLE_MS) {
        if (!warningActiveRef.current) {
          warningActiveRef.current = true;
          setShowWarning(true);
        }
        const timeLeft = Math.ceil((IDLE_MS + WARNING_MS - elapsed) / 1000);
        setRemainingSeconds(Math.max(0, timeLeft));
      } else {
        if (warningActiveRef.current) {
          warningActiveRef.current = false;
          setShowWarning(false);
          setRemainingSeconds(WARNING_MS / 1000);
        }
      }
    };

    const startPoll = () => {
      if (pollRef.current !== null) return;
      pollRef.current = setInterval(tick, POLL_MS);
    };

    const stopPoll = () => {
      if (pollRef.current !== null) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };

    // Pozastavit interval když je tab skrytý (obrazovka vypnutá, přepnutá app)
    const handleVisibility = () => {
      if (document.hidden) {
        stopPoll();
      } else {
        tick(); // okamžitá kontrola po návratu (mohla vypršet nečinnost)
        startPoll();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    startPoll();

    return () => {
      events.forEach(e => window.removeEventListener(e, handleActivity));
      document.removeEventListener('visibilitychange', handleVisibility);
      stopPoll();
    };
  }, []);

  return { showWarning, remainingSeconds, resetTimer };
}