import { useLayoutEffect, useMemo, useRef } from 'react'
import { gsap } from 'gsap'

// ────────────────────────────────────────────────────────────
// Abertura da biblioteca:
//   1. Tela branca com a pergunta.
//   2. Nuvens nascem embaixo e sobem cobrindo a tela (balançando de leve).
//   3. Quando chegam na metade, param de nascer; a massa de nuvens continua
//      subindo e, por onde já passou, revela a biblioteca. A parte de cima
//      continua branca até as nuvens passarem.
// ────────────────────────────────────────────────────────────

function rng(seed) {
  let s = seed
  return () => ((s = (s * 9301 + 49297) % 233280) / 233280)
}

function IntroCloud({ w }) {
  const h = (w * 120) / 220
  return (
    <svg viewBox="0 0 220 140" width={w} height={(h * 140) / 120} aria-hidden>
      <ellipse cx="110" cy="118" rx="96" ry="16" fill="url(#ci-shadow)" />
      <g fill="url(#ci-grad)">
        <rect x="18" y="66" width="184" height="44" rx="22" />
        <circle cx="62" cy="68" r="32" />
        <circle cx="104" cy="50" r="42" />
        <circle cx="150" cy="62" r="34" />
        <circle cx="182" cy="82" r="22" />
        <circle cx="36" cy="86" r="22" />
      </g>
    </svg>
  )
}

export default function CloudIntro({ message = 'Está preparado para essa data inesquecível?', logo, onDone }) {
  const root = useRef()
  const white = useRef()
  const mass = useRef()
  const text = useRef()

  // Massa de nuvens: densa no meio (cobre tudo), mais solta nas bordas de cima e de baixo
  const clouds = useMemo(() => {
    const r = rng(42)
    const W = typeof window !== 'undefined' ? window.innerWidth : 400
    const H = typeof window !== 'undefined' ? window.innerHeight : 800
    const massH = H * 1.05
    const scale = Math.min(1.8, Math.max(1, W / 600)) // telas grandes: nuvens maiores
    const gapY = 58 * Math.min(scale, 1.4)
    const list = []
    const rows = Math.ceil(massH / gapY) + 2
    for (let row = 0; row < rows; row++) {
      const y = row * gapY - 40
      const edge = Math.min(y, massH - y) / massH // 0 nas bordas, ~0.5 no meio
      const perRow = Math.ceil((W * 1.3) / (125 * scale)) + 1 + (edge > 0.12 ? 1 : 0)
      for (let i = 0; i < perRow; i++) {
        if (edge < 0.06 && r() < 0.35) continue
        const w = (170 + r() * 120) * scale
        list.push({
          key: `${row}-${i}`,
          x: ((i + r() * 0.6 - 0.3) / (perRow - 1 || 1)) * (W * 1.3) - w / 2,
          y: y + (r() - 0.5) * 26,
          w,
          amp: 4 + r() * 6,
          sdur: 2.2 + r() * 2,
          sdelay: -r() * 3,
        })
      }
    }
    return { list, massH }
  }, [])

  useLayoutEffect(() => {
    const H = window.innerHeight
    const { massH } = clouds
    const pos = { y: H } // topo da massa de nuvens (px a partir do topo da tela)

    const render = () => {
      mass.current.style.transform = `translate3d(0, ${pos.y}px, 0)`
      // O branco vai do topo até o meio da massa de nuvens (a borda fica escondida)
      const cut = Math.max(0, pos.y + massH * 0.55)
      white.current.style.clipPath = `inset(0 0 ${Math.max(0, H - cut)}px 0)`
    }
    render()

    const ctx = gsap.context(() => {
      gsap.from(text.current, { opacity: 0, y: 14, duration: 0.6, ease: 'power2.out' })
      const tl = gsap.timeline({ delay: 0.55, onComplete: () => onDone?.() })
      // nuvens nascem embaixo e sobem até a metade da tela
      tl.to(pos, { y: H * 0.5, duration: 1.5, ease: 'power1.out', onUpdate: render })
        // param de nascer: a massa segue subindo e revela a biblioteca por baixo
        .to(pos, { y: -massH - 60, duration: 1.75, ease: 'power2.in', onUpdate: render })
        .to(text.current, { opacity: 0, duration: 0.4 }, '<0.2')
    }, root)

    return () => ctx.revert()
  }, [clouds, onDone])

  return (
    <div ref={root} className="ci-root" role="presentation">
      <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden focusable="false">
        <defs>
          <linearGradient id="ci-grad" x1="0" y1="10" x2="0" y2="112" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#ffffff" />
            <stop offset=".55" stopColor="#f6faff" />
            <stop offset="1" stopColor="#cfe2f6" />
          </linearGradient>
          <radialGradient id="ci-shadow" cx=".5" cy=".5" r=".5">
            <stop offset="0" stopColor="#9ec2e6" stopOpacity=".5" />
            <stop offset="1" stopColor="#9ec2e6" stopOpacity="0" />
          </radialGradient>
        </defs>
      </svg>

      <div ref={white} className="ci-white">
        <div ref={text} className="absolute inset-x-0 top-[22%] px-8 text-center">
          {logo && <img src={logo} alt="" className="mx-auto mb-5 h-16 w-16 rounded-2xl object-cover shadow-soft ring-1 ring-black/5" />}
          <p className="mx-auto max-w-xs font-display text-[1.65rem] font-extrabold leading-tight tracking-tight text-brand-800 sm:max-w-md sm:text-4xl">
            {message}
          </p>
          <p className="mt-3 text-3xl">🎈</p>
        </div>
      </div>

      <div ref={mass} className="ci-mass" style={{ height: clouds.massH }}>
        {clouds.list.map((c) => (
          <div key={c.key} className="ci-cloud" style={{ left: c.x, top: c.y }}>
            <div className="sky-sway" style={{ '--amp': `${c.amp}px`, '--sdur': `${c.sdur}s`, '--sdelay': `${c.sdelay}s`, '--rot': '0.4deg' }}>
              <IntroCloud w={c.w} />
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={() => onDone?.()}
        className="pt-safe absolute right-3 top-3 z-10 rounded-full bg-white/80 px-3 py-1.5 text-xs font-semibold text-slate-500 shadow-sm ring-1 ring-black/5 backdrop-blur"
      >
        Pular
      </button>
    </div>
  )
}
