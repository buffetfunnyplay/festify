import { useEffect, useState } from 'react'
import { Check, Copy, ExternalLink, ImagePlus, Loader2, MessageCircle, Share2, Trash2 } from 'lucide-react'
import { repo, isDemo } from '../services/repository'
import { refreshAccount, useSettings } from '../hooks/useData'
import { navigate } from '../hooks/useRoute'
import { compressImage, copyText, hasPublicUrl, normalizeWhatsApp, whatsappLink, NO_PUBLIC_URL_MSG } from '../lib/utils'
import { shareText } from '../lib/native'
import { libraryUrl } from '../library/themeHelpers'
import { useToast } from '../components/ui/Toast'

const EMPTY = { buffetName: '', whatsapp: '', address: '', mapsUrl: '', logo: '', bannerImage: '', bannerTitle: '', bannerText: '' }

function ImagePick({ value, onPick, onClear, busy, className, label, children }) {
  return (
    <label className={`relative grid cursor-pointer place-items-center overflow-hidden border-2 border-dashed border-slate-200 bg-slate-50 hover:border-brand-300 dark:border-white/10 dark:bg-white/5 ${className}`}>
      {busy ? <Loader2 className="h-6 w-6 animate-spin text-brand-500" /> : value ? <img src={value} alt={label} className="h-full w-full object-cover" /> : children}
      <input
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          onPick(e.target.files?.[0])
          e.target.value = ''
        }}
      />
      {value && onClear && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault()
            onClear()
          }}
          className="absolute right-1.5 top-1.5 grid h-7 w-7 place-items-center rounded-full bg-white/90 text-rose-500 shadow"
          aria-label={`Remover ${label}`}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}
    </label>
  )
}

export default function SettingsAdmin() {
  const toast = useToast()
  const { settings, loading } = useSettings()
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState('')

  useEffect(() => {
    if (!loading) setForm({ ...EMPTY, ...settings })
  }, [loading]) // eslint-disable-line react-hooks/exhaustive-deps

  const bind = (k) => ({ value: form[k] || '', onChange: (e) => setForm((f) => ({ ...f, [k]: e.target.value })) })
  const digits = normalizeWhatsApp(form.whatsapp)
  const waValid = !form.whatsapp || (digits.length >= 12 && digits.length <= 13)
  const url = libraryUrl(settings.handle)

  const save = async (e) => {
    e.preventDefault()
    if (form.buffetName.trim().length < 2) return toast('Informe o nome do buffet', 'error')
    if (!waValid) return toast('WhatsApp inválido — use DDD + número', 'error')
    if (form.mapsUrl.trim() && !/^https?:\/\/\S+$/i.test(form.mapsUrl.trim())) return toast('Link do Maps inválido (comece com https://)', 'error')
    setSaving(true)
    try {
      const saved = await repo.saveSettings({ ...form, buffetName: form.buffetName.trim(), mapsUrl: form.mapsUrl.trim() })
      setForm((f) => ({ ...f, ...saved }))
      refreshAccount()
      toast('Ajustes salvos!')
    } catch (err) {
      toast(err.message, 'error', 4500)
    } finally {
      setSaving(false)
    }
  }

  const pick = (key, maxSide, quality) => async (file) => {
    if (!file) return
    setUploading(key)
    try {
      const data = await compressImage(file, maxSide, quality)
      setForm((f) => ({ ...f, [key]: data })) // enviado ao salvar
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setUploading('')
    }
  }

  const copyLibrary = async () => {
    if (!hasPublicUrl()) return toast(NO_PUBLIC_URL_MSG, 'info', 5000)
    const ok = await copyText(url)
    toast(ok ? 'Link da biblioteca copiado!' : 'Não foi possível copiar', ok ? 'success' : 'error')
  }
  const shareLibrary = async () => {
    if (!hasPublicUrl()) return toast(NO_PUBLIC_URL_MSG, 'info', 5000)
    const text = `Escolha o tema da sua festa no ${settings.buffetName || 'nosso buffet'} 🎈\n${url}`
    try {
      if (navigator.share) await navigator.share({ title: 'Temas de festa', text })
      else await shareText(text)
    } catch {
      /* cancelado */
    }
  }

  if (loading) {
    return (
      <div className="grid place-items-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl">
      <p className="text-sm font-semibold text-brand-600 dark:text-brand-300">Painel do buffet</p>
      <h1 className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">Ajustes</h1>
      <p className="mt-1 text-slate-500 dark:text-slate-400">O visual e os dados do seu buffet na biblioteca e nos convites.</p>

      {/* Link público */}
      <div className="card mt-6 p-4">
        <p className="font-semibold">Link da sua biblioteca de temas</p>
        <p className="mt-0.5 break-all text-sm text-brand-700 dark:text-brand-300">{hasPublicUrl() ? url : `?b=${settings.handle}`}</p>
        <p className="hint">Divulgue no Instagram, WhatsApp e na bio. Esse endereço não muda mesmo se você trocar o nome.</p>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <button onClick={copyLibrary} className="btn-primary px-2">
            <Copy className="h-4 w-4" /> Copiar
          </button>
          <button onClick={shareLibrary} className="btn-secondary px-2">
            <Share2 className="h-4 w-4" /> Enviar
          </button>
          <button onClick={() => navigate({ b: settings.handle })} className="btn-secondary px-2">
            <ExternalLink className="h-4 w-4" /> Abrir
          </button>
        </div>
      </div>

      <form onSubmit={save} className="mt-4 space-y-4">
        {/* Identidade */}
        <section className="card space-y-5 p-5 sm:p-6">
          <h2 className="font-bold">Identidade do buffet</h2>
          <div className="flex items-center gap-4">
            <ImagePick
              value={form.logo}
              label="logo"
              busy={uploading === 'logo'}
              onPick={pick('logo', 400, 0.86)}
              onClear={() => setForm((f) => ({ ...f, logo: '' }))}
              className="h-20 w-20 shrink-0 rounded-2xl"
            >
              <ImagePlus className="h-6 w-6 text-slate-400" />
            </ImagePick>
            <div className="text-sm">
              <p className="font-semibold">Logo</p>
              <p className="text-slate-500 dark:text-slate-400">Quadrada. Aparece no topo da biblioteca e do painel.</p>
            </div>
          </div>
          <div>
            <label className="label">Nome do buffet</label>
            <input className="input" placeholder="Ex.: Buffet Magia & Farra" maxLength={80} {...bind('buffetName')} />
          </div>
        </section>

        {/* Banner */}
        <section className="card space-y-4 p-5 sm:p-6">
          <div>
            <h2 className="font-bold">Banner da biblioteca</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">A faixa grande do topo da biblioteca. A imagem é opcional (sem ela, fica o azul padrão).</p>
          </div>
          <ImagePick
            value={form.bannerImage}
            label="imagem do banner"
            busy={uploading === 'bannerImage'}
            onPick={pick('bannerImage', 1600, 0.82)}
            onClear={() => setForm((f) => ({ ...f, bannerImage: '' }))}
            className="aspect-[16/7] w-full rounded-2xl"
          >
            <span className="flex flex-col items-center gap-1 text-sm font-semibold text-slate-500">
              <ImagePlus className="h-7 w-7 text-slate-400" /> Escolher imagem do banner
              <span className="text-xs font-normal">De preferência deitada (horizontal)</span>
            </span>
          </ImagePick>
          <div>
            <label className="label">Título do banner</label>
            <input className="input" placeholder="Escolha o tema da sua festa 🎈" maxLength={70} {...bind('bannerTitle')} />
          </div>
          <div>
            <label className="label">
              Texto do banner <span className="font-normal text-slate-400">(opcional)</span>
            </label>
            <textarea className="input min-h-[70px]" maxLength={160} placeholder="Veja as fotos, escolha o seu favorito e peça o convite online." {...bind('bannerText')} />
          </div>

          {/* Prévia */}
          <div className="overflow-hidden rounded-2xl ring-1 ring-black/5">
            <div className="relative bg-gradient-to-br from-brand-500 to-brand-700 px-4 pb-5 pt-10 text-white">
              {form.bannerImage && (
                <>
                  <img src={form.bannerImage} alt="" className="absolute inset-0 h-full w-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/30 to-black/10" />
                </>
              )}
              <p className="relative text-[0.65rem] font-bold uppercase tracking-wider text-white/80">Prévia</p>
              <p className="relative font-display text-xl font-extrabold leading-tight">{form.bannerTitle || 'Escolha o tema da sua festa 🎈'}</p>
              <p className="relative mt-1 text-sm text-white/90">{form.bannerText || 'Veja as fotos, escolha o seu favorito e peça o convite online.'}</p>
            </div>
          </div>
        </section>

        {/* Contato */}
        <section className="card space-y-5 p-5 sm:p-6">
          <h2 className="font-bold">Contato e endereço</h2>
          <div className="rounded-2xl bg-emerald-50 p-4 ring-1 ring-emerald-100 dark:bg-emerald-500/10 dark:ring-emerald-400/20">
            <label className="label flex items-center gap-1.5 text-emerald-800 dark:text-emerald-200">
              <MessageCircle className="h-4 w-4" /> WhatsApp do buffet
            </label>
            <input className={`input ${waValid ? '' : 'input-error'}`} inputMode="tel" placeholder="(11) 91234-5678" {...bind('whatsapp')} />
            <p className="hint">
              Para onde vão os pedidos do botão <b>“Pedir convite online”</b>. Use DDD + número.
            </p>
            {form.whatsapp && waValid && (
              <a
                href={whatsappLink(form.whatsapp, 'Teste do Festify ✅')}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-emerald-700 hover:underline dark:text-emerald-300"
              >
                <Check className="h-4 w-4" /> Testar número (+{digits})
              </a>
            )}
          </div>
          <div>
            <label className="label">Endereço do buffet</label>
            <textarea className="input min-h-[72px]" placeholder="Rua, número, bairro, cidade - UF" {...bind('address')} />
            <p className="hint">Já vem preenchido nos convites novos.</p>
          </div>
          <div>
            <label className="label">
              Link do Google Maps <span className="font-normal text-slate-400">(opcional)</span>
            </label>
            <input className="input" type="url" inputMode="url" placeholder="https://maps.app.goo.gl/..." {...bind('mapsUrl')} />
          </div>
        </section>

        <div className="pb-safe sticky bottom-20 z-10 lg:bottom-4">
          <button type="submit" disabled={saving || Boolean(uploading)} className="btn-primary w-full py-3 shadow-xl">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Salvar ajustes
          </button>
        </div>
      </form>

      {isDemo && (
        <p className="mt-4 rounded-2xl bg-amber-50 p-4 text-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">
          <b>Modo demonstração:</b> tudo fica salvo só neste aparelho e as confirmações dos convidados não chegam aqui. Conecte o Supabase para usar de verdade
          (veja o tutorial).
        </p>
      )}
    </div>
  )
}
