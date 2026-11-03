import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
export type ThemeName = 'dark' | 'light'

interface ThemeContextValue {
  themeName: ThemeName
  setTheme: (name: ThemeName) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

function applyTheme(name: ThemeName) {
  document.documentElement.dataset.theme = name
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeName, setThemeName] = useState<ThemeName>(() => {
    const stored = localStorage.getItem('theme')
    return stored === 'light' ? 'light' : 'dark'
  })

  useEffect(() => {
    applyTheme(themeName)
    localStorage.setItem('theme', themeName)
  }, [themeName])

  const setTheme = (name: ThemeName) => setThemeName(name)

  return (
    <ThemeContext.Provider value={{ themeName, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
