import { useLayoutEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'
import confetti from 'canvas-confetti'
import { Baby, Loader2, Minus, PartyPopper, Plus, User } from 'lucide-react'
import { repo } from '../services/repository'

const MINE_KEY = (partyId) => `festify:guest:${partyId}`
const MAX_EACH = 20

function Stepper({ label, sub, icon: Icon, value, onChange, min = 0, max = MAX_EACH }) {
  return (
    <div className="flex items-center justify-between gap-3 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <span className="g-soft grid h-10 w-10 shrink-0 place-items-center rounded-full g-accent">
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="g-heading leading-tight">{label}</p>
          <p className="g-muted text-xs">{sub}</p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2.5">
        <button type="button" className="g-step-btn" onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} aria-label={`Diminuir ${label}`}>
          <Minus className="h-4 w-4" />
        </button>
        <span className="w-7 text-center text-xl font-bold tabular-nums" aria-live="polite">
          {value}
        </span>
        <button type="button" className="g-step-btn plus" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} aria-label={`Aumentar ${label}`}>
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

function fireConfetti(colors) {
  const opts = { colors, disableForReducedMotion: true, zIndex: 80 }
  confetti({ ...opts, particleCount: 120, spread: 80, startVelocity: 45, origin: { y: 0.7 } })
  const end = Date.now() + 1400
  ;(function frame() {
    confetti({ ...opts, particleCount: 4, angle: 60, spread: 60, origin: { x: 0, y: 0.75 } })
    confetti({ ...opts, particleCount: 4, angle: 120, spread: 60, origin: { x: 1, y: 0.75 } })
    if (Date.now() < end) requestAnimationFrame(frame)
  })()
}

const resize = (list, n) => (list.length >= n ? list.slice(0, n) : [...list, ...Array(n - list.length).fill('')])
const validName = (s) => s.trim().length >= 2 && /\p{L}/u.test(s)

/**
 *   demo    → demonstração de tema (festa de mentira): nada é salvo
 *   preview → dono do buffet visualizando um convite real: SALVA normalmente
 */
export default function RsvpForm({ party, design, demo = false, preview = false }) {
  const [adults, setAdults] = useState([''])
  const [children, setChildren] = useState([])
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [showErrors, setShowErrors] = useState(false)
  const [sending, setSending] = useState(false)
  const [confirmed, setConfirmed] = useState(() => {
    if (demo || preview) return null
    try {
      return JSON.parse(localStorage.getItem(MINE_KEY(party.id)))
    } catch {
      return null
    }
  })
  const formRef = useRef()
  const successRef = useRef()
  const justConfirmed = useRef(false)

  useLayoutEffect(() => {
    if (confirmed && justConfirmed.current && successRef.current) {
      justConfirmed.current = false
      gsap.fromTo(successRef.current, { opacity: 0, scale: 0.85, y: 20 }, { opacity: 1, scale: 1, y: 0, duration: 0.7, ease: 'back.out(1.7)' })
      gsap.from(successRef.current.querySelectorAll('[data-pop]'), { opacity: 0, y: 12, stagger: 0.08, delay: 0.25, duration: 0.5 })
    }
  }, [confirmed])

  const setName = (kind, i, value) => {
    const upd = (list) => list.map((n, k) => (k === i ? value : n))
    kind === 'adult' ? setAdults(upd) : setChildren(upd)
    setError('')
  }

  const submit = async (e) => {
    e.preventDefault()
    const total = adults.length + children.length
    if (total < 1) return setError('Informe pelo menos 1 pessoa')
    if (![...adults, ...children].every(validName)) {
      setShowErrors(true)
      return setError('Escreva o nome de cada pessoa 🙂')
    }

    const guests = [
      ...adults.map((n) => ({ name: n.trim().replace(/\s+/g, ' '), kind: 'adult' })),
      ...children.map((n) => ({ name: n.trim().replace(/\s+/g, ' '), kind: 'child' })),
    ]
    const data = { name: guests[0].name, adults: adults.length, children: children.length, guests, message: message.trim() }

    setSending(true)
    try {
      const rsvp = demo ? { ...data, createdAt: new Date().toISOString() } : await repo.addRsvp(party.id, data)
      if (!demo && !preview) {
        try {
          localStorage.setItem(MINE_KEY(party.id), JSON.stringify(rsvp))
        } catch {
          /* sem espaço: tudo bem, a confirmação já foi salva */
        }
      }
      await gsap.to(formRef.current, { opacity: 0, y: -16, scale: 0.97, duration: 0.35, ease: 'power2.in' })
      justConfirmed.current = true
      setConfirmed(rsvp)
      fireConfetti(design.confetti)
      navigator.vibrate?.([30, 40, 30])
    } catch (err) {
      setError(err.message || 'Não foi possível confirmar. Verifique sua internet e tente novamente.')
    } finally {
      setSending(false)
    }
  }

  const reset = () => {
    setAdults([''])
    setChildren([])
    setMessage('')
    setShowErrors(false)
    setConfirmed(null)
  }

  if (confirmed) {
    const list = confirmed.guests?.length ? confirmed.guests : [{ name: confirmed.name, kind: 'adult' }]
    const total = (confirmed.adults || 0) + (confirmed.children || 0)
    return (
      <section ref={successRef} className="g-card px-5 py-8 text-center" aria-live="polite">
        <div className="text-5xl" data-pop>
          🎉
        </div>
        <h2 className="g-title mt-3" style={{ fontSize: 'calc(var(--g-title-size) * 0.74)' }} data-pop>
          Presença confirmada!
        </h2>
        <p className="g-heading mt-1 text-lg" data-pop>
          Nos vemos na festa 🎈
        </p>
        <p className="g-muted mt-3 text-sm" data-pop>
          Reservamos lugar para{' '}
          <b style={{ color: 'var(--g-text)' }}>
            {total} {total === 1 ? 'pessoa' : 'pessoas'}
          </b>
          :
        </p>
        <ul className="mx-auto mt-3 max-w-xs space-y-1.5 text-left" data-pop>
          {list.map((g, i) => (
            <li key={i} className="g-soft flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold">
              {g.kind === 'child' ? <Baby className="h-4 w-4 shrink-0 g-accent" /> : <User className="h-4 w-4 shrink-0 g-accent" />}
              <span className="min-w-0 flex-1 truncate">{g.name}</span>
              <span className="g-muted text-xs font-bold">{g.kind === 'child' ? 'criança' : 'adulto'}</span>
            </li>
          ))}
        </ul>
        {(demo || preview) && (
          <p className="mt-4 rounded-xl bg-amber-400/20 px-3 py-2 text-xs font-semibold text-amber-900" data-pop>
            {demo ? 'Demonstração: nada foi salvo.' : 'Visualização do buffet: esta confirmação FOI salva na lista (dá para remover no painel).'}
          </p>
        )}
        <button onClick={reset} className="g-muted mt-6 text-sm font-semibold underline underline-offset-4" data-pop>
          Confirmar outra família
        </button>
      </section>
    )
  }

  const nameField = (kind, value, i) => {
    const label = kind === 'adult' ? (i === 0 ? 'Seu nome (adulto 1)' : `Adulto ${i + 1}`) : `Criança ${i + 1}`
    const invalid = showErrors && !validName(value)
    return (
      <div key={`${kind}-${i}`} className="animate-fade-in">
        <label className="sr-only" htmlFor={`rsvp-${kind}-${i}`}>
          {label}
        </label>
        <div className="relative">
          <span className="g-muted pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2">
            {kind === 'adult' ? <User className="h-4 w-4" /> : <Baby className="h-4 w-4" />}
          </span>
          <input
            id={`rsvp-${kind}-${i}`}
            className={`g-input ${invalid ? 'g-invalid' : ''}`}
            style={{ paddingLeft: '2.5rem' }}
            placeholder={kind === 'adult' ? (i === 0 ? 'Seu nome completo' : `Nome do adulto ${i + 1}`) : `Nome da criança ${i + 1}`}
            autoComplete={kind === 'adult' && i === 0 ? 'name' : 'off'}
            autoCapitalize="words"
            maxLength={80}
            value={value}
            onChange={(e) => setName(kind, i, e.target.value)}
            aria-invalid={invalid || undefined}
          />
        </div>
      </div>
    )
  }

  return (
    <section ref={formRef} className="g-card p-5" aria-labelledby="rsvp-title">
      <div className="mb-3 flex items-center gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-white" style={{ background: 'var(--g-primary)' }}>
          <PartyPopper className="h-5 w-5" />
        </span>
        <div>
          <h2 id="rsvp-title" className="g-heading text-xl leading-tight">
            Confirme sua presença
          </h2>
          <p className="g-muted text-sm">Coloque o nome de cada pessoa que vai</p>
        </div>
      </div>

      <form onSubmit={submit} noValidate>
        <Stepper label="Adultos" sub="Incluindo você" icon={User} value={adults.length} onChange={(n) => setAdults((l) => resize(l, n))} />
        {adults.length > 0 && <div className="space-y-2 pb-2">{adults.map((v, i) => nameField('adult', v, i))}</div>}

        <div className="border-t" style={{ borderColor: 'var(--g-input-border)' }}>
          <Stepper label="Crianças" sub="Até 12 anos" icon={Baby} value={children.length} onChange={(n) => setChildren((l) => resize(l, n))} />
        </div>
        {children.length > 0 && <div className="space-y-2 pb-2">{children.map((v, i) => nameField('child', v, i))}</div>}

        <label className="g-label mt-3" htmlFor="rsvp-msg">
          Recado para o aniversariante <span className="g-muted font-normal">(opcional)</span>
        </label>
        <textarea
          id="rsvp-msg"
          className="g-input min-h-[88px] resize-none"
          placeholder="Deixe uma mensagem especial 💌"
          maxLength={280}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
        <p className="g-muted mt-1 text-right text-xs">{message.length}/280</p>

        {error && (
          <p className="mt-2 rounded-xl bg-rose-500/15 px-3 py-2 text-sm font-semibold text-rose-700" role="alert">
            {error}
          </p>
        )}

        <button type="submit" disabled={sending} className="g-btn g-btn-primary mt-4 w-full text-lg">
          {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <PartyPopper className="h-5 w-5" />}
          Confirmar presença
          {adults.length + children.length > 0 && ` (${adults.length + children.length})`}
        </button>
      </form>
    </section>
  )
}
