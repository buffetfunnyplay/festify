import { memo, useMemo } from 'react'

// ────────────────────────────────────────────────────────────
// Céu animado: nuvens e balões nascem embaixo, sobem balançando
// de leve e somem no alto. 3 tamanhos (longe / meio / perto) dão
// profundidade. Tudo em CSS (roda liso até em celular simples).
// ────────────────────────────────────────────────────────────

/** Gerador pseudoaleatório fixo — a cena é sempre igual (sem "pulos" ao redesenhar) */
function rng(seed) {
  let s = seed
  return () => {
    s = (s * 9301 + 49297) % 233280
    return s / 233280
  }
}

const CLOUD_LAYERS = [
  // longe: pequenas, lentas, mais transparentes
  { count: 4, w: [88, 112], dur: [34, 42], op: 0.72, amp: [6, 10], z: 1 },
  // meio
  { count: 3, w: [140, 172], dur: [24, 29], op: 0.9, amp: [8, 14], z: 2 },
  // perto: grandes e mais rápidas
  { count: 2, w: [210, 250], dur: [16, 20], op: 1, amp: [10, 16], z: 4 },
]

const BALLOON_LAYERS = [
  { count: 3, w: [22, 28], dur: [22, 27], op: 0.75, amp: [16, 24], z: 1 },
  { count: 3, w: [34, 40], dur: [16, 19], op: 0.92, amp: [22, 30], z: 3 },
  { count: 2, w: [50, 58], dur: [12, 14], op: 1, amp: [28, 38], z: 5 },
]

const between = (r, [a, b]) => a + r() * (b - a)

function build(layers, seed, kind, colors) {
  const r = rng(seed)
  const items = []
  layers.forEach((L, li) => {
    for (let i = 0; i < L.count; i++) {
      const dur = between(r, L.dur)
      items.push({
        key: `${kind}-${li}-${i}`,
        kind,
        x: Math.round(((i + r() * 0.8) / L.count) * 100 - 12),
        w: Math.round(between(r, L.w)),
        dur,
        delay: -r() * dur, // já começa com o céu "povoado"
        op: L.op,
        amp: Math.round(between(r, L.amp)),
        sdur: 2.6 + r() * 2.4,
        sdelay: -r() * 4,
        rot: kind === 'balloon' ? 4 + r() * 5 : 0.6,
        z: L.z,
        color: colors ? colors[Math.floor(r() * colors.length)] : null,
      })
    }
  })
  return items
}

export function CloudShape({ width, className = '' }) {
  return (
    <svg viewBox="0 0 220 120" width={width} height={(width * 120) / 220} className={className} aria-hidden>
      <g fill="url(#festify-cloud-grad)">
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

export function BalloonShape({ width, color }) {
  return (
    <svg viewBox="0 0 60 122" width={width} height={(width * 122) / 60} aria-hidden>
      <path d="M30 3C14 3 3 17 3 34c0 21 17 37 27 41 10-4 27-20 27-41C57 17 46 3 30 3Z" fill={color} />
      <path d="M30 3C14 3 3 17 3 34c0 21 17 37 27 41 10-4 27-20 27-41C57 17 46 3 30 3Z" fill="url(#festify-balloon-shade)" />
      <ellipse cx="19" cy="22" rx="6" ry="11" fill="#fff" opacity=".45" transform="rotate(-24 19 22)" />
      <path d="M25.5 74.5h9L30 81Z" fill={color} />
      <path d="M30 81c-6 10 6 18 0 27s5 10 1 14" fill="none" stroke="rgba(71,85,105,.55)" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}

/** Gradientes usados pelas nuvens e balões (uma vez por página) */
export function SkyDefs() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden focusable="false">
      <defs>
        <linearGradient id="festify-cloud-grad" x1="0" y1="10" x2="0" y2="112" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset=".62" stopColor="#ffffff" />
          <stop offset="1" stopColor="#dbe9f8" />
        </linearGradient>
        <radialGradient id="festify-balloon-shade" cx=".35" cy=".3" r=".8">
          <stop offset=".55" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity=".18" />
        </radialGradient>
      </defs>
    </svg>
  )
}

/**
 * variant="sky"  → céu azul ensolarado com nuvens + balões (tela do envelope)
 * variant="soft" → só alguns balões discretos (fundo da página do convite)
 */
function Sky({ variant = 'sky', balloonColors, className = '' }) {
  const items = useMemo(() => {
    if (variant === 'soft') {
      return build(
        [
          { count: 3, w: [20, 26], dur: [26, 32], op: 0.4, amp: [14, 20], z: 1 },
          { count: 2, w: [30, 36], dur: [20, 24], op: 0.5, amp: [18, 26], z: 1 },
        ],
        7,
        'balloon',
        balloonColors
      )
    }
    return [...build(CLOUD_LAYERS, 11, 'cloud'), ...build(BALLOON_LAYERS, 29, 'balloon', balloonColors)]
  }, [variant, balloonColors])

  return (
    <div aria-hidden className={`${variant === 'sky' ? 'sky' : 'sky-soft'} ${className}`}>
      <SkyDefs />
      {variant === 'sky' && <div className="sky-sun" />}
      {items.map((it) => (
        <div
          key={it.key}
          className="sky-item"
          style={{
            left: `${it.x}%`,
            zIndex: it.z,
            '--dur': `${it.dur}s`,
            '--delay': `${it.delay}s`,
            '--op': it.op,
          }}
        >
          <div className="sky-sway" style={{ '--amp': `${it.amp}px`, '--sdur': `${it.sdur}s`, '--sdelay': `${it.sdelay}s`, '--rot': `${it.rot}deg` }}>
            {it.kind === 'cloud' ? <CloudShape width={it.w} /> : <BalloonShape width={it.w} color={it.color} />}
          </div>
        </div>
      ))}
    </div>
  )
}

export default memo(Sky)
