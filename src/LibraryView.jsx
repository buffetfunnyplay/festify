import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Images, MessageCircle, Plus, Search, X } from 'lucide-react'
import { useIsOwner, usePublicBuffet, useThemes } from '../hooks/useData'
import { goAdmin, navigate } from '../hooks/useRoute'
import { whatsappLink } from '../lib/utils'
import LibraryShell, { PublicMessage, PublicSpinner } from './LibraryShell'
import CloudIntro from './CloudIntro'
import { genderOf, matchesGender, matchesSearch, themeThumb } from './themeHelpers'

const FILTERS = [
  { id: 'todos', label: 'Todos', emoji: '✨' },
  { id: 'menina', label: 'Menina', emoji: '👧' },
  { id: 'menino', label: 'Menino', emoji: '👦' },
]
const PAGE = 24

// Lembra busca/filtro ao voltar da página de um tema (por buffet)
const filtersKey = (h) => `festify:library-filters:${h}`
const introKey = (h) => `festify:intro-seen:${h}`
const session = {
  get(k) {
    try {
      return JSON.parse(sessionStorage.getItem(k))
    } catch {
      return null
    }
  },
  set(k, v) {
    try {
      sessionStorage.setItem(k, JSON.stringify(v))
    } catch {
      /* navegação anônima: ignora */
    }
  },
}

export default function LibraryView({ handle }) {
  const { buffet, settings, loading } = usePublicBuffet(handle)
  const isOwner = useIsOwner(buffet?.id)
  const live = buffet && (buffet.status === 'active' || isOwner)

  const [intro, setIntro] = useState(() => {
    const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    return !reduce && !session.get(introKey(handle))
  })
  const endIntro = useCallback(() => {
    session.set(introKey(handle), 1)
    setIntro(false)
  }, [handle])

  if (!loading && !live) {
    return (
      <PublicMessage
        title="Biblioteca não encontrada"
        text="Confira se o link está completo ou fale com o buffet."
      />
    )
  }

  return (
    <>
      {loading ? <PublicSpinner /> : <Library buffet={buffet} settings={settings} isOwner={isOwner} />}
      {intro && <CloudIntro logo={settings.logo} onDone={endIntro} />}
    </>
  )
}

function Library({ buffet, settings, isOwner }) {
  const handle = buffet.handle
  const { themes, loading } = useThemes(buffet.id)
  const saved = session.get(filtersKey(handle)) || {}
  const [query, setQuery] = useState(saved.query || '')
  const [gender, setGender] = useState(saved.gender || 'todos')
  const [limit, setLimit] = useState(Math.max(PAGE, saved.limit || PAGE))
  const sentinel = useRef()

  useEffect(() => {
    document.title = `${settings.buffetName || 'Festify'} · Temas de festa`
  }, [settings.buffetName])

  useEffect(() => {
    session.set(filtersKey(handle), { query, gender, limit })
  }, [handle, query, gender, limit])

  const visible = useMemo(() => themes.filter((t) => t.active !== false || isOwner), [themes, isOwner])
  const filtered = useMemo(() => visible.filter((t) => matchesGender(t, gender) && matchesSearch(t, query)), [visible, gender, query])
  const count = (g) => visible.filter((t) => matchesGender(t, g) && matchesSearch(t, query)).length
  const shown = filtered.slice(0, limit)
  const rest = filtered.length - shown.length

  // Carrega mais temas sozinho ao chegar no fim da lista
  useEffect(() => {
    const el = sentinel.current
    if (!el || rest <= 0 || !('IntersectionObserver' in window)) return
    const io = new IntersectionObserver((entries) => entries[0].isIntersecting && setLimit((l) => l + PAGE), { rootMargin: '600px' })
    io.observe(el)
    return () => io.disconnect()
  }, [rest])

  const changeQuery = (v) => {
    setQuery(v)
    setLimit(PAGE)
  }
  const changeGender = (g) => {
    setGender(g)
    setLimit(PAGE)
  }

  const bannerTitle = settings.bannerTitle || 'Escolha o tema da sua festa 🎈'
  const bannerText = settings.bannerText || settings.tagline || 'Veja as fotos, escolha o seu favorito e peça o convite online.'

  return (
    <LibraryShell settings={settings} isOwner={isOwner}>
      {/* Banner personalizado do buffet (imagem + textos) */}
      <section className="relative overflow-hidden bg-gradient-to-br from-brand-500 via-brand-500 to-brand-700 text-white">
        {settings.bannerImage ? (
          <>
            <img src={settings.bannerImage} alt="" className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/30 to-black/10" />
          </>
        ) : (
          <div aria-hidden className="pointer-events-none absolute inset-0 opacity-30">
            <span className="float-y absolute left-[6%] top-6 text-4xl">🎈</span>
            <span className="float-y absolute right-[8%] top-10 text-3xl" style={{ animationDelay: '1s' }}>
              🎉
            </span>
            <span className="float-y absolute bottom-6 left-[40%] text-2xl" style={{ animationDelay: '2s' }}>
              ☁️
            </span>
          </div>
        )}
        <div className={`relative mx-auto max-w-5xl px-4 pb-8 sm:pb-10 ${settings.bannerImage ? 'pt-24 sm:pt-36' : 'pt-8 sm:pt-12'}`}>
          <h1 className="font-display text-[2rem] font-extrabold leading-[1.1] tracking-tight drop-shadow-sm sm:text-5xl">{bannerTitle}</h1>
          {bannerText && <p className="mt-2 max-w-xl text-[0.98rem] text-white/90 drop-shadow-sm">{bannerText}</p>}

          <div className="relative mt-5 max-w-xl">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={query}
              onChange={(e) => changeQuery(e.target.value)}
              placeholder="Ex.: dinossauro, sereia…"
              className="w-full rounded-2xl border-0 bg-white py-3.5 pl-12 pr-11 text-slate-900 shadow-xl outline-none ring-4 ring-white/25 placeholder:text-slate-400 focus:ring-white/60"
              aria-label="Buscar tema"
            />
            {query && (
              <button onClick={() => changeQuery('')} className="absolute right-3 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full bg-slate-100 text-slate-500" aria-label="Limpar busca">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Filtros */}
      <div className={`sticky z-20 border-b border-brand-100/70 bg-[#f5f9ff]/92 backdrop-blur ${isOwner ? 'top-[5.75rem]' : 'top-16'}`}>
        <div className="mx-auto flex max-w-5xl gap-2 overflow-x-auto px-4 py-3">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => changeGender(f.id)}
              aria-pressed={gender === f.id}
              className={`flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition ${
                gender === f.id ? 'bg-brand-600 text-white shadow-glow' : 'bg-white text-slate-600 ring-1 ring-brand-100 hover:bg-brand-50'
              }`}
            >
              <span>{f.emoji}</span> {f.label}
              <span className={`rounded-full px-1.5 text-xs ${gender === f.id ? 'bg-white/20' : 'bg-brand-50 text-brand-700'}`}>{count(f.id)}</span>
            </button>
          ))}
        </div>
      </div>

      <section className="mx-auto max-w-5xl px-4 pt-5">
        {isOwner && (
          <button onClick={() => goAdmin({ view: 'theme', id: 'new' })} className="btn-primary mb-4 w-full sm:w-auto">
            <Plus className="h-4 w-4" /> Adicionar tema
          </button>
        )}

        {loading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="aspect-[4/5] animate-pulse rounded-2xl bg-brand-100/60" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-3xl bg-white px-6 py-12 text-center shadow-soft ring-1 ring-black/5">
            <div className="text-5xl">🔎</div>
            <p className="mt-3 text-lg font-bold">{visible.length ? 'Nenhum tema encontrado' : 'Biblioteca em montagem'}</p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
              {visible.length ? (query ? `Não achamos temas para “${query}”. Fale com a gente que montamos o seu!` : 'Tente outro filtro.') : 'Em breve novos temas por aqui.'}
            </p>
            {settings.whatsapp && (
              <a
                href={whatsappLink(settings.whatsapp, `Olá! Procuro um tema de ${query || 'festa'}. Vocês têm? 🎉`)}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-whatsapp mt-5"
              >
                <MessageCircle className="h-4 w-4" /> Pedir tema no WhatsApp
              </a>
            )}
          </div>
        ) : (
          <>
            <p className="mb-3 text-sm text-slate-500">
              {filtered.length} {filtered.length === 1 ? 'tema' : 'temas'}
              {query && <> para “{query}”</>}
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
              {shown.map((t) => (
                <ThemeCard key={t.id} theme={t} handle={handle} />
              ))}
            </div>
            {rest > 0 && (
              <div ref={sentinel} className="mt-6 text-center">
                <button onClick={() => setLimit((l) => l + PAGE)} className="btn-secondary">
                  Ver mais temas ({rest})
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </LibraryShell>
  )
}

function ThemeCard({ theme, handle }) {
  const g = genderOf(theme)
  const cover = themeThumb(theme)
  return (
    <button
      onClick={() => navigate({ b: handle, tema: theme.slug })}
      className="group overflow-hidden rounded-2xl bg-white text-left shadow-soft ring-1 ring-black/5 transition duration-300 hover:-translate-y-0.5 hover:shadow-xl active:scale-[0.98]"
    >
      <div className="relative aspect-[4/5] overflow-hidden bg-brand-50">
        {cover ? (
          <img src={cover} alt={theme.name} loading="lazy" decoding="async" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
        ) : (
          <div className="grid h-full place-items-center text-5xl">{theme.emoji || '🎉'}</div>
        )}
        <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/50 to-transparent" />
        <span className="chip absolute left-2 top-2 bg-white/90 text-slate-700 shadow-sm">
          {g.emoji} {g.label}
        </span>
        {theme.active === false && <span className="chip absolute right-2 top-2 bg-slate-900 text-white">Oculto</span>}
        <span className="chip absolute bottom-2 right-2 bg-black/40 text-white backdrop-blur">
          <Images className="h-3 w-3" /> {theme.photos?.length || 0}
        </span>
      </div>
      <div className="p-3">
        <p className="font-display font-bold leading-tight">
          {theme.emoji ? `${theme.emoji} ` : ''}
          {theme.name}
        </p>
        {theme.tags?.length > 0 && <p className="mt-0.5 line-clamp-1 text-xs text-slate-500">{theme.tags.slice(0, 3).join(' · ')}</p>}
      </div>
    </button>
  )
}
