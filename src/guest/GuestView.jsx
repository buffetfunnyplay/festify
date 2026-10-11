import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { ArrowLeft, CalendarDays, Clock, Eye, Gift, Heart, MapPin, Navigation } from 'lucide-react'
import { useParty } from '../hooks/useData'
import { goAdmin, navigate } from '../hooks/useRoute'
import { designOf, loadInviteFonts } from '../lib/designs'
import { formatDateLong, formatTime, mapsHref, partyDate, wazeHref } from '../lib/utils'
import Envelope from './Envelope'
import Countdown from './Countdown'
import PixModal from './PixModal'
import RsvpForm from './RsvpForm'
import Sky from './Sky'

gsap.registerPlugin(ScrollTrigger)

export default function GuestView({ slug, preview }) {
  const { party, loading } = useParty({ slug })

  if (loading) {
    return (
      <div className="grid min-h-dvh place-items-center bg-white">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-sky-200 border-t-sky-500" />
      </div>
    )
  }
  if (!party) return <NotFound />
  return (
    <GuestInvite
      party={party}
      preview={preview}
      banner={preview ? { label: 'Visualização (confirmações são salvas)', backLabel: 'Painel', onBack: () => goAdmin() } : null}
    />
  )
}

/**
 * Convite completo (envelope + conteúdo). Usado pelo convite real e pela
 * demonstração dos temas da biblioteca.
 *   demo    → festa de mentira: RSVP não é salvo
 *   preview → dono do buffet visualizando: RSVP é salvo normalmente
 *   banner  → { label, backLabel, onBack } faixa superior opcional
 */
export function GuestInvite({ party, preview = false, demo = false, banner }) {
  const [envelope, setEnvelope] = useState(true)
  const [revealed, setRevealed] = useState(false)
  const [pixOpen, setPixOpen] = useState(false)
  const contentRef = useRef()
  const design = designOf(party)
  const buffet = party.buffet || {}

  // Ambiente da página do convidado: sem modo escuro do painel, fontes e cor da barra
  useEffect(() => {
    document.documentElement.classList.remove('dark')
    loadInviteFonts()
    const meta = document.querySelector('meta[name="theme-color"]')
    const prev = meta?.getAttribute('content')
    meta?.setAttribute('content', envelope ? '#3aa6f2' : design.page)
    return () => prev && meta?.setAttribute('content', prev)
  }, [design.page, envelope])

  useEffect(() => {
    if (party) document.title = `${party.title} · Convite`
  }, [party])

  // Trava o scroll enquanto o envelope está fechado
  useEffect(() => {
    document.body.style.overflow = envelope ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [envelope])

  // Revelação do conteúdo (profundidade + cascata) e seções no scroll
  useLayoutEffect(() => {
    if (!revealed || !contentRef.current) return
    window.scrollTo(0, 0)
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    const ctx = gsap.context(() => {
      if (reduce) {
        gsap.set(contentRef.current, { opacity: 1 })
        return
      }
      gsap.fromTo(contentRef.current, { opacity: 0, scale: 0.94 }, { opacity: 1, scale: 1, duration: 0.8, ease: 'power3.out', clearProps: 'scale' })
      gsap.from('[data-reveal]', { y: 36, opacity: 0, duration: 0.75, stagger: 0.12, ease: 'power3.out', delay: 0.1 })
      gsap.set('[data-reveal-scroll]', { opacity: 0, y: 44 })
      ScrollTrigger.batch('[data-reveal-scroll]', {
        start: 'top 94%',
        once: true,
        onEnter: (els) => gsap.to(els, { opacity: 1, y: 0, duration: 0.7, stagger: 0.12, ease: 'power3.out', overwrite: true }),
      })
      ScrollTrigger.refresh()
    }, contentRef)
    return () => ctx.revert()
  }, [revealed])

  const date = partyDate(party)
  const hasPix = Boolean(party.pixEnabled && party.pixKey)
  const goBuffet = () => buffet.handle && navigate({ b: buffet.handle })

  return (
    <div className={`${design.className} g-root relative overflow-x-hidden`}>
      {revealed && <Sky variant="soft" balloonColors={design.balloons} />}

      {banner && (
        <div className="pt-safe sticky top-0 z-40 bg-slate-900/90 text-white backdrop-blur" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
          <div className="flex items-center justify-between gap-2 px-3 py-2 text-xs font-semibold">
            <span className="flex min-w-0 items-center gap-1.5">
              <Eye className="h-4 w-4 shrink-0" /> <span className="truncate">{banner.label}</span>
            </span>
            <button onClick={banner.onBack} className="flex shrink-0 items-center gap-1 rounded-lg bg-white/15 px-2.5 py-1.5 hover:bg-white/25">
              <ArrowLeft className="h-3.5 w-3.5" /> {banner.backLabel}
            </button>
          </div>
        </div>
      )}

      <main ref={contentRef} className="relative z-10 mx-auto w-full max-w-md space-y-5 px-4 pb-10 pt-6" style={{ opacity: revealed ? undefined : 0 }}>
        {/* ── Card do evento ── */}
        <article data-reveal className="g-card overflow-hidden">
          <div className="relative aspect-[4/3] overflow-hidden" style={{ borderRadius: 'calc(var(--g-radius) - 1px) calc(var(--g-radius) - 1px) 0 0' }}>
            {party.coverImage ? (
              <img src={party.coverImage} alt={party.title} className="h-full w-full object-cover" />
            ) : (
              <div className="grid h-full w-full place-items-center text-7xl" style={{ background: 'var(--g-hero)' }}>
                <span className="float-y drop-shadow-lg">{design.emoji}</span>
              </div>
            )}
          </div>
          <div className="px-5 pb-6 pt-5 text-center">
            <p className="g-eyebrow">Oba! Você foi convidado(a) para</p>
            <h1 className="g-title mt-2">{party.title}</h1>
            {party.message && <p className="g-muted mx-auto mt-3 max-w-sm text-[0.98rem] leading-relaxed">{party.message}</p>}

            <div className="mt-5 grid grid-cols-2 gap-2.5 text-left">
              <div className="g-soft rounded-2xl p-3">
                <p className="g-muted flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide">
                  <CalendarDays className="h-4 w-4" /> Data
                </p>
                <p className="g-heading mt-1 leading-snug">{formatDateLong(party).replace(/ de \d{4}$/, '')}</p>
              </div>
              <div className="g-soft rounded-2xl p-3">
                <p className="g-muted flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide">
                  <Clock className="h-4 w-4" /> Horário
                </p>
                <p className="g-heading mt-1 text-2xl leading-none">{formatTime(party)}</p>
              </div>
            </div>
          </div>
        </article>

        {/* ── Contador ao vivo ── */}
        <div data-reveal>{date && <Countdown target={date} />}</div>

        {/* ── Local ── */}
        <section data-reveal-scroll className="g-card p-5">
          <div className="flex items-start gap-3">
            <span className="g-soft grid h-11 w-11 shrink-0 place-items-center rounded-full">
              <MapPin className="h-5 w-5 g-accent" />
            </span>
            <div className="min-w-0">
              <p className="g-eyebrow">Local</p>
              <p className="g-heading mt-0.5 text-lg leading-snug">{party.venueName}</p>
              <p className="g-muted mt-0.5 text-sm leading-relaxed">{party.address}</p>
            </div>
          </div>
          <a href={mapsHref(party)} target="_blank" rel="noopener noreferrer" className="g-btn g-btn-primary mt-5 w-full">
            <Navigation className="h-5 w-5" /> Como chegar
          </a>
          {wazeHref(party) && (
            <a href={wazeHref(party)} target="_blank" rel="noopener noreferrer" className="g-muted mt-3 block text-center text-sm font-semibold underline-offset-4 hover:underline">
              Prefere o Waze? Abrir no Waze →
            </a>
          )}
        </section>

        {/* ── Presente via Pix (valor de coração) ── */}
        {hasPix && (
          <section data-reveal-scroll className="g-card p-5 text-center">
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-full text-white" style={{ background: 'var(--g-primary)' }}>
              <Gift className="h-6 w-6" />
            </span>
            <h2 className="g-heading mt-3 text-xl">Quer presentear?</h2>
            <p className="g-heart-note mx-auto mt-2 inline-flex items-center gap-1.5 px-3 py-1 text-sm">
              <Heart className="h-4 w-4" fill="currentColor" /> Valor de coração
            </p>
            <p className="g-muted mt-2 text-sm">Qualquer quantia é recebida com muito carinho.</p>
            <button onClick={() => setPixOpen(true)} className="g-btn g-btn-outline mt-4 w-full">
              <Gift className="h-5 w-5" /> Presentear via Pix
            </button>
          </section>
        )}

        {/* ── Confirmação de presença ── */}
        <div data-reveal-scroll>
          <RsvpForm party={party} design={design} demo={demo} preview={preview} />
        </div>

        <footer className="g-muted pb-safe pt-4 text-center text-xs leading-relaxed">
          Convite digital {buffet.name ? <>por <b style={{ color: 'var(--g-text)' }}>{buffet.name}</b></> : 'criado com Festify ✨'}
          {buffet.handle && !demo && (
            <>
              <br />
              <button onClick={goBuffet} className="mt-1 font-bold underline-offset-4 hover:underline" style={{ color: 'var(--g-text)' }}>
                Conheça nossos temas de festa →
              </button>
            </>
          )}
        </footer>
      </main>

      {hasPix && <PixModal open={pixOpen} onClose={() => setPixOpen(false)} party={party} design={design} />}

      {envelope && <Envelope party={party} design={design} onReveal={() => setRevealed(true)} onDone={() => setEnvelope(false)} />}
    </div>
  )
}

function NotFound() {
  return (
    <div className="design-menino g-root grid place-items-center px-6 text-center">
      <div className="g-card max-w-sm p-8">
        <div className="text-5xl">🔍</div>
        <h1 className="g-heading mt-4 text-2xl">Convite não encontrado</h1>
        <p className="g-muted mt-2 text-sm leading-relaxed">
          O link pode estar incompleto ou a festa foi removida. Confira o link recebido e tente novamente.
        </p>
      </div>
    </div>
  )
}
