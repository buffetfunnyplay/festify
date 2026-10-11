import { useEffect, useMemo, useState } from 'react'
import {
  ArrowLeft,
  Baby,
  Clock,
  Copy,
  FileDown,
  Link2,
  Lock,
  Loader2,
  MessageCircle,
  RefreshCw,
  Search,
  Send,
  Trash2,
  User,
  Users,
} from 'lucide-react'
import { useParty, useRsvps } from '../hooks/useData'
import { goAdmin } from '../hooks/useRoute'
import { repo, isDemo } from '../services/repository'
import { buildWhatsAppText, downloadGuestPdf } from '../lib/exporters'
import { NO_PUBLIC_URL_MSG, copyText, formatDateLong, formatTime, hasPublicUrl, initials, peopleOf, publicInviteUrl, relativeTime, searchKey } from '../lib/utils'
import { sendWhatsApp } from '../lib/native'
import { copyClientLink } from './clientLink'
import { useToast } from '../components/ui/Toast'
import ConfirmDialog from '../components/ui/ConfirmDialog'

const AVATAR_COLORS = [
  'from-pink-400 to-rose-500',
  'from-brand-400 to-brand-600',
  'from-sky-400 to-blue-600',
  'from-emerald-400 to-teal-600',
  'from-amber-400 to-orange-500',
]
const colorFor = (name) => AVATAR_COLORS[[...name].reduce((s, c) => s + c.charCodeAt(0), 0) % AVATAR_COLORS.length]

function StatCard({ icon: Icon, label, value, tone, big }) {
  return (
    <div className={`card p-4 ${big ? 'col-span-2 sm:col-span-1' : ''}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</span>
        <span className={`grid h-8 w-8 place-items-center rounded-lg ${tone}`}>
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className="mt-2 text-3xl font-extrabold tabular-nums tracking-tight">{value}</p>
    </div>
  )
}

export default function RsvpManager({ partyId }) {
  const toast = useToast()
  const { party, loading } = useParty({ id: partyId })
  const { rsvps, totals, freshIds, reload } = useRsvps(partyId)
  const [refreshing, setRefreshing] = useState(false)
  const [lastSync, setLastSync] = useState(() => new Date())
  useEffect(() => setLastSync(new Date()), [rsvps])

  const refresh = async () => {
    setRefreshing(true)
    await reload()
    setLastSync(new Date())
    setTimeout(() => setRefreshing(false), 400)
  }
  const [query, setQuery] = useState('')
  const [pdfLoading, setPdfLoading] = useState(false)
  const [toDelete, setToDelete] = useState(null)

  const filtered = useMemo(() => {
    const q = searchKey(query)
    if (!q) return rsvps
    return rsvps.filter((r) => searchKey([r.name, r.message, ...peopleOf(r).map((g) => g.name)].join(' ')).includes(q))
  }, [rsvps, query])

  if (loading) {
    return (
      <div className="grid place-items-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
      </div>
    )
  }
  if (!party) {
    return (
      <div className="card p-10 text-center">
        <p className="font-semibold">Festa não encontrada.</p>
        <button className="btn-primary mt-4" onClick={() => goAdmin({})}>
          Voltar ao painel
        </button>
      </div>
    )
  }

  const copyWhatsApp = async () => {
    const ok = await copyText(buildWhatsAppText(party, rsvps))
    toast(ok ? 'Lista copiada! Cole no WhatsApp da portaria 📋' : 'Não foi possível copiar', ok ? 'success' : 'error')
  }
  const sendList = () => sendWhatsApp(buildWhatsAppText(party, rsvps))

  const downloadPdf = async () => {
    setPdfLoading(true)
    try {
      await downloadGuestPdf(party, rsvps)
      toast('PDF gerado com sucesso!')
    } catch (e) {
      console.error(e)
      toast('Erro ao gerar o PDF', 'error')
    } finally {
      setPdfLoading(false)
    }
  }

  const copyInvite = async () => {
    if (!hasPublicUrl()) return toast(NO_PUBLIC_URL_MSG, 'info', 5000)
    const ok = await copyText(publicInviteUrl(party.slug))
    toast(ok ? 'Link do convite copiado!' : 'Não foi possível copiar', ok ? 'success' : 'error')
  }

  return (
    <div className="space-y-6">
      <div>
        <button onClick={() => goAdmin({})} className="btn-ghost -ml-3 mb-2">
          <ArrowLeft className="h-4 w-4" /> Voltar ao painel
        </button>
        <div className="flex flex-wrap items-center gap-2">
          <span className="chip bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            Ao vivo
          </span>
          <button onClick={refresh} className="chip bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-white/10 dark:text-slate-300" title="Atualizar agora">
            <RefreshCw className={`h-3 w-3 ${refreshing ? 'animate-spin' : ''}`} /> Atualizar · {lastSync.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </button>
          <span className="text-sm font-semibold text-brand-600 dark:text-brand-300">Lista de Presença</span>
        </div>
        <h1 className="mt-1 font-display text-2xl font-extrabold tracking-tight sm:text-3xl">{party.title}</h1>
        <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
          <Clock className="h-4 w-4" /> {formatDateLong(party)} às {formatTime(party)}
        </p>
      </div>

      {isDemo && (
        <p className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">
          ⚠️ <b>Modo demonstração:</b> só aparecem aqui as confirmações feitas <b>neste aparelho</b>. Para receber as confirmações dos convidados (de
          qualquer celular), conecte o Supabase — veja o tutorial.
        </p>
      )}

      {/* Totais */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard icon={Users} label="Total geral" value={totals.total} tone="bg-brand-100 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300" />
        <StatCard icon={User} label="Adultos" value={totals.adults} tone="bg-brand-100 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300" />
        <StatCard icon={Baby} label="Crianças" value={totals.children} tone="bg-sky-100 text-sky-600 dark:bg-sky-500/15 dark:text-sky-300" />
        <StatCard icon={MessageCircle} label="Respostas" value={totals.responses} tone="bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300" />
      </div>

      {/* Exportação */}
      <div className="card p-4">
        <p className="mb-3 text-sm font-semibold">Enviar lista para a portaria</p>
        <div className="grid gap-2 sm:grid-cols-4">
          <button onClick={downloadPdf} disabled={!rsvps.length || pdfLoading} className="btn-primary">
            {pdfLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />} Baixar Lista em PDF
          </button>
          <button onClick={copyWhatsApp} disabled={!rsvps.length} className="btn-secondary">
            <Copy className="h-4 w-4" /> Copiar para WhatsApp
          </button>
          <button onClick={sendList} disabled={!rsvps.length} className="btn-whatsapp">
            <Send className="h-4 w-4" /> Enviar no WhatsApp
          </button>
          <button onClick={copyInvite} className="btn-ghost">
            <Link2 className="h-4 w-4" /> Link do convite
          </button>
        </div>
        <div className="mt-3 flex flex-col gap-2 rounded-xl bg-slate-50 p-3 dark:bg-white/5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            <Lock className="mr-1 inline h-4 w-4 text-brand-500" />
            Link privado para o cliente acompanhar os confirmados (sem acesso ao painel).
          </p>
          <button onClick={() => copyClientLink(party, toast)} className="btn-secondary shrink-0">
            <Copy className="h-4 w-4" /> Copiar link do cliente
          </button>
        </div>
      </div>

      {/* Lista */}
      <div className="card overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="font-bold">
            Confirmações <span className="text-slate-400">({rsvps.length})</span>
          </h2>
          <div className="relative sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input className="input py-2 pl-9" placeholder="Buscar convidado..." value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
        </div>

        {rsvps.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <div className="text-4xl">💌</div>
            <p className="mt-3 font-semibold">Nenhuma confirmação ainda</p>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Assim que alguém confirmar, aparece aqui automaticamente.
            </p>
            <button onClick={copyInvite} className="btn-primary mt-5">
              <Copy className="h-4 w-4" /> Copiar link do convite
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-slate-500">Nenhum convidado encontrado para “{query}”.</p>
        ) : (
          <>
            {/* Mobile: cards */}
            <ul className="divide-y divide-slate-100 dark:divide-white/5 md:hidden">
              {filtered.map((r) => (
                <li key={r.id} className={`p-4 ${freshIds.has(r.id) ? 'animate-highlight' : ''}`}>
                  <div className="flex items-start gap-3">
                    <Avatar name={r.name} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-semibold leading-tight">{r.name}</p>
                        <button onClick={() => setToDelete(r)} className="-m-1 rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-500" aria-label="Remover">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        <span className="chip bg-brand-100 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300">
                          <User className="h-3 w-3" /> {r.adults} {r.adults === 1 ? 'adulto' : 'adultos'}
                        </span>
                        <span className="chip bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300">
                          <Baby className="h-3 w-3" /> {r.children} {r.children === 1 ? 'criança' : 'crianças'}
                        </span>
                      </div>
                      <People r={r} />
                      {r.message && (
                        <p className="mt-2 rounded-xl bg-slate-50 px-3 py-2 text-sm italic text-slate-600 dark:bg-white/5 dark:text-slate-300">“{r.message}”</p>
                      )}
                      <p className="mt-1.5 text-xs text-slate-400">{relativeTime(r.createdAt)}</p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            {/* Desktop: tabela */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500 dark:bg-white/[0.03] dark:text-slate-400">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Família / convidados</th>
                    <th className="px-4 py-3 text-center font-semibold">Adultos</th>
                    <th className="px-4 py-3 text-center font-semibold">Crianças</th>
                    <th className="px-4 py-3 font-semibold">Mensagem de carinho</th>
                    <th className="px-4 py-3 font-semibold">Horário</th>
                    <th className="w-12 px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                  {filtered.map((r) => (
                    <tr key={r.id} className={`transition hover:bg-slate-50/70 dark:hover:bg-white/[0.02] ${freshIds.has(r.id) ? 'animate-highlight' : ''}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar name={r.name} small />
                          <span className="font-semibold">{r.name}</span>
                        </div>
                        <People r={r} />
                      </td>
                      <td className="px-4 py-3 text-center font-semibold tabular-nums">{r.adults}</td>
                      <td className="px-4 py-3 text-center font-semibold tabular-nums">{r.children}</td>
                      <td className="max-w-xs px-4 py-3 text-slate-600 dark:text-slate-300">
                        {r.message ? <span className="line-clamp-2 italic">“{r.message}”</span> : <span className="text-slate-300 dark:text-slate-600">—</span>}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-500" title={new Date(r.createdAt).toLocaleString('pt-BR')}>
                        {relativeTime(r.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <button onClick={() => setToDelete(r)} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-500/10" aria-label="Remover">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-50 font-bold dark:bg-white/[0.03]">
                  <tr>
                    <td className="px-4 py-3">Total ({totals.total} pessoas)</td>
                    <td className="px-4 py-3 text-center tabular-nums">{totals.adults}</td>
                    <td className="px-4 py-3 text-center tabular-nums">{totals.children}</td>
                    <td colSpan={3} />
                  </tr>
                </tfoot>
              </table>
            </div>
          </>
        )}
      </div>

      <ConfirmDialog
        open={Boolean(toDelete)}
        danger
        title="Remover confirmação?"
        description={toDelete ? `A confirmação de ${toDelete.name} (${toDelete.adults + toDelete.children} pessoa(s)) sairá da lista.` : ''}
        confirmLabel="Remover"
        onConfirm={async () => {
          try {
            await repo.deleteRsvp(partyId, toDelete.id)
            toast('Confirmação removida', 'info')
          } catch (err) {
            toast(err.message, 'error', 4500)
          }
        }}
        onClose={() => setToDelete(null)}
      />
    </div>
  )
}

function Avatar({ name, small }) {
  return (
    <span
      className={`grid shrink-0 place-items-center rounded-full bg-gradient-to-br font-bold text-white ${colorFor(name)} ${
        small ? 'h-8 w-8 text-xs' : 'h-10 w-10 text-sm'
      }`}
    >
      {initials(name)}
    </span>
  )
}

/** Nome de cada pessoa da confirmação */
function People({ r }) {
  if (!r.guests?.length) return null
  return (
    <ul className="mt-2 flex flex-wrap gap-1.5">
      {r.guests.map((g, i) => (
        <li
          key={i}
          className={`inline-flex max-w-full items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold ${
            g.kind === 'child' ? 'bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300' : 'bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-200'
          }`}
        >
          {g.kind === 'child' ? <Baby className="h-3 w-3 shrink-0" /> : <User className="h-3 w-3 shrink-0" />}
          <span className="truncate">{g.name}</span>
        </li>
      ))}
    </ul>
  )
}
