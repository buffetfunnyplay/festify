import { useState } from 'react'
import { Baby, Clock, Copy, Eye, Lock, MapPin, Pencil, Trash2, User, Users } from 'lucide-react'
import { goAdmin, navigate } from '../hooks/useRoute'
import { repo } from '../services/repository'
import { designOf } from '../lib/designs'
import { NO_PUBLIC_URL_MSG, copyText, formatDateShort, formatTime, hasPublicUrl, partyDate, plural, publicInviteUrl } from '../lib/utils'
import { useToast } from '../components/ui/Toast'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import PartyThumb from '../components/PartyThumb'
import { copyClientLink } from './clientLink'

function statusOf(party) {
  const d = partyDate(party)
  if (!d) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const day = new Date(d)
  day.setHours(0, 0, 0, 0)
  const days = Math.round((day - today) / 86400000)
  if (days < 0) return { label: 'Realizada', cls: 'bg-slate-900/70 text-white' }
  if (days === 0) return { label: 'É hoje! 🎉', cls: 'bg-rose-500 text-white' }
  if (days === 1) return { label: 'Amanhã', cls: 'bg-amber-400 text-amber-950' }
  return { label: `Em ${days} dias`, cls: 'bg-white/90 text-slate-800' }
}

export default function PartyCard({ party, stats = { adults: 0, children: 0, total: 0, responses: 0 } }) {
  const toast = useToast()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const design = designOf(party)
  const status = statusOf(party)

  const copyLink = async () => {
    if (!hasPublicUrl()) return toast(NO_PUBLIC_URL_MSG, 'info', 5000)
    const ok = await copyText(publicInviteUrl(party.slug))
    toast(ok ? 'Link do convite copiado! Cole no WhatsApp 💬' : 'Não foi possível copiar o link', ok ? 'success' : 'error')
  }

  const remove = async () => {
    try {
      await repo.deleteParty(party.id)
      toast('Festa excluída', 'info')
    } catch (err) {
      toast(err.message, 'error', 4500)
    }
  }

  return (
    <article className="card group flex flex-col overflow-hidden transition duration-300 hover:-translate-y-0.5 hover:shadow-xl">
      <div className="relative aspect-[16/9] overflow-hidden">
        <PartyThumb party={party} className="transition duration-500 group-hover:scale-[1.04]" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
        {status && <span className={`chip absolute left-3 top-3 shadow ${status.cls}`}>{status.label}</span>}
        <span className="chip absolute bottom-3 left-3 bg-black/40 text-white backdrop-blur">
          {party.themeName ? `🎨 ${party.themeName}` : `${design.emoji} ${design.label}`}
        </span>
      </div>

      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <h3 className="line-clamp-2 text-lg font-bold leading-snug">{party.title}</h3>
        <div className="mt-2 space-y-1 text-sm text-slate-500 dark:text-slate-400">
          <p className="flex items-center gap-1.5">
            <Clock className="h-4 w-4 shrink-0" /> {formatDateShort(party)} · {formatTime(party)}
          </p>
          {party.venueName && (
            <p className="flex items-center gap-1.5 truncate">
              <MapPin className="h-4 w-4 shrink-0" /> <span className="truncate">{party.venueName}</span>
            </p>
          )}
        </div>

        {/* Métricas de presença */}
        <div className="mt-4 rounded-xl bg-gradient-to-br from-brand-50 to-brand-50 p-3.5 ring-1 ring-brand-100 dark:from-brand-500/10 dark:to-brand-500/10 dark:ring-brand-400/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-700 dark:text-brand-300">Presenças</span>
            <span className="flex items-center gap-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
              <Users className="h-3.5 w-3.5" /> {plural(stats.total, 'pessoa', 'pessoas')}
            </span>
          </div>
          <p className="mt-2 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[15px] font-semibold text-slate-800 dark:text-slate-100">
            <span className="inline-flex items-center gap-1 whitespace-nowrap">
              <User className="h-4 w-4 text-brand-500" />
              <b className="tabular-nums">{stats.adults}</b> {stats.adults === 1 ? 'Adulto' : 'Adultos'}
            </span>
            <span className="text-slate-400">e</span>
            <span className="inline-flex items-center gap-1 whitespace-nowrap">
              <Baby className="h-4 w-4 text-sky-500" />
              <b className="tabular-nums">{stats.children}</b> {stats.children === 1 ? 'Criança' : 'Crianças'}
            </span>
            <span>{stats.total === 1 ? 'Confirmado' : 'Confirmadas'}</span>
          </p>
        </div>

        {/* Ações */}
        <div className="mt-4 space-y-2">
          <button onClick={() => goAdmin({ view: 'guests', id: party.id })} className="btn-primary w-full whitespace-normal text-center">
            <Users className="h-4 w-4" /> Ver/Gerenciar Lista de Convidados
          </button>
          <button onClick={() => copyClientLink(party, toast)} className="btn-ghost w-full py-2 text-xs">
            <Lock className="h-3.5 w-3.5" /> Copiar link da lista para o cliente
          </button>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={copyLink} className="btn-secondary px-2">
              <Copy className="h-4 w-4" /> Copiar Link
            </button>
            <button onClick={() => navigate({ festa: party.slug, preview: '1' })} className="btn-secondary px-2">
              <Eye className="h-4 w-4" /> Visualizar
            </button>
            <button onClick={() => goAdmin({ view: 'edit', id: party.id })} className="btn-secondary px-2">
              <Pencil className="h-4 w-4" /> Editar
            </button>
            <button onClick={() => setConfirmDelete(true)} className="btn-danger px-2">
              <Trash2 className="h-4 w-4" /> Excluir
            </button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        danger
        title="Excluir esta festa?"
        description={`"${party.title}" e ${plural(stats.responses, 'confirmação', 'confirmações')} serão apagadas. O link do convite deixará de funcionar.`}
        confirmLabel="Excluir"
        onConfirm={remove}
        onClose={() => setConfirmDelete(false)}
      />
    </article>
  )
}
