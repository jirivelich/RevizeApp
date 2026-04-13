import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { themes } from '../theme'
import type { ThemeName } from '../theme'

interface ThemeContextValue {
  themeName: ThemeName
  setTheme: (name: ThemeName) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

function applyTheme(name: ThemeName) {
  const vars = themes[name]
  const root = document.documentElement
  for (const [key, value] of Object.entries(vars)) {
    root.style.setProperty(key, value)
  }
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
