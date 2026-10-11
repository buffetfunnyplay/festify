import { useMemo, useState } from 'react'
import { ExternalLink, Eye, EyeOff, Images, Pencil, Plus, Search, Trash2, WandSparkles } from 'lucide-react'
import { useAccount, useThemes } from '../hooks/useData'
import { goAdmin, navigate } from '../hooks/useRoute'
import { repo } from '../services/repository'
import { useToast } from '../components/ui/Toast'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import { genderOf, matchesGender, matchesSearch, themeThumb } from '../library/themeHelpers'

export default function ThemesAdmin() {
  const { themes, loading } = useThemes()
  const { buffet } = useAccount()
  const handle = buffet?.handle
  const toast = useToast()
  const [query, setQuery] = useState('')
  const [gender, setGender] = useState('todos')
  const [toDelete, setToDelete] = useState(null)

  const filtered = useMemo(() => themes.filter((t) => matchesGender(t, gender) && matchesSearch(t, query)), [themes, gender, query])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-brand-600 dark:text-brand-300">Painel do buffet</p>
          <h1 className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">Biblioteca de temas</h1>
          <p className="mt-1 text-slate-500 dark:text-slate-400">
            {themes.length} {themes.length === 1 ? 'tema cadastrado' : 'temas cadastrados'} · clientes veem os temas visíveis.
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => navigate({ b: handle })} className="btn-secondary">
            <ExternalLink className="h-4 w-4" /> Ver site
          </button>
          <button onClick={() => goAdmin({ view: 'theme', id: 'new' })} className="btn-primary">
            <Plus className="h-4 w-4" /> Adicionar tema
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input className="input pl-9" placeholder="Pesquisar tema..." value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <div className="flex gap-1.5 overflow-x-auto">
          {[
            ['todos', 'Todos'],
            ['menina', '👧 Menina'],
            ['menino', '👦 Menino'],
          ].map(([id, label]) => (
            <button
              key={id}
              onClick={() => setGender(id)}
              className={`shrink-0 rounded-xl px-3.5 py-2 text-sm font-semibold transition ${
                gender === id ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'bg-white text-slate-600 ring-1 ring-slate-200 dark:bg-white/5 dark:text-slate-300 dark:ring-white/10'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="card h-28 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card px-6 py-12 text-center">
          <div className="text-4xl">🖼️</div>
          <p className="mt-2 font-semibold">{themes.length ? 'Nenhum tema encontrado' : 'Sua biblioteca está vazia'}</p>
          <p className="mt-1 text-sm text-slate-500">Cadastre temas com fotos para os clientes escolherem.</p>
          <button onClick={() => goAdmin({ view: 'theme', id: 'new' })} className="btn-primary mt-5">
            <Plus className="h-4 w-4" /> Adicionar tema
          </button>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((t) => {
            const g = genderOf(t)
            const cover = themeThumb(t)
            return (
              <article key={t.id} className="card flex gap-3 p-3">
                <button onClick={() => navigate({ b: handle, tema: t.slug })} className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-slate-100 dark:bg-white/5">
                  {cover ? <img src={cover} alt="" className="h-full w-full object-cover" loading="lazy" /> : <span className="grid h-full place-items-center text-3xl">{t.emoji || '🎉'}</span>}
                  {t.active === false && (
                    <span className="absolute inset-0 grid place-items-center bg-black/50 text-white">
                      <EyeOff className="h-5 w-5" />
                    </span>
                  )}
                </button>
                <div className="flex min-w-0 flex-1 flex-col">
                  <p className="truncate font-bold">{t.name}</p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-slate-500 dark:text-slate-400">
                    <span>
                      {g.emoji} {g.label}
                    </span>
                    <span className="inline-flex items-center gap-0.5">
                      <Images className="h-3 w-3" /> {t.photos?.length || 0}
                    </span>
                    {t.active === false && <span className="font-semibold text-amber-600">Oculto</span>}
                  </p>
                  <div className="mt-auto flex flex-wrap gap-1.5 pt-2">
                    <button onClick={() => goAdmin({ view: 'new', theme: t.id })} className="btn-primary px-2.5 py-1.5 text-xs" title="Gerar convite online">
                      <WandSparkles className="h-3.5 w-3.5" /> Gerar convite
                    </button>
                    <button onClick={() => goAdmin({ view: 'theme', id: t.id })} className="btn-secondary px-2.5 py-1.5 text-xs" aria-label="Editar">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => navigate({ b: handle, tema: t.slug })} className="btn-secondary px-2.5 py-1.5 text-xs" aria-label="Ver página">
                      <Eye className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => setToDelete(t)} className="btn-danger px-2.5 py-1.5 text-xs" aria-label="Excluir">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      )}

      <ConfirmDialog
        open={Boolean(toDelete)}
        danger
        title="Excluir este tema?"
        description={toDelete ? `“${toDelete.name}” e suas ${toDelete.photos?.length || 0} fotos sairão da biblioteca. Convites já criados continuam funcionando.` : ''}
        confirmLabel="Excluir"
        onConfirm={async () => {
          try {
            await repo.deleteTheme(toDelete.id)
            toast('Tema excluído', 'info')
          } catch (err) {
            toast(err.message, 'error', 4500)
          }
        }}
        onClose={() => setToDelete(null)}
      />
    </div>
  )
}
