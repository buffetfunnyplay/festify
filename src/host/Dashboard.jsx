import { CalendarDays, PartyPopper, Plus, Users } from 'lucide-react'
import { useParties } from '../hooks/useData'
import { goAdmin } from '../hooks/useRoute'
import { partyDate } from '../lib/utils'
import { isDemo } from '../services/repository'
import PartyCard from './PartyCard'

function Stat({ icon: Icon, label, value, tone }) {
  return (
    <div className="card flex flex-col gap-2 p-3.5 sm:flex-row sm:items-center sm:gap-3 sm:p-4">
      <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl sm:h-11 sm:w-11 ${tone}`}>
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="text-2xl font-extrabold leading-none tabular-nums">{value}</p>
        <p className="mt-1 text-xs font-medium leading-tight text-slate-500 dark:text-slate-400">{label}</p>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { parties, stats, loading } = useParties()

  const now = Date.now()
  const upcoming = parties.filter((p) => (partyDate(p)?.getTime() ?? 0) >= now - 6 * 3600e3)
  const past = parties.filter((p) => !upcoming.includes(p))
  const totalGuests = Object.values(stats).reduce((s, t) => s + t.total, 0)

  return (
    <div className="space-y-8">
      <section>
        <p className="text-sm font-semibold text-brand-600 dark:text-brand-300">Painel do buffet</p>
        <h1 className="mt-1 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">Convites online</h1>
        <p className="mt-1.5 text-slate-500 dark:text-slate-400">
          Cliente escolheu um tema? Abra a <button onClick={() => goAdmin({ view: 'library' })} className="font-semibold text-brand-600 underline-offset-4 hover:underline dark:text-brand-300">Biblioteca</button> e toque em “Gerar convite”.
        </p>

        {isDemo && (
          <p className="mt-4 rounded-2xl bg-amber-50 p-3.5 text-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">
            ⚠️ <b>Modo demonstração</b> — os dados ficam só neste aparelho e as confirmações dos convidados não chegam aqui. Conecte o Supabase (tutorial)
            para usar de verdade.
          </p>
        )}

        <div className="mt-5 grid grid-cols-3 gap-2.5 sm:gap-3">
          <Stat icon={PartyPopper} label="Festas criadas" value={parties.length} tone="bg-brand-100 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300" />
          <Stat icon={CalendarDays} label="Próximas" value={upcoming.length} tone="bg-sky-100 text-sky-600 dark:bg-sky-500/15 dark:text-sky-300" />
          <Stat icon={Users} label="Confirmados" value={totalGuests} tone="bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300" />
        </div>
      </section>

      {loading ? (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="card h-[420px] animate-pulse bg-slate-100 dark:bg-white/5" />
          ))}
        </div>
      ) : parties.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          {upcoming.length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Próximas festas</h2>
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {upcoming.map((p) => (
                  <PartyCard key={p.id} party={p} stats={stats[p.id]} />
                ))}
              </div>
            </section>
          )}
          {past.length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Já aconteceram</h2>
              <div className="grid gap-5 opacity-90 sm:grid-cols-2 xl:grid-cols-3">
                {past.map((p) => (
                  <PartyCard key={p.id} party={p} stats={stats[p.id]} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  )
}

function EmptyState() {
  return (
    <div className="card flex flex-col items-center px-6 py-14 text-center">
      <div className="grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-brand-400 to-brand-700 text-3xl shadow-glow">🎉</div>
      <h2 className="mt-5 text-xl font-bold">Nenhuma festa por aqui ainda</h2>
      <p className="mt-1.5 max-w-sm text-slate-500 dark:text-slate-400">
        Monte seu primeiro convite interativo em menos de 2 minutos e envie pelo WhatsApp.
      </p>
      <button onClick={() => goAdmin({ view: 'new' })} className="btn-primary mt-6">
        <Plus className="h-5 w-5" /> Criar minha primeira festa
      </button>
    </div>
  )
}
