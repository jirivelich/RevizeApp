import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Registrace service workeru pro PWA/offline režim
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then(registration => {
        // Service worker úspěšně registrován
        // console.log('SW registered:', registration);
      })
      .catch(error => {
        // console.error('SW registration failed:', error);
      });
  });
}
