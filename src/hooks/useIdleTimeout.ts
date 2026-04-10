import { useEffect, useRef, useCallback, useState } from 'react';

const IDLE_MS = 58 * 60 * 1000;
const WARNING_MS = 2 * 60 * 1000;
const POLL_MS = 10_000;

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

    pollRef.current = setInterval(() => {
      const elapsed = Date.now() - lastActivityRef.current;
      if (elapsed >= IDLE_MS + WARNING_MS) {
        if (pollRef.current !== null) clearInterval(pollRef.current);
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
    }, POLL_MS);

    return () => {
      events.forEach(e => window.removeEventListener(e, handleActivity));
      if (pollRef.current !== null) clearInterval(pollRef.current);
    };
  }, []);

  return { showWarning, remainingSeconds, resetTimer };
}