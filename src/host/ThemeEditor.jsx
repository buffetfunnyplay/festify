import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, ChevronLeft, ChevronRight, Check, Eye, ImagePlus, Loader2, Star, Trash2, WandSparkles, X } from 'lucide-react'
import { repo, isDemo } from '../services/repository'
import { useSettings } from '../hooks/useData'
import { goAdmin, navigate } from '../hooks/useRoute'
import { DESIGNS } from '../lib/designs'
import { GENDERS, compressImage, slugify } from '../lib/utils'
import { useToast } from '../components/ui/Toast'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import InvitePreview from '../components/InvitePreview'
import { sampleParty, themeThumb } from '../library/themeHelpers'

const EMPTY = {
  name: '',
  slug: '',
  emoji: '',
  gender: 'unissex',
  tags: [],
  description: '',
  photos: [],
  thumbs: [],
  coverIndex: 0,
  active: true,
}

/** Miniaturas alinhadas com as fotos (temas antigos não tinham miniatura) */
const fillThumbs = (f) => (f.photos || []).map((p, i) => f.thumbs?.[i] || p)

export default function ThemeEditor({ themeId }) {
  const toast = useToast()
  const { settings } = useSettings()
  const isEdit = Boolean(themeId)
  const [form, setForm] = useState(EMPTY)
  const [slugTouched, setSlugTouched] = useState(false)
  const [tagInput, setTagInput] = useState('')
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(0)
  const [errors, setErrors] = useState({})
  const [confirmDelete, setConfirmDelete] = useState(false)
  const fileRef = useRef()

  useEffect(() => {
    if (!isEdit) return
    repo.getTheme(themeId).then((t) => {
      if (!t) {
        toast('Tema não encontrado', 'error')
        goAdmin({ view: 'library' }, { replace: true })
        return
      }
      setForm({ ...EMPTY, ...t })
      setSlugTouched(true)
      setLoading(false)
    })
  }, [themeId]) // eslint-disable-line react-hooks/exhaustive-deps

  const set = (key, value) => {
    setForm((f) => {
      const next = { ...f, [key]: value }
      if (key === 'name' && !slugTouched) next.slug = slugify(value)
      return next
    })
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }))
  }

  // ── Tags ──
  const addTags = (raw) => {
    const parts = raw
      .split(/[,;\n]/)
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean)
    if (parts.length) set('tags', [...new Set([...form.tags, ...parts])])
    setTagInput('')
  }

  // ── Fotos ──
  const onFiles = async (files) => {
    const list = Array.from(files || []).filter((f) => f.type.startsWith('image/'))
    if (!list.length) return
    setUploading(list.length)
    const added = []
    const addedThumbs = []
    for (const file of list) {
      try {
        // foto grande (galeria) + miniatura leve (lista com dezenas de temas)
        const data = await compressImage(file, isDemo ? 1000 : 1600, isDemo ? 0.74 : 0.82)
        const thumb = await compressImage(file, 480, 0.72)
        const full = await repo.uploadImage(data, 'themes')
        const small = await repo.uploadImage(thumb, 'themes/thumbs')
        added.push(full)
        addedThumbs.push(small)
      } catch (err) {
        toast(err.message || 'Falha ao enviar uma foto', 'error')
      }
      setUploading((n) => n - 1)
    }
    setForm((f) => ({ ...f, photos: [...f.photos, ...added], thumbs: [...fillThumbs(f), ...addedThumbs] }))
    if (errors.photos) setErrors((e) => ({ ...e, photos: undefined }))
  }

  const removePhoto = (i) =>
    setForm((f) => {
      const photos = f.photos.filter((_, k) => k !== i)
      const thumbs = fillThumbs(f).filter((_, k) => k !== i)
      let coverIndex = f.coverIndex
      if (i === coverIndex) coverIndex = 0
      else if (i < coverIndex) coverIndex -= 1
      return { ...f, photos, thumbs, coverIndex }
    })

  const movePhoto = (i, dir) =>
    setForm((f) => {
      const j = i + dir
      if (j < 0 || j >= f.photos.length) return f
      const photos = [...f.photos]
      const thumbs = fillThumbs(f)
      ;[photos[i], photos[j]] = [photos[j], photos[i]]
      ;[thumbs[i], thumbs[j]] = [thumbs[j], thumbs[i]]
      let coverIndex = f.coverIndex
      if (coverIndex === i) coverIndex = j
      else if (coverIndex === j) coverIndex = i
      return { ...f, photos, thumbs, coverIndex }
    })

  // ── Salvar ──
  const save = async (e) => {
    e?.preventDefault()
    const errs = {}
    if (form.name.trim().length < 2) errs.name = 'Dê um nome ao tema'
    const slug = slugify(form.slug || form.name)
    if (!slug) errs.slug = 'Defina o link do tema'
    else if (!(await repo.isThemeSlugAvailable(slug, form.id))) errs.slug = 'Já existe um tema com esse link'
    if (!form.photos.length) errs.photos = 'Adicione pelo menos uma foto'
    setErrors(errs)
    if (Object.keys(errs).length) return toast('Revise os campos destacados', 'error')

    setSaving(true)
    try {
      const pending = tagInput.trim() ? [...new Set([...form.tags, ...tagInput.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean)])] : form.tags
      // eslint-disable-next-line no-unused-vars
      const { style, ...rest } = form
      const saved = await repo.saveTheme({
        ...rest,
        name: form.name.trim(),
        slug,
        tags: pending,
        emoji: (form.emoji || '').trim(),
        description: (form.description || '').trim(),
        thumbs: fillThumbs(form),
        coverIndex: Math.min(form.coverIndex || 0, form.photos.length - 1),
      })
      toast(isEdit ? 'Tema atualizado!' : 'Tema adicionado à biblioteca!')
      goAdmin({ view: 'library' }, { replace: true })
      return saved
    } catch (err) {
      toast(err.message, 'error', 4500)
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

  const previewTheme = { ...form, id: form.id || 'novo', name: form.name || 'Seu tema' }

  return (
    <div>
      <button onClick={() => goAdmin({ view: 'library' })} className="btn-ghost -ml-3 mb-2">
        <ArrowLeft className="h-4 w-4" /> Biblioteca
      </button>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">{isEdit ? 'Editar tema' : 'Novo tema'}</h1>
        {isEdit && (
          <div className="flex gap-2">
            <button onClick={() => navigate({ b: settings.handle, tema: form.slug })} className="btn-secondary">
              <Eye className="h-4 w-4" /> Ver página
            </button>
            <button onClick={() => goAdmin({ view: 'new', theme: form.id })} className="btn-secondary">
              <WandSparkles className="h-4 w-4" /> Gerar convite
            </button>
          </div>
        )}
      </div>

      <div className="mt-6 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <form onSubmit={save} className="card space-y-6 p-5 sm:p-7">
          {/* Fotos */}
          <section>
            <div className="flex items-baseline justify-between">
              <label className="label">Fotos do tema</label>
              <span className="text-xs text-slate-400">{form.photos.length} foto(s) · ⭐ = capa</span>
            </div>
            <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => (onFiles(e.target.files), (e.target.value = ''))} />
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {form.photos.map((src, i) => (
                <div key={src.slice(-40) + i} className={`group relative aspect-square overflow-hidden rounded-xl bg-slate-100 ring-2 dark:bg-white/5 ${i === form.coverIndex ? 'ring-amber-400' : 'ring-transparent'}`}>
                  <img src={themeThumb(form, i)} alt="" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => set('coverIndex', i)}
                    className={`absolute left-1 top-1 grid h-7 w-7 place-items-center rounded-full shadow ${i === form.coverIndex ? 'bg-amber-400 text-white' : 'bg-white/90 text-slate-500'}`}
                    aria-label="Usar como capa"
                    title="Usar como capa"
                  >
                    <Star className="h-4 w-4" fill={i === form.coverIndex ? 'currentColor' : 'none'} />
                  </button>
                  <button type="button" onClick={() => removePhoto(i)} className="absolute right-1 top-1 grid h-7 w-7 place-items-center rounded-full bg-white/90 text-rose-500 shadow" aria-label="Remover foto">
                    <X className="h-4 w-4" />
                  </button>
                  <div className="absolute inset-x-1 bottom-1 flex justify-between">
                    <button type="button" disabled={i === 0} onClick={() => movePhoto(i, -1)} className="grid h-6 w-6 place-items-center rounded-full bg-black/45 text-white disabled:opacity-0" aria-label="Mover para a esquerda">
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button type="button" disabled={i === form.photos.length - 1} onClick={() => movePhoto(i, 1)} className="grid h-6 w-6 place-items-center rounded-full bg-black/45 text-white disabled:opacity-0" aria-label="Mover para a direita">
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
              {Array.from({ length: uploading }).map((_, i) => (
                <div key={`up-${i}`} className="grid aspect-square place-items-center rounded-xl bg-slate-100 dark:bg-white/5">
                  <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
                </div>
              ))}
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className={`flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed text-xs font-semibold transition hover:border-brand-300 hover:bg-brand-50/50 dark:hover:bg-white/5 ${
                  errors.photos ? 'border-rose-300 text-rose-500' : 'border-slate-200 text-slate-500 dark:border-white/15'
                }`}
              >
                <ImagePlus className="h-6 w-6" /> Adicionar
              </button>
            </div>
            {errors.photos && <p className="mt-1.5 text-xs font-semibold text-rose-500">{errors.photos}</p>}
            <p className="hint">Pode selecionar várias fotos de uma vez. Elas são otimizadas automaticamente.</p>
          </section>

          <div className="grid grid-cols-[1fr_88px] gap-3">
            <div>
              <label className="label">Nome do tema</label>
              <input className={`input ${errors.name ? 'input-error' : ''}`} placeholder="Ex.: Dinossauros" value={form.name} onChange={(e) => set('name', e.target.value)} maxLength={60} />
              {errors.name && <p className="mt-1.5 text-xs font-semibold text-rose-500">{errors.name}</p>}
            </div>
            <div>
              <label className="label">
                Emoji <span className="font-normal text-slate-400">(opc.)</span>
              </label>
              <input className="input text-center text-xl" placeholder="🦖" value={form.emoji} onChange={(e) => set('emoji', e.target.value.slice(0, 8))} />
            </div>
          </div>

          <div>
            <label className="label">Para quem é</label>
            <div className="grid grid-cols-3 gap-2">
              {Object.values(GENDERS).map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => set('gender', g.id)}
                  className={`rounded-xl border px-2 py-2.5 text-sm font-semibold transition ${
                    form.gender === g.id ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-200' : 'border-slate-200 hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/5'
                  }`}
                >
                  {g.emoji} {g.label}
                </button>
              ))}
            </div>
            <p className="hint">
              Define as cores do convite: <b style={{ color: DESIGNS.menina.seal }}>Menina = rosa</b> · <b style={{ color: DESIGNS.menino.seal }}>Menino = azul</b> ·{' '}
              <b style={{ color: DESIGNS.unissex.seal }}>Para todos = vermelho</b>. “Para todos” aparece nos dois filtros.
            </p>
          </div>

          <div>
            <label className="label">
              Palavras-chave para a busca <span className="font-normal text-slate-400">(opcional)</span>
            </label>
            <div className="flex min-h-[46px] flex-wrap items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2 py-1.5 focus-within:border-brand-400 focus-within:ring-4 focus-within:ring-brand-500/15 dark:border-white/10 dark:bg-white/5">
              {form.tags.map((t) => (
                <span key={t} className="chip bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-200">
                  #{t}
                  <button type="button" onClick={() => set('tags', form.tags.filter((x) => x !== t))} aria-label={`Remover ${t}`}>
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
              <input
                className="min-w-[8rem] flex-1 bg-transparent px-1 py-1 outline-none"
                placeholder={form.tags.length ? 'mais...' : 'dinossauro, jurássico, aventura'}
                value={tagInput}
                onChange={(e) => (e.target.value.includes(',') ? addTags(e.target.value) : setTagInput(e.target.value))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addTags(tagInput)
                  }
                  if (e.key === 'Backspace' && !tagInput && form.tags.length) set('tags', form.tags.slice(0, -1))
                }}
                onBlur={() => tagInput && addTags(tagInput)}
              />
            </div>
            <p className="hint">Separe por vírgula. Ajudam o cliente a achar o tema (ex.: “dino”, “jurássico”).</p>
          </div>

          <div>
            <label className="label">
              Descrição <span className="font-normal text-slate-400">(opcional)</span>
            </label>
            <textarea className="input min-h-[80px]" maxLength={300} placeholder="Conte o que vem na decoração..." value={form.description} onChange={(e) => set('description', e.target.value)} />
          </div>

          <div>
            <label className="label">
              Link da página <span className="font-normal text-slate-400">(automático)</span>
            </label>
            <div className={`flex items-center overflow-hidden rounded-xl border bg-slate-50 dark:bg-white/5 ${errors.slug ? 'border-rose-400' : 'border-slate-200 dark:border-white/10'}`}>
              <span className="shrink-0 pl-3.5 text-sm text-slate-400">tema=</span>
              <input
                className="w-full min-w-0 bg-transparent px-1.5 py-2.5 font-medium outline-none"
                value={form.slug}
                onChange={(e) => {
                  setSlugTouched(true)
                  set('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))
                }}
              />
            </div>
            {errors.slug && <p className="mt-1.5 text-xs font-semibold text-rose-500">{errors.slug}</p>}
          </div>

          <label className="flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-slate-200 p-4 dark:border-white/10">
            <span>
              <span className="font-semibold">Visível na biblioteca</span>
              <span className="block text-sm text-slate-500 dark:text-slate-400">Desligue para esconder dos clientes sem excluir.</span>
            </span>
            <span className="relative inline-flex shrink-0">
              <input type="checkbox" className="peer sr-only" checked={form.active !== false} onChange={(e) => set('active', e.target.checked)} />
              <span className="h-7 w-12 rounded-full bg-slate-300 transition peer-checked:bg-brand-500 dark:bg-white/15" />
              <span className="absolute left-1 top-1 h-5 w-5 rounded-full bg-white shadow transition peer-checked:translate-x-5" />
            </span>
          </label>

          <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-5 dark:border-white/10 sm:flex-row sm:justify-between">
            {isEdit ? (
              <button type="button" onClick={() => setConfirmDelete(true)} className="btn-danger">
                <Trash2 className="h-4 w-4" /> Excluir tema
              </button>
            ) : (
              <span />
            )}
            <button type="submit" disabled={saving || uploading > 0} className="btn-primary min-w-[160px]">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} {isEdit ? 'Salvar tema' : 'Adicionar tema'}
            </button>
          </div>
        </form>

        <aside className="lg:sticky lg:top-24">
          <p className="mb-3 text-center text-sm font-semibold text-slate-500">Miniatura que o cliente verá</p>
          <InvitePreview party={sampleParty(previewTheme, settings)} />
        </aside>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        danger
        title="Excluir este tema?"
        description="O tema e suas fotos sairão da biblioteca. Convites já criados continuam funcionando."
        confirmLabel="Excluir"
        onConfirm={async () => {
          try {
            await repo.deleteTheme(form.id)
            toast('Tema excluído', 'info')
            goAdmin({ view: 'library' }, { replace: true })
          } catch (err) {
            toast(err.message, 'error', 4500)
          }
        }}
        onClose={() => setConfirmDelete(false)}
      />
    </div>
  )
}
