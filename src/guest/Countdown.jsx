import { useCountdown } from '../hooks/useCountdown'

const pad = (n) => String(n).padStart(2, '0')

function Unit({ value, label }) {
  return (
    <div className="g-count-card flex flex-col items-center px-1 pb-3 pt-4">
      <span key={value} className="g-count-num animate-pop-in text-[1.95rem] font-bold leading-none tabular-nums">
        {pad(value)}
      </span>
      <span className="g-muted mt-1.5 text-[0.68rem] font-bold uppercase tracking-wider">{label}</span>
    </div>
  )
}

/** Contador regressivo ao vivo (atualiza a cada segundo) até o início da festa */
export default function Countdown({ target }) {
  const t = useCountdown(target)

  if (t.done) {
    const hoursSince = (Date.now() - target.getTime()) / 3600e3
    return (
      <div className="g-count-card p-5 text-center">
        <p className="g-heading text-lg">{hoursSince < 8 ? 'A festa está acontecendo agora! 🎉' : 'Essa festa já aconteceu. Obrigado a todos! 💖'}</p>
      </div>
    )
  }

  return (
    <section aria-label="Contagem regressiva">
      <p className="g-eyebrow mb-3 text-center">{t.days === 0 ? 'É hoje! Faltam' : 'Falta pouco!'}</p>
      <div className="grid grid-cols-4 gap-2 sm:gap-3" role="timer" aria-live="off">
        <Unit value={t.days} label={t.days === 1 ? 'Dia' : 'Dias'} />
        <Unit value={t.hours} label="Horas" />
        <Unit value={t.minutes} label="Min" />
        <Unit value={t.seconds} label="Seg" />
      </div>
    </section>
  )
}
