import { useEffect, useState } from 'react'

const calc = (target) => {
  const diff = Math.max(0, (target?.getTime?.() ?? 0) - Date.now())
  return {
    done: diff <= 0,
    days: Math.floor(diff / 86400000),
    hours: Math.floor((diff / 3600000) % 24),
    minutes: Math.floor((diff / 60000) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  }
}

/** Contador regressivo que atualiza a cada segundo */
export function useCountdown(target) {
  const [left, setLeft] = useState(() => calc(target))
  const ts = target?.getTime?.()

  useEffect(() => {
    setLeft(calc(target))
    const t = setInterval(() => setLeft(calc(target)), 1000)
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ts])

  return left
}
