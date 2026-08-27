const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export function getApiBaseUrl(): string {
  return API_BASE_URL;
}

export function getToken(): string | null {
  return typeof window !== 'undefined' ? window.localStorage.getItem('token') : null;
}

export function getAuthHeaders(): HeadersInit {
  const token = getToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (token) {
    (headers as Record<string, string>).Authorization = `Bearer ${token}`;
  }

  return headers;
}

export function clearAuthState(): void {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  localStorage.removeItem('lastActivity');
}

export function setAuthState(token: string, user: unknown): void {
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));
}

export function getCurrentUser<T = unknown>(): T | null {
  const raw = localStorage.getItem('user');
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/**
 * Ověří platnost session. Offline nebo při chybě sítě/serveru důvěřuje
 * lokálně uloženému tokenu (offline-first UX); jen explicitní 401 ze
 * serveru session skutečně zneplatní.
 */
export async function verifySession(): Promise<boolean> {
  const token = getToken();
  if (!token) return false;

  if (!navigator.onLine) return true;

  try {
    const response = await fetch(buildApiUrl('/auth/verify'), {
      method: 'POST',
      headers: getAuthHeaders(),
    });

    if (response.status === 401) {
      clearAuthState();
      return false;
    }

    if (!response.ok) return true;

    await response.json();
    return true;
  } catch {
    return true;
  }
}

export async function handleResponse<T>(response: Response): Promise<T> {
  if (response.status === 401) {
    clearAuthState();
    window.location.href = '/login';
    throw new Error('Sezení vypršelo. Přihlaste se znovu.');
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Neznámá chyba' }));
    throw new Error(error.error || 'API chyba');
  }

  return response.json() as Promise<T>;
}

export function buildApiUrl(path: string): string {
  const normalizedBase = API_BASE_URL.replace(/\/+$/, '');
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return normalizedBase + (normalizedPath === '/' ? '' : normalizedPath);
}
