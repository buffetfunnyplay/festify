import { useEffect, useRef, useState } from 'react'
import {
  ArrowLeft,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  ExternalLink,
  Eye,
  Gift,
  ImagePlus,
  Loader2,
  Lock,
  MapPin,
  Palette,
  PartyPopper,
  Send,
  Trash2,
} from 'lucide-react'
import { repo } from '../services/repository'
import { goAdmin, navigate } from '../hooks/useRoute'
import { useSettings } from '../hooks/useData'
import { themeCover } from '../library/themeHelpers'
import { copyClientLink } from './clientLink'
import { DESIGN_LIST } from '../lib/designs'
import { NO_PUBLIC_URL_MSG, PIX_TYPES, compressImage, copyText, detectPixType, hasPublicUrl, mapsHref, publicInviteUrl, slugify, validatePixKey } from '../lib/utils'
import { sendWhatsApp } from '../lib/native'
import { useToast } from '../components/ui/Toast'
import Modal from '../components/ui/Modal'
import InvitePreview from '../components/InvitePreview'

const EMPTY = {
  title: '',
  message: '',
  date: '',
  time: '',
  coverImage: '',
  slug: '',
  venueName: '',
  address: '',
  mapsUrl: '',
  pixEnabled: false,
  pixType: 'cpf',
  pixKey: '',
  pixHolder: '',
  gender: 'unissex',
  themeId: null,
  themeName: '',
}

const STEPS = [
  { id: 'event', label: 'Evento', icon: PartyPopper },
  { id: 'place', label: 'Local', icon: MapPin },
  { id: 'pix', label: 'Presente', icon: Gift },
  { id: 'theme', label: 'Visual', icon: Palette },
]

const todayISO = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function Field({ label, hint, error, children, optional }) {
  return (
    <div>
      {label && (
        <label className="label">
          {label} {optional && <span className="font-normal text-slate-400">(opcional)</span>}
        </label>
      )}
      {children}
      {error ? <p className="mt-1.5 text-xs font-semibold text-rose-500">{error}</p> : hint && <p className="hint">{hint}</p>}
    </div>
  )
}

export default function PartyForm({ partyId, themeId }) {
  const toast = useToast()
  const isEdit = Boolean(partyId)
  const { settings, loading: loadingSettings } = useSettings()
  const [libTheme, setLibTheme] = useState(null) // tema da biblioteca usado neste convite
  const [coverSource, setCoverSource] = useState('library')
  const [form, setForm] = useState(EMPTY)
  const [slugTouched, setSlugTouched] = useState(false)
  const [step, setStep] = useState(0)
  const [maxStep, setMaxStep] = useState(isEdit ? STEPS.length - 1 : 0)
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [saved, setSaved] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const fileRef = useRef()

  useEffect(() => {
    if (!isEdit) return
    repo.getParty(partyId).then((p) => {
      if (!p) {
        toast('Festa não encontrada', 'error')
        goAdmin({}, { replace: true })
        return
      }
      // eslint-disable-next-line no-unused-vars
      const { buffet, ...data } = p
      setForm({ ...EMPTY, ...data, gender: data.gender || 'unissex' })
      setSlugTouched(true)
      setLoading(false)
      if (p.themeId) {
        repo.getTheme(p.themeId).then((t) => {
          if (!t) return
          setLibTheme(t)
          setCoverSource(!p.coverImage || t.photos?.includes(p.coverImage) ? 'library' : 'phone')
        })
      } else setCoverSource('phone')
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partyId])

  // Convite gerado a partir de um tema da biblioteca: já vem com capa e estilo do tema
  useEffect(() => {
    if (isEdit || !themeId) {
      if (!isEdit) setCoverSource('phone')
      return
    }
    repo.getTheme(themeId).then((t) => {
      if (!t) return setCoverSource('phone')
      setLibTheme(t)
      setCoverSource('library')
      setForm((f) => ({ ...f, themeId: t.id, themeName: t.name, gender: t.gender || f.gender, coverImage: f.coverImage || themeCover(t) }))
    })
  }, [themeId, isEdit])

  // Convite novo: local padrão = endereço do buffet (Ajustes)
  useEffect(() => {
    if (isEdit || loadingSettings) return
    setForm((f) => ({
      ...f,
      venueName: f.venueName || settings.buffetName || '',
      address: f.address || settings.address || '',
      mapsUrl: f.mapsUrl || settings.mapsUrl || '',
    }))
  }, [isEdit, loadingSettings]) // eslint-disable-line react-hooks/exhaustive-deps

  const set = (key, value) => {
    setForm((f) => {
      const next = { ...f, [key]: value }
      if (key === 'title' && !slugTouched) next.slug = slugify(value)
      return next
    })
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }))
  }

  const bind = (key) => ({
    value: form[key] ?? '',
    onChange: (e) => set(key, e.target.value),
  })

  // ── Upload de capa ──
  const handleFile = async (file) => {
    if (!file) return
    setUploading(true)
    try {
      set('coverImage', await compressImage(file))
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setUploading(false)
    }
  }

  // ── Validação por etapa ──
  async function validate(i) {
    const e = {}
    if (i === 0) {
      if (form.title.trim().length < 3) e.title = 'Dê um título para a festa'
      if (!form.date) e.date = 'Escolha a data'
      else if (!isEdit && form.date < todayISO()) e.date = 'A data já passou'
      if (!form.time) e.time = 'Escolha o horário'
      const slug = slugify(form.slug)
      if (!slug) e.slug = 'Defina o link do convite'
      else if (!(await repo.isSlugAvailable(slug, form.id))) e.slug = 'Esse link já está em uso. Tente outro.'
    }
    if (i === 1) {
      if (!form.venueName.trim()) e.venueName = 'Informe o nome do local'
      if (!form.address.trim()) e.address = 'Informe o endereço completo'
      if (form.mapsUrl.trim() && !/^https?:\/\/\S+$/i.test(form.mapsUrl.trim()))
        e.mapsUrl = 'Cole um link válido começando com https://'
    }
    if (i === 2 && form.pixEnabled) {
      const pixErr = validatePixKey(form.pixType, form.pixKey)
      if (pixErr) e.pixKey = pixErr
      if (!form.pixHolder.trim()) e.pixHolder = 'Informe o nome do titular'
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const goTo = async (target) => {
    if (target > step) {
      for (let i = step; i < target; i++) {
        if (!(await validate(i))) {
          setStep(i)
          return
        }
      }
    }
    setStep(target)
    setMaxStep((m) => Math.max(m, target))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const save = async () => {
    for (let i = 0; i < STEPS.length; i++) {
      if (!(await validate(i))) {
        setStep(i)
        toast('Revise os campos destacados', 'error')
        return
      }
    }
    setSaving(true)
    try {
      // eslint-disable-next-line no-unused-vars
      const { pixSuggested, theme, ...data } = form
      const party = await repo.saveParty({
        ...data,
        slug: slugify(form.slug),
        title: String(form.title || '').trim(),
        venueName: String(form.venueName || '').trim(),
        address: String(form.address || '').trim(),
        mapsUrl: String(form.mapsUrl || '').trim(),
        pixKey: String(form.pixKey || '').trim(),
        pixHolder: String(form.pixHolder || '').trim(),
      })
      setSaved(party)
    } catch (err) {
      toast(err.message || 'Erro ao salvar', 'error', 4500)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="grid place-items-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
      </div>
    )
  }

  const isLast = step === STEPS.length - 1

  return (
    <div>
      <button onClick={() => goAdmin({})} className="btn-ghost -ml-3 mb-2">
        <ArrowLeft className="h-4 w-4" /> Voltar ao painel
      </button>
      <h1 className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">
        {isEdit ? 'Editar festa' : 'Criar nova festa'}
      </h1>
      <p className="mt-1 text-slate-500 dark:text-slate-400">
        {isEdit ? 'As alterações aparecem no convite assim que você salvar.' : 'Preencha em 4 passos rápidos e compartilhe o link.'}
      </p>

      {libTheme && (
        <div className="mt-4 flex items-center gap-3 rounded-2xl bg-brand-50 p-3 ring-1 ring-brand-100 dark:bg-brand-500/10 dark:ring-brand-400/20">
          <img src={themeCover(libTheme)} alt="" className="h-12 w-12 shrink-0 rounded-xl object-cover" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-brand-600 dark:text-brand-300">Tema da biblioteca</p>
            <p className="truncate font-bold">
              {libTheme.emoji} {libTheme.name}
            </p>
          </div>
          <button type="button" onClick={() => navigate({ b: settings.handle, tema: libTheme.slug })} className="btn-ghost px-2 text-xs">
            Ver tema
          </button>
        </div>
      )}

      {/* Stepper */}
      <ol className="mt-6 grid grid-cols-4 gap-2">
        {STEPS.map((s, i) => {
          const Icon = s.icon
          const active = i === step
          const done = i < step || (i <= maxStep && i !== step)
          return (
            <li key={s.id}>
              <button
                type="button"
                disabled={i > maxStep}
                onClick={() => goTo(i)}
                className={`flex w-full flex-col items-center gap-1.5 rounded-xl px-1 py-2.5 text-xs font-semibold transition sm:flex-row sm:justify-center sm:text-sm ${
                  active
                    ? 'bg-brand-600 text-white shadow-glow'
                    : done
                      ? 'bg-brand-50 text-brand-700 hover:bg-brand-100 dark:bg-brand-500/10 dark:text-brand-300'
                      : 'bg-slate-100 text-slate-400 dark:bg-white/5 dark:text-slate-500'
                }`}
              >
                {done && !active ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                {s.label}
              </button>
            </li>
          )
        })}
      </ol>

      <div className="mt-6 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <form
          className="card p-5 sm:p-7"
          onSubmit={(e) => {
            e.preventDefault()
            isLast ? save() : goTo(step + 1)
          }}
        >
          {/* ─── ETAPA 1: EVENTO ─── */}
          {step === 0 && (
            <div className="space-y-5 animate-fade-in">
              <Field label="Título da festa" error={errors.title}>
                <input
                  className={`input ${errors.title ? 'input-error' : ''}`}
                  placeholder="Ex: Aniversário de 5 Anos do Pedro"
                  maxLength={80}
                  autoFocus={!isEdit}
                  {...bind('title')}
                />
              </Field>

              <Field label="Mensagem do convite" optional hint={`${form.message.length}/240 caracteres`}>
                <textarea
                  className="input min-h-[88px] resize-y"
                  placeholder="Ex: Vai ter bolo, brigadeiro e muita diversão. Venha comemorar com a gente!"
                  maxLength={240}
                  {...bind('message')}
                />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Data" error={errors.date}>
                  <input type="date" min={isEdit ? undefined : todayISO()} className={`input ${errors.date ? 'input-error' : ''}`} {...bind('date')} />
                </Field>
                <Field label="Horário" error={errors.time}>
                  <input type="time" className={`input ${errors.time ? 'input-error' : ''}`} {...bind('time')} />
                </Field>
              </div>

              <Field
                label="Foto de capa / aniversariante"
                optional
                hint={coverSource === 'phone' && libTheme ? 'A foto do celular fica salva só neste convite — não entra na biblioteca.' : 'JPG ou PNG. A imagem é otimizada automaticamente.'}
              >
                {libTheme?.photos?.length > 0 && (
                  <div className="mb-3 grid grid-cols-2 gap-1.5 rounded-xl bg-slate-100 p-1 dark:bg-white/5">
                    {[
                      ['library', '📚 Foto da biblioteca'],
                      ['phone', '📱 Foto do celular'],
                    ].map(([id, label]) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => {
                          setCoverSource(id)
                          if (id === 'library' && !libTheme.photos.includes(form.coverImage)) set('coverImage', themeCover(libTheme))
                          if (id === 'phone' && libTheme.photos.includes(form.coverImage)) set('coverImage', '')
                        }}
                        className={`rounded-lg px-2 py-2 text-sm font-semibold transition ${
                          coverSource === id ? 'bg-white text-slate-900 shadow-sm dark:bg-white/15 dark:text-white' : 'text-slate-500'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                )}
                {coverSource === 'library' && libTheme?.photos?.length > 0 ? (
                  <div className="grid grid-cols-3 gap-2">
                    {libTheme.photos.map((src) => (
                      <button
                        key={src.slice(-48)}
                        type="button"
                        onClick={() => set('coverImage', src)}
                        className={`relative aspect-square overflow-hidden rounded-xl ring-2 transition ${form.coverImage === src ? 'ring-brand-500' : 'ring-transparent opacity-80 hover:opacity-100'}`}
                      >
                        <img src={src} alt="" className="h-full w-full object-cover" />
                        {form.coverImage === src && (
                          <span className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-brand-500 text-white shadow">
                            <Check className="h-4 w-4" />
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                ) : (
                  <>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    handleFile(e.target.files?.[0])
                    e.target.value = ''
                  }}
                />
                {form.coverImage ? (
                  <div className="relative overflow-hidden rounded-2xl ring-1 ring-slate-200 dark:ring-white/10">
                    <img src={form.coverImage} alt="Prévia da capa" className="aspect-[4/3] w-full object-cover" />
                    <div className="absolute inset-x-0 bottom-0 flex gap-2 bg-gradient-to-t from-black/60 to-transparent p-3">
                      <button type="button" onClick={() => fileRef.current?.click()} className="btn flex-1 bg-white/90 text-slate-800 hover:bg-white">
                        <ImagePlus className="h-4 w-4" /> Trocar
                      </button>
                      <button type="button" onClick={() => set('coverImage', '')} className="btn bg-rose-500/90 text-white hover:bg-rose-500">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    onDragOver={(e) => {
                      e.preventDefault()
                      setDragOver(true)
                    }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={(e) => {
                      e.preventDefault()
                      setDragOver(false)
                      handleFile(e.dataTransfer.files?.[0])
                    }}
                    className={`flex w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-4 py-8 text-center transition ${
                      dragOver
                        ? 'border-brand-400 bg-brand-50 dark:bg-brand-500/10'
                        : 'border-slate-200 hover:border-brand-300 hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/5'
                    }`}
                  >
                    {uploading ? (
                      <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
                    ) : (
                      <span className="grid h-12 w-12 place-items-center rounded-full bg-brand-100 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300">
                        <ImagePlus className="h-6 w-6" />
                      </span>
                    )}
                    <span className="text-sm font-semibold">Toque para enviar uma foto</span>
                    <span className="text-xs text-slate-500">ou arraste e solte aqui</span>
                  </button>
                )}
                  </>
                )}
              </Field>

              <Field label="Link do convite" error={errors.slug} hint="Use letras minúsculas, números e hífens.">
                <div
                  className={`flex items-center overflow-hidden rounded-xl border bg-slate-50 focus-within:border-brand-400 focus-within:ring-4 focus-within:ring-brand-500/15 dark:bg-white/5 ${
                    errors.slug ? 'border-rose-400' : 'border-slate-200 dark:border-white/10'
                  }`}
                >
                  <span className="shrink-0 pl-3.5 text-sm text-slate-400">?festa=</span>
                  <input
                    className="w-full min-w-0 bg-transparent px-1.5 py-2.5 font-medium outline-none"
                    value={form.slug}
                    placeholder="pedro-5-anos"
                    onChange={(e) => {
                      setSlugTouched(true)
                      set('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))
                    }}
                  />
                </div>
              </Field>
            </div>
          )}

          {/* ─── ETAPA 2: LOCAL ─── */}
          {step === 1 && (
            <div className="space-y-5 animate-fade-in">
              <Field label="Nome do local" error={errors.venueName}>
                <input className={`input ${errors.venueName ? 'input-error' : ''}`} placeholder="Ex: Buffet Magia & Farra" autoFocus {...bind('venueName')} />
              </Field>
              <Field label="Endereço completo" error={errors.address}>
                <textarea
                  className={`input min-h-[80px] ${errors.address ? 'input-error' : ''}`}
                  placeholder="Rua, número, bairro, cidade - UF"
                  {...bind('address')}
                />
              </Field>
              <Field
                label="Link do Google Maps ou Waze"
                optional
                error={errors.mapsUrl}
                hint="Se deixar em branco, geramos o link do Google Maps a partir do endereço."
              >
                <input className={`input ${errors.mapsUrl ? 'input-error' : ''}`} type="url" inputMode="url" placeholder="https://maps.app.goo.gl/..." {...bind('mapsUrl')} />
              </Field>
              {(form.mapsUrl || form.address) && (
                <a href={mapsHref(form)} target="_blank" rel="noreferrer" className="btn-secondary w-full sm:w-auto">
                  <ExternalLink className="h-4 w-4" /> Testar link “Como Chegar”
                </a>
              )}
            </div>
          )}

          {/* ─── ETAPA 3: PIX ─── */}
          {step === 2 && (
            <div className="space-y-5 animate-fade-in">
              <label className="flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-slate-200 p-4 dark:border-white/10">
                <span>
                  <span className="flex items-center gap-2 font-semibold">
                    <Gift className="h-5 w-5 text-brand-500" /> Receber presente via Pix
                  </span>
                  <span className="mt-0.5 block text-sm text-slate-500 dark:text-slate-400">
                    Mostra o botão “Presentear via Pix” no convite.
                  </span>
                </span>
                <span className="relative inline-flex shrink-0">
                  <input type="checkbox" className="peer sr-only" checked={form.pixEnabled} onChange={(e) => set('pixEnabled', e.target.checked)} />
                  <span className="h-7 w-12 rounded-full bg-slate-300 transition peer-checked:bg-brand-500 dark:bg-white/15" />
                  <span className="absolute left-1 top-1 h-5 w-5 rounded-full bg-white shadow transition peer-checked:translate-x-5" />
                </span>
              </label>

              {form.pixEnabled && (
                <div className="space-y-5 animate-fade-in">
                  <Field label="Tipo de chave">
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {PIX_TYPES.map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => set('pixType', t.id)}
                          className={`rounded-xl border px-3 py-2.5 text-sm font-semibold transition ${
                            form.pixType === t.id
                              ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-200'
                              : 'border-slate-200 hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/5'
                          }`}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </Field>
                  <Field label="Chave Pix" error={errors.pixKey}>
                    <input
                      className={`input font-mono ${errors.pixKey ? 'input-error' : ''}`}
                      placeholder={PIX_TYPES.find((t) => t.id === form.pixType)?.placeholder}
                      inputMode={form.pixType === 'cpf' || form.pixType === 'phone' ? 'numeric' : form.pixType === 'email' ? 'email' : 'text'}
                      autoCapitalize="off"
                      {...bind('pixKey')}
                      onBlur={() => {
                        // Ajusta o tipo automaticamente se a chave colada for de outro tipo
                        const detected = detectPixType(form.pixKey)
                        if (detected && detected !== form.pixType && validatePixKey(form.pixType, form.pixKey)) set('pixType', detected)
                      }}
                    />
                  </Field>
                  <Field label="Nome do titular" error={errors.pixHolder} hint="Aparece para o convidado conferir antes de transferir.">
                    <input className={`input ${errors.pixHolder ? 'input-error' : ''}`} placeholder="Ex: Mariana Souza" {...bind('pixHolder')} />
                  </Field>
                  <p className="flex items-center gap-2 rounded-xl bg-rose-50 px-3 py-2.5 text-sm font-semibold text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">
                    ❤️ O convite mostra sempre “Valor de coração” — o convidado escolhe quanto quer dar.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ─── ETAPA 4: VISUAL ─── */}
          {step === 3 && (
            <div className="space-y-5 animate-fade-in">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Para quem é a festa? Isso define as cores do convite (envelope, botões e contagem regressiva).
                {libTheme && ' Já veio escolhido pelo tema da biblioteca, mas você pode trocar.'}
              </p>
              <div className="grid gap-3 sm:grid-cols-3">
                {DESIGN_LIST.map((d) => {
                  const active = form.gender === d.id
                  return (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => set('gender', d.id)}
                      className={`group relative flex items-center gap-3 overflow-hidden rounded-2xl border-2 p-3 text-left transition sm:flex-col sm:items-stretch sm:p-0 ${
                        active ? 'border-brand-500 shadow-glow' : 'border-slate-200 hover:border-slate-300 dark:border-white/10 dark:hover:border-white/25'
                      }`}
                    >
                      <div className="grid h-16 w-16 shrink-0 place-items-center rounded-xl sm:h-20 sm:w-full sm:rounded-none" style={{ background: d.page }}>
                        <span className="grid h-10 w-10 place-items-center rounded-full text-white shadow-md" style={{ background: `linear-gradient(160deg, ${d.seal}, ${d.sealDark})` }}>
                          ♥
                        </span>
                      </div>
                      <div className="sm:p-3">
                        <p className="font-semibold">{d.label}</p>
                        <div className="mt-1 flex gap-1">
                          {d.swatch.map((c) => (
                            <span key={c} className="h-3.5 w-3.5 rounded-full ring-1 ring-black/10" style={{ background: c }} />
                          ))}
                        </div>
                      </div>
                      {active && (
                        <span className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-brand-500 text-white shadow">
                          <Check className="h-4 w-4" />
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
              <div className="pt-2 lg:hidden">
                <InvitePreview party={form} />
              </div>
            </div>
          )}

          {/* Navegação */}
          <div className="mt-8 flex items-center justify-between gap-3 border-t border-slate-100 pt-5 dark:border-white/10">
            <button type="button" onClick={() => (step === 0 ? goAdmin({}) : goTo(step - 1))} className="btn-ghost">
              <ChevronLeft className="h-4 w-4" /> {step === 0 ? 'Cancelar' : 'Voltar'}
            </button>
            <div className="flex gap-2">
              {isEdit && !isLast && (
                <button type="button" onClick={save} disabled={saving} className="btn-secondary hidden sm:inline-flex">
                  Salvar
                </button>
              )}
              <button type="submit" disabled={saving || uploading} className="btn-primary min-w-[140px]">
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : isLast ? (
                  <>
                    <Check className="h-4 w-4" /> {isEdit ? 'Salvar alterações' : 'Criar convite'}
                  </>
                ) : (
                  <>
                    Próximo <ChevronRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </form>

        <aside className="sticky top-24 hidden lg:block">
          <InvitePreview party={form} />
        </aside>
      </div>

      <SavedModal party={saved} isEdit={isEdit} />
    </div>
  )
}

function SavedModal({ party, isEdit }) {
  const toast = useToast()
  if (!party) return null
  const canShare = hasPublicUrl()
  const url = publicInviteUrl(party.slug)
  const waText = `Você está convidado(a)! 🎉\n*${party.title}*\nAbra o convite e confirme sua presença:\n${url}`

  return (
    <Modal open onClose={() => goAdmin({})}>
      <div className="text-center">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-brand-400 to-brand-700 text-3xl shadow-glow">🎉</div>
        <h2 className="mt-4 text-xl font-extrabold">{isEdit ? 'Alterações salvas!' : 'Convite pronto!'}</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {canShare ? 'Envie o link abaixo para seus convidados.' : NO_PUBLIC_URL_MSG}
        </p>
      </div>
      {canShare && (
      <div className="mt-5 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-1.5 pl-3 dark:border-white/10 dark:bg-white/5">
        <span className="min-w-0 flex-1 truncate text-sm font-medium">{url}</span>
        <button
          className="btn-primary px-3 py-2"
          onClick={async () => {
            const ok = await copyText(url)
            toast(ok ? 'Link copiado!' : 'Não foi possível copiar', ok ? 'success' : 'error')
          }}
        >
          <Copy className="h-4 w-4" /> Copiar
        </button>
      </div>
      )}
      <div className="mt-3 grid gap-2">
        {canShare && (
          <button className="btn-whatsapp" onClick={() => sendWhatsApp(waText)}>
            <Send className="h-4 w-4" /> Enviar pelo WhatsApp
          </button>
        )}
        {canShare && (
          <button className="btn-secondary" onClick={() => copyClientLink(party, toast)}>
            <Lock className="h-4 w-4" /> Copiar lista privada p/ o cliente
          </button>
        )}
        <div className="grid grid-cols-2 gap-2">
          <button className="btn-secondary" onClick={() => navigate({ festa: party.slug, preview: '1' })}>
            <Eye className="h-4 w-4" /> Ver convite
          </button>
          <button className="btn-secondary" onClick={() => goAdmin({})}>
            Ir ao painel
          </button>
        </div>
      </div>
    </Modal>
  )
}
