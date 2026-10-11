import { useEffect, useState } from 'react'
import { ArrowLeft, Images, MessageCircle, Pencil, PlayCircle, Share2, WandSparkles } from 'lucide-react'
import { useIsOwner, usePublicBuffet, useThemeRecord } from '../hooks/useData'
import { goAdmin, navigate } from '../hooks/useRoute'
import { copyText } from '../lib/utils'
import { useToast } from '../components/ui/Toast'
import InvitePreview from '../components/InvitePreview'
import LibraryShell, { PublicMessage, PublicSpinner } from './LibraryShell'
import Lightbox from './Lightbox'
import { genderOf, goLibrary, requestInviteLink, sampleParty, themeCover, themePageUrl, themeThumb } from './themeHelpers'

export default function ThemePage({ handle, slug }) {
  const { buffet, settings, loading: loadingBuffet } = usePublicBuffet(handle)
  const { theme, loading } = useThemeRecord({ slug, buffetId: buffet?.id, wait: !buffet })
  const isOwner = useIsOwner(buffet?.id)
  const toast = useToast()
  const [photoIndex, setPhotoIndex] = useState(null)

  useEffect(() => {
    if (theme) document.title = `Tema ${theme.name} · ${settings.buffetName || 'Festify'}`
  }, [theme, settings.buffetName])

  if (loadingBuffet || (buffet && loading)) return <PublicSpinner />
  if (!buffet || (buffet.status !== 'active' && !isOwner)) {
    return <PublicMessage title="Página não encontrada" text="Confira se o link está completo." />
  }

  if (!theme || theme.buffetId !== buffet.id || (theme.active === false && !isOwner)) {
    return (
      <LibraryShell settings={settings} isOwner={isOwner}>
        <div className="mx-auto max-w-md px-4 py-20 text-center">
          <div className="text-5xl">🎈</div>
          <h1 className="mt-3 font-display text-2xl font-extrabold">Tema não encontrado</h1>
          <p className="mt-1 text-slate-500">Ele pode ter sido removido. Veja os outros temas disponíveis.</p>
          <button onClick={() => goLibrary(handle)} className="btn-primary mt-6">
            Ver todos os temas
          </button>
        </div>
      </LibraryShell>
    )
  }

  const g = genderOf(theme)
  const photos = theme.photos || []
  const cover = themeCover(theme)

  const share = async () => {
    const url = themePageUrl(handle, theme.slug)
    if (navigator.share) {
      try {
        await navigator.share({ title: `Tema ${theme.name}`, url })
        return
      } catch {
        /* cancelado → copia */
      }
    }
    const ok = await copyText(url)
    toast(ok ? 'Link do tema copiado!' : 'Não foi possível copiar', ok ? 'success' : 'error')
  }

  const requestInvite = () => {
    if (!settings.whatsapp) {
      toast(isOwner ? 'Cadastre o WhatsApp do buffet em Painel → Ajustes' : 'WhatsApp do buffet ainda não configurado', 'info', 4000)
      return
    }
    window.open(requestInviteLink(theme, settings), '_blank', 'noopener')
  }

  return (
    <LibraryShell settings={settings} isOwner={isOwner} bottomPadding>
      <div className="mx-auto max-w-5xl px-4 pt-4">
        <div className="flex items-center justify-between">
          <button onClick={() => goLibrary(handle)} className="btn-ghost -ml-3 text-slate-600">
            <ArrowLeft className="h-4 w-4" /> Todos os temas
          </button>
          <button onClick={share} className="btn-ghost -mr-3 text-slate-600">
            <Share2 className="h-4 w-4" /> Compartilhar
          </button>
        </div>

        <div className="mt-2 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-10">
          <div className="min-w-0">
            {/* Capa */}
            <button
              onClick={() => photos.length && setPhotoIndex(theme.coverIndex || 0)}
              className="relative block aspect-[4/3] w-full overflow-hidden rounded-3xl bg-brand-50 shadow-soft"
            >
              {cover ? <img src={cover} alt={theme.name} className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center text-7xl">{theme.emoji || '🎉'}</div>}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/0" />
              <div className="absolute inset-x-0 bottom-0 p-5 text-left text-white">
                <span className="chip bg-white/90 text-slate-800">
                  {g.emoji} {g.label}
                </span>
                <h1 className="mt-2 font-display text-[2rem] font-extrabold leading-none tracking-tight drop-shadow sm:text-4xl">
                  {theme.emoji ? `${theme.emoji} ` : ''}
                  {theme.name}
                </h1>
              </div>
              {photos.length > 1 && (
                <span className="chip absolute right-3 top-3 bg-black/45 text-white backdrop-blur">
                  <Images className="h-3.5 w-3.5" /> {photos.length} fotos
                </span>
              )}
            </button>

            {theme.description && <p className="mt-4 text-[1.02rem] leading-relaxed text-slate-600">{theme.description}</p>}
            {theme.tags?.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {theme.tags.map((tag) => (
                  <span key={tag} className="chip bg-white text-slate-600 ring-1 ring-brand-100">
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            {/* Ações exclusivas do administrador do buffet */}
            {isOwner && (
              <div className="mt-5 rounded-2xl border border-dashed border-amber-300 bg-amber-50 p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-amber-700">Somente administrador</p>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <button onClick={() => goAdmin({ view: 'new', theme: theme.id })} className="btn-primary">
                    <WandSparkles className="h-4 w-4" /> Gerar convite online
                  </button>
                  <button onClick={() => goAdmin({ view: 'theme', id: theme.id })} className="btn-secondary">
                    <Pencil className="h-4 w-4" /> Editar tema
                  </button>
                </div>
              </div>
            )}

            {/* Galeria */}
            {photos.length > 0 && (
              <section className="mt-8">
                <h2 className="font-display text-xl font-extrabold">Fotos do tema</h2>
                <p className="text-sm text-slate-500">Toque em uma foto para ampliar.</p>
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
                  {photos.map((src, i) => (
                    <button
                      key={src.slice(-40) + i}
                      onClick={() => setPhotoIndex(i)}
                      className={`group relative overflow-hidden rounded-2xl bg-brand-50 ${i === 0 && photos.length % 2 === 1 ? 'col-span-2 aspect-[16/9] sm:col-span-1 sm:aspect-square' : 'aspect-square'}`}
                    >
                      <img src={themeThumb(theme, i)} alt={`${theme.name} — foto ${i + 1}`} loading="lazy" decoding="async" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                    </button>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Miniatura do convite */}
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <h2 className="font-display text-xl font-extrabold">Como fica o convite</h2>
            <p className="mb-4 text-sm text-slate-500">Convite digital animado com confirmação de presença.</p>
            <InvitePreview party={sampleParty(theme, settings)} caption={`Convite ${g.label.toLowerCase()} · ${theme.name}`} />
            <button onClick={() => navigate({ b: handle, tema: theme.slug, demo: '1' })} className="btn-secondary mx-auto mt-4 flex w-full max-w-[300px]">
              <PlayCircle className="h-4 w-4" /> Ver demonstração animada
            </button>
          </aside>
        </div>
      </div>

      {/* Botão fixo */}
      <div className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-brand-100/70 bg-white/92 px-4 pt-3 backdrop-blur-xl">
        <div className="mx-auto max-w-5xl">
          <button onClick={requestInvite} className="btn-whatsapp w-full py-3.5 text-base shadow-lg shadow-emerald-500/30">
            <MessageCircle className="h-5 w-5" /> Pedir convite online
          </button>
          <p className="mt-1.5 text-center text-[0.7rem] text-slate-400">Você será direcionado ao WhatsApp do buffet</p>
        </div>
      </div>

      {photoIndex != null && <Lightbox photos={photos} index={photoIndex} onIndex={setPhotoIndex} onClose={() => setPhotoIndex(null)} title={theme.name} />}
    </LibraryShell>
  )
}
