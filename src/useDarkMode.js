import { useEffect, useState } from 'react'

const KEY = 'festify:ui:dark'

function initial() {
  try {
    const saved = localStorage.getItem(KEY)
    if (saved !== null) return saved === '1'
  } catch {
    /* ignore */
  }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false
}

/** Tema claro/escuro do painel do anfitrião (classe `dark` no <html>) */
export function useDarkMode() {
  const [dark, setDark] = useState(initial)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#0b0b12' : '#ffffff')
    try {
      localStorage.setItem(KEY, dark ? '1' : '0')
    } catch {
      /* ignore */
    }
  }, [dark])

  return [dark, () => setDark((d) => !d)]
}
