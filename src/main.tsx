import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/inter'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Po novém nasazení může otevřená (nebo uložená) stará verze aplikace odkazovat na soubory,
// které už na serveru nejsou (např. jspdf pro export PDF). Vite pak vyvolá vite:preloadError –
// stránku jednou obnovíme, aby se načetla aktuální verze. Pojistka proti smyčce: max. 1× za minutu.
window.addEventListener('vite:preloadError', (event) => {
  try {
    const KEY = 'reveli_preload_reload_at';
    const last = Number(sessionStorage.getItem(KEY) || 0);
    if (Date.now() - last < 60_000) return;
    sessionStorage.setItem(KEY, String(Date.now()));
    event.preventDefault();
    window.location.reload();
  } catch {
    /* sessionStorage nedostupné – nechat chybu projít */
  }
});

// Registrace service workeru – vite-plugin-pwa (autoUpdate)
import { registerSW } from 'virtual:pwa-register'
registerSW({ immediate: true })
