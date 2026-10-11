import { useCallback, useEffect, useMemo, useState } from 'react'
import { Ban, Check, ExternalLink, KeyRound, Loader2, Mail, RefreshCw, ShieldCheck, Trash2 } from 'lucide-react'
import { repo, isDemo } from '../services/repository'
import { useAccount } from '../hooks/useData'
import { navigate } from '../hooks/useRoute'
import { formatDateTime } from '../lib/utils'
import { useToast } from '../components/ui/Toast'
import ConfirmDialog from '../components/ui/ConfirmDialog'

const STATUS = {
  pending: { label: 'Pendente', cls: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-200' },
  active: { label: 'Liberado', cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300' },
  blocked: { label: 'Bloqueado', cls: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300' },
}
const TABS = [
  ['pending', 'Pendentes'],
  ['active', 'Liberados'],
  ['blocked', 'Bloqueados'],
]

/** Painel do dono da plataforma: libera / bloqueia buffets e logins */
export default function AccessAdmin() {
  const toast = useToast()
  const { isSuper, member } = useAccount()
  const [list, setList] = useState(null)
  const [tab, setTab] = useState('pending')
  const [busy, setBusy] = useState('')
  const [toRemove, setToRemove] = useState(null)

  const load = useCallback(async () => {
    try {
      setList(await repo.adminOverview())
    } catch (err) {
      toast(err.message, 'error')
      setList([])
    }
  }, [toast])

  useEffect(() => {
    load()
    return repo.subscribe((e) => (e.type === 'account' || e.type === 'poll') && load())
  }, [load])

  // Um buffet aparece em "Pendentes" se ele ou alguém da equipe estiver pendente
  const groupOf = (item) => {
    if (item.buffet.status === 'blocked') return 'blocked'
    if (item.buffet.status === 'pending' || item.members.some((m) => m.status === 'pending')) return 'pending'
    return 'active'
  }
  const grouped = useMemo(() => {
    const g = { pending: [], active: [], blocked: [] }
    for (const item of list || []) g[groupOf(item)].push(item)
    return g
  }, [list])

  if (!isSuper) {
    return <p className="card p-8 text-center text-slate-500">Somente o administrador do Festify vê esta página.</p>
  }

  const act = async (key, fn, msg) => {
    setBusy(key)
    try {
      await fn()
      toast(msg)
      await load()
    } catch (err) {
      toast(err.message, 'error', 4500)
    } finally {
      setBusy('')
    }
  }

  const items = grouped[tab]

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-brand-600 dark:text-brand-300">Administrador do Festify</p>
          <h1 className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">Liberações</h1>
          <p className="mt-1 text-slate-500 dark:text-slate-400">Quem pede acesso só entra no painel depois que você liberar aqui.</p>
        </div>
        <button onClick={() => (setList(null), load())} className="btn-secondary">
          <RefreshCw className="h-4 w-4" /> Atualizar
        </button>
      </div>

      {isDemo && (
        <p className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">
          Modo demonstração: os pedidos abaixo são exemplos para você conhecer a tela.
        </p>
      )}

      <div className="flex gap-1.5 overflow-x-auto">
        {TABS.map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-semibold transition ${
              tab === id ? 'bg-brand-600 text-white shadow-glow' : 'bg-white text-slate-600 ring-1 ring-slate-200 dark:bg-white/5 dark:text-slate-300 dark:ring-white/10'
            }`}
          >
            {label}
            <span className={`rounded-full px-1.5 text-xs ${tab === id ? 'bg-white/20' : 'bg-slate-100 dark:bg-white/10'}`}>{grouped[id].length}</span>
          </button>
        ))}
      </div>

      {list === null ? (
        <div className="grid place-items-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
        </div>
      ) : items.length === 0 ? (
        <div className="card px-6 py-12 text-center">
          <ShieldCheck className="mx-auto h-10 w-10 text-emerald-500" />
          <p className="mt-2 font-semibold">{tab === 'pending' ? 'Nenhum pedido aguardando' : 'Nada por aqui'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {items.map(({ buffet: b, members, themes, parties, whatsapp }) => (
            <article key={b.id} className="card min-w-0 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-lg font-bold">{b.name}</p>
                  <p className="truncate text-xs text-slate-500">?b={b.handle}</p>
                </div>
                <span className={`chip shrink-0 ${STATUS[b.status]?.cls}`}>Buffet {STATUS[b.status]?.label.toLowerCase()}</span>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                {themes} temas · {parties} convites{whatsapp ? ` · WhatsApp ${whatsapp}` : ''} · desde {formatDateTime(b.created_at)}
              </p>

              <ul className="mt-3 space-y-2">
                {members.map((m) => {
                  const me = m.user_id === member?.user_id
                  return (
                    <li key={m.user_id} className="rounded-xl bg-slate-50 p-3 dark:bg-white/5">
                      <div className="flex items-center justify-between gap-2">
                        <p className="flex min-w-0 items-center gap-1.5 text-sm font-semibold">
                          {m.method === 'senha' ? <KeyRound className="h-4 w-4 shrink-0 text-slate-400" /> : <Mail className="h-4 w-4 shrink-0 text-slate-400" />}
                          <span className="truncate">{m.method === 'senha' ? `Nome + senha (${b.handle})` : m.email || 'Google'}</span>
                          {me && <span className="chip bg-brand-100 text-brand-700">você</span>}
                        </p>
                        <span className={`chip shrink-0 ${STATUS[m.status]?.cls}`}>{STATUS[m.status]?.label}</span>
                      </div>
                      {!me && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {m.status !== 'active' && (
                            <button
                              disabled={busy === m.user_id}
                              onClick={() => act(m.user_id, () => repo.setMemberStatus(m.user_id, 'active'), `${b.name} liberado! ✅`)}
                              className="btn-primary px-3 py-1.5 text-xs"
                            >
                              {busy === m.user_id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />} Liberar
                            </button>
                          )}
                          {m.status !== 'blocked' && (
                            <button
                              disabled={busy === m.user_id}
                              onClick={() => act(m.user_id, () => repo.setMemberStatus(m.user_id, 'blocked'), 'Acesso bloqueado')}
                              className="btn-secondary px-3 py-1.5 text-xs"
                            >
                              <Ban className="h-3.5 w-3.5" /> Bloquear
                            </button>
                          )}
                          <button onClick={() => setToRemove({ m, b })} className="btn-danger px-3 py-1.5 text-xs">
                            <Trash2 className="h-3.5 w-3.5" /> Remover
                          </button>
                        </div>
                      )}
                    </li>
                  )
                })}
                {members.length === 0 && <li className="text-sm text-slate-500">Sem logins.</li>}
              </ul>

              <div className="mt-3 flex flex-wrap gap-1.5 border-t border-slate-100 pt-3 dark:border-white/10">
                {b.status === 'active' && (
                  <button onClick={() => navigate({ b: b.handle })} className="btn-ghost px-2.5 py-1.5 text-xs">
                    <ExternalLink className="h-3.5 w-3.5" /> Ver biblioteca
                  </button>
                )}
                {b.status !== 'blocked' ? (
                  !members.some((m) => m.user_id === member?.user_id) && (
                    <button
                      disabled={busy === b.id}
                      onClick={() => act(b.id, () => repo.setBuffetStatus(b.id, 'blocked'), 'Buffet bloqueado (site e convites saem do ar)')}
                      className="btn-ghost px-2.5 py-1.5 text-xs text-rose-600"
                    >
                      <Ban className="h-3.5 w-3.5" /> Bloquear buffet inteiro
                    </button>
                  )
                ) : (
                  <button disabled={busy === b.id} onClick={() => act(b.id, () => repo.setBuffetStatus(b.id, 'active'), 'Buffet reativado')} className="btn-ghost px-2.5 py-1.5 text-xs text-emerald-600">
                    <Check className="h-3.5 w-3.5" /> Reativar buffet
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={Boolean(toRemove)}
        danger
        title="Remover este acesso?"
        description={toRemove ? `O login sai do ${toRemove.b.name}. Os temas e convites do buffet continuam salvos.` : ''}
        confirmLabel="Remover"
        onConfirm={() => act(toRemove.m.user_id, () => repo.deleteMember(toRemove.m.user_id), 'Acesso removido')}
        onClose={() => setToRemove(null)}
      />
    </div>
  )
}
