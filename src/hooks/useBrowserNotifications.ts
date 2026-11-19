import { useEffect, useRef } from 'react';
import type { AppNotification } from '../types';

const SEEN_KEY = 'revizeapp_notified_ids';
const MAX_SEEN = 200;

function loadSeen(): Set<string> {
  try {
    const raw = localStorage.getItem(SEEN_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function saveSeen(seen: Set<string>) {
  try {
    const arr = Array.from(seen).slice(-MAX_SEEN);
    localStorage.setItem(SEEN_KEY, JSON.stringify(arr));
  } catch {
    // localStorage nedostupné (privátní režim apod.) - notifikace se prostě zopakují
  }
}

// Na Androidu (Chrome, Edge) konstruktor `new Notification()` vyhodí „Illegal constructor“ –
// notifikace tam jde zobrazit jen přes service worker. Na desktopu slouží konstruktor jako záloha.
async function zobrazNotifikaci(title: string, options: NotificationOptions) {
  const opts: NotificationOptions = { icon: '/logo192.png', badge: '/logo192.png', ...options };
  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg) {
        await reg.showNotification(title, opts);
        return;
      }
    }
    new Notification(title, opts);
  } catch (err) {
    console.warn('Notifikaci se nepodařilo zobrazit:', err);
  }
}

// Zobrazí systémová upozornění prohlížeče pro nové kritické/varovné položky.
// Vyžaduje explicitní zapnutí (enabled) a udělené oprávnění prohlížeče.
export function useBrowserNotifications(notifications: AppNotification[], enabled: boolean) {
  const seenRef = useRef<Set<string> | null>(null);

  useEffect(() => {
    if (!enabled) return;
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;

    if (!seenRef.current) seenRef.current = loadSeen();
    const seen = seenRef.current;

    for (const n of notifications) {
      if (n.severity === 'info') continue;
      if (seen.has(n.id)) continue;
      seen.add(n.id);
      void zobrazNotifikaci(n.title, { body: n.description, tag: n.id });
    }
    saveSeen(seen);
  }, [notifications, enabled]);
}

export async function requestBrowserNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'denied';
  return Notification.requestPermission();
}
