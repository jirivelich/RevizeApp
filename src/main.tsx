import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Registrace service workeru – vite-plugin-pwa (autoUpdate)
import { registerSW } from 'virtual:pwa-register'
registerSW({ immediate: true })
