import { useLayoutEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'
import confetti from 'canvas-confetti'
import { MailOpen } from 'lucide-react'
import { formatDateShort } from '../lib/utils'
import Sky from './Sky'

/**
 * Tela do envelope: céu azul com nuvens e balões subindo, envelope branco
 * com selo na cor da festa (menina rosa · menino azul · para todos vermelho).
 *
 * Ao abrir: o envelope vem para frente → o selo estoura → a aba abre em 3D →
 * a carta sobe com um pouquinho de confete → a carta avança até a tela →
 * clarão de luz rápido → página principal do convite.
 */
export default function Envelope({ party, design, onReveal, onDone }) {
  const root = useRef()
  const flash = useRef()
  const [opening, setOpening] = useState(false)
  const reduceMotion = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

  // Entrada: envelope flutua para a tela e fica "boiando"
  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from('.js-env', { y: 70, rotate: -5, opacity: 0, duration: 1, ease: 'back.out(1.4)' })
      gsap.from('.js-intro', { y: 18, opacity: 0, duration: 0.6, stagger: 0.1, delay: 0.3, ease: 'power2.out' })
      gsap.to('.js-env', { y: -9, rotate: 0.6, duration: 2, ease: 'sine.inOut', yoyo: true, repeat: -1, delay: 1 })
    }, root)
    return () => ctx.revert()
  }, [])

  const open = () => {
    if (opening) return
    setOpening(true)
    navigator.vibrate?.(20)

    if (reduceMotion) {
      onReveal()
      gsap.to(root.current, { opacity: 0, duration: 0.3, onComplete: onDone })
      return
    }

    const q = gsap.utils.selector(root)
    gsap.killTweensOf(q('.js-env'))
    gsap.set(q('.env-flap'), { transformPerspective: 900 })

    const burst = () => {
      const box = q('.js-env')[0]?.getBoundingClientRect()
      if (!box) return
      confetti({
        particleCount: 46,
        spread: 70,
        startVelocity: 26,
        gravity: 0.9,
        scalar: 0.8,
        ticks: 140,
        origin: { x: (box.left + box.width / 2) / window.innerWidth, y: (box.top + box.height * 0.3) / window.innerHeight },
        colors: design.confetti,
        disableForReducedMotion: true,
        zIndex: 70,
      })
    }

    const tl = gsap.timeline({ onComplete: onDone })
    tl.to(q('.js-intro'), { opacity: 0, y: 14, duration: 0.3, stagger: 0.04, ease: 'power1.in' })
      // 1. Envelope vem para frente, com um "tremidinho" de expectativa
      .to(q('.js-env'), { y: 0, rotate: 0, scale: 1.08, duration: 0.4, ease: 'power2.out' }, 0)
      .to(q('.js-env'), { rotate: -2.5, duration: 0.07, yoyo: true, repeat: 3, ease: 'sine.inOut' }, 0.32)
      // 2. Selo estoura
      .to(q('.env-seal'), { scale: 1.28, duration: 0.14, ease: 'power1.out' }, 0.62)
      .to(q('.env-seal'), { scale: 0, rotate: -160, opacity: 0, duration: 0.36, ease: 'back.in(2.2)' })
      // 3. Aba abre em 3D
      .to(q('.env-flap'), { rotateX: 180, duration: 0.62, ease: 'power2.inOut' }, '-=0.1')
      .set(q('.env-flap'), { zIndex: 1 }, '-=0.3')
      // 4. Carta sobe + confete saindo do envelope
      .to(q('.env-letter'), { yPercent: -62, duration: 0.72, ease: 'power3.out' }, '-=0.12')
      .add(burst, '<0.15')
      // 5. Carta avança até a tela e o envelope desce
      .set(q('.env-letter'), { zIndex: 6 }, '+=0.12')
      .to(q('.env-letter'), { scale: 3.6, yPercent: -30, duration: 0.7, ease: 'power2.in' })
      .to(q('.env-body, .env-flap'), { y: 180, rotate: 5, opacity: 0, duration: 0.55, ease: 'power2.in' }, '<')
      // 6. Clarão de luz → página principal aparece por trás
      .to(flash.current, { opacity: 1, duration: 0.2, ease: 'power2.in' }, '-=0.25')
      .add(onReveal)
      .set(q('.env-stage'), { opacity: 0 })
      .to(flash.current, { opacity: 0, duration: 0.55, ease: 'power2.out' }, '+=0.05')
      .set(root.current, { opacity: 0 })
  }

  return (
    <div
      ref={root}
      className={`${design.className} g-envelope fixed inset-0 z-50 overflow-hidden`}
      style={{ pointerEvents: opening ? 'none' : 'auto', '--seal': design.seal, '--seal-dark': design.sealDark }}
    >
      <div className="env-stage absolute inset-0">
        <Sky balloonColors={design.balloons} />

        <div className="pt-safe pb-safe relative z-10 flex h-full flex-col items-center justify-center px-4 text-center">
          <p className="js-intro env-eyebrow">Você recebeu um convite</p>
          <h1 className="js-intro env-headline mt-1.5">Abra para descobrir ✨</h1>

          <div className="env-scene mt-9">
            <button type="button" onClick={open} className="js-env env block" aria-label="Abrir convite">
              <div className="env-body absolute inset-0">
                <div className="env-back" />
              </div>
              <div className="env-letter">
                <span className="env-letter-band" />
                <span className="mt-3 text-[0.6rem] font-extrabold uppercase tracking-[0.22em]" style={{ color: 'var(--seal)' }}>
                  Convite
                </span>
                <span className="mt-1.5 line-clamp-2 px-1 text-[0.98rem] font-bold leading-tight text-slate-800" style={{ fontFamily: 'var(--g-font-title)' }}>
                  {party.title}
                </span>
                <span className="mt-1.5 text-[0.7rem] font-semibold text-slate-500">{formatDateShort(party)}</span>
              </div>
              <div className="env-body env-pocket" />
              <div className="env-flap">
                <div className="env-flap-face" />
              </div>
              <div className="env-seal" aria-hidden>
                <svg viewBox="0 0 24 24" className="h-7 w-7" fill="currentColor">
                  <path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3 4.5 6.6 4.5c2.2 0 3.6 1.2 4.4 2.5.8-1.3 2.2-2.5 4.4-2.5 3.6 0 5.7 3.9 4.2 7.3C19.5 16.4 12 21 12 21Z" />
                </svg>
              </div>
            </button>
          </div>

          <p className="js-intro env-to mt-8">
            Para: <b>Você 💌</b>
          </p>

          <button type="button" onClick={open} className="js-intro env-cta mt-4">
            <MailOpen className="h-5 w-5" /> Abrir convite
          </button>
        </div>
      </div>

      {/* Clarão de luz da transição */}
      <div ref={flash} className="env-flash" />
    </div>
  )
}
