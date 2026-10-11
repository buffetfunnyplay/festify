import { useEffect, useState } from 'react'
import { Globe, LibraryBig, LogOut, Moon, PartyPopper, Plus, Settings, ShieldCheck, Sun } from 'lucide-react'
import { goAdmin, navigate } from '../hooks/useRoute'
import { refreshAccount, useAccount } from '../hooks/useData'
import { repo, isDemo } from '../services/repository'
import Logo from './Logo'

const BASE_TABS = [
  { id: 'invites', label: 'Convites', icon: PartyPopper, view: undefined },
  { id: 'library', label: 'Biblioteca', icon: LibraryBig, view: 'library' },
  { id: 'settings', label: 'Ajustes', icon: Settings, view: 'settings' },
]
const ACCESS_TAB = { id: 'access', label: 'Liberações', icon: ShieldCheck, view: 'access' }

/** Quantos pedidos de acesso estão esperando (só para o dono da plataforma) */
function usePendingCount(enabled) {
  const [n, setN] = useState(0)
  useEffect(() => {
    if (!enabled) return
    let alive = true
    const load = () =>
      repo
        .adminOverview()
        .then((list) => {
          if (!alive) return
          setN(list.filter((i) => i.buffet.status !== 'blocked' && (i.buffet.status === 'pending' || i.members.some((m) => m.status === 'pending'))).length)
        })
        .catch(() => {})
    load()
    const t = setInterval(() => document.visibilityState === 'visible' && load(), 60000)
    const off = repo.subscribe((e) => e.type === 'account' && load())
    return () => {
      alive = false
      clearInterval(t)
      off()
    }
  }, [enabled])
  return n
}

export default function Header({ dark, onToggleDark, tab }) {
  const { isSuper, buffet } = useAccount()
  const pending = usePendingCount(isSuper)
  const tabs = isSuper ? [...BASE_TABS, ACCESS_TAB] : BASE_TABS
  const iconBtn =
    'grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10'

  const signOut = async () => {
    await repo.signOut()
    refreshAccount()
  }

  return (
    <>
      <header className="glass pt-safe sticky top-0 z-40 border-x-0 border-t-0">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-2 px-4 sm:px-6">
          <button onClick={() => goAdmin()} aria-label="Ir para o início do painel" className="flex min-w-0 items-center gap-2 rounded-xl">
            {buffet?.data?.logo ? (
              <img src={buffet.data.logo} alt="" className="h-9 w-9 shrink-0 rounded-xl object-cover ring-1 ring-black/5" />
            ) : (
              <Logo compact />
            )}
            <span className="flex min-w-0 flex-col items-start leading-tight">
              <span className="max-w-[7.5rem] truncate text-sm font-extrabold min-[400px]:max-w-[9.5rem] sm:max-w-[14rem]">{buffet?.name || 'Festify'}</span>
              <span className="text-[0.68rem] font-semibold text-brand-600 dark:text-brand-300">{isDemo ? 'Modo demonstração' : 'Painel do buffet'}</span>
            </span>
          </button>

          {/* Abas (computador / tablet deitado) */}
          <nav className="hidden items-center gap-1 rounded-2xl bg-slate-100 p-1 dark:bg-white/5 lg:flex">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => goAdmin({ view: t.view })}
                className={`relative flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold transition ${
                  tab === t.id ? 'bg-white text-slate-900 shadow-sm dark:bg-white/15 dark:text-white' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                <t.icon className="h-4 w-4" /> {t.label}
                {t.id === 'access' && pending > 0 && <Badge n={pending} />}
              </button>
            ))}
          </nav>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <button onClick={() => buffet?.handle && navigate({ b: buffet.handle })} className={iconBtn} title="Ver minha biblioteca pública" aria-label="Ver minha biblioteca pública">
              <Globe className="h-5 w-5" />
            </button>
            <button onClick={onToggleDark} className={`${iconBtn} dark:text-amber-300`} aria-label={dark ? 'Ativar modo claro' : 'Ativar modo escuro'} title={dark ? 'Modo claro' : 'Modo escuro'}>
              {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
            <button onClick={signOut} className={iconBtn} title="Sair" aria-label="Sair">
              <LogOut className="h-5 w-5" />
            </button>
            <button onClick={() => goAdmin({ view: 'new' })} className="btn-primary hidden h-10 px-4 lg:inline-flex">
              <Plus className="h-5 w-5" /> Criar convite
            </button>
          </div>
        </div>
      </header>

      {/* Abas (celular / tablet em pé) — barra inferior estilo app */}
      <nav className="pb-safe glass fixed inset-x-0 bottom-0 z-40 border-x-0 border-b-0 lg:hidden">
        <div className={`mx-auto grid max-w-lg px-1 pt-1.5 ${isSuper ? 'grid-cols-5' : 'grid-cols-4'}`}>
          {tabs.slice(0, 2).map((t) => (
            <TabButton key={t.id} t={t} active={tab === t.id} />
          ))}
          <button onClick={() => goAdmin({ view: 'new' })} className="flex min-w-0 flex-col items-center gap-0.5 py-1 text-[0.66rem] font-semibold text-brand-600 min-[400px]:text-[0.7rem] dark:text-brand-300">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-glow">
              <Plus className="h-5 w-5" />
            </span>
            <span className="max-w-full truncate">Novo convite</span>
          </button>
          {tabs.slice(2).map((t) => (
            <TabButton key={t.id} t={t} active={tab === t.id} badge={t.id === 'access' ? pending : 0} />
          ))}
        </div>
      </nav>
    </>
  )
}

function Badge({ n }) {
  return <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-rose-500 px-1 text-[0.65rem] font-bold text-white ring-2 ring-white dark:ring-[#0b0b12]">{n}</span>
}

function TabButton({ t, active, badge = 0 }) {
  return (
    <button
      onClick={() => goAdmin({ view: t.view })}
      className={`flex min-w-0 flex-col items-center gap-0.5 py-1 text-[0.66rem] font-semibold transition min-[400px]:text-[0.7rem] ${active ? 'text-brand-600 dark:text-brand-300' : 'text-slate-500 dark:text-slate-400'}`}
      aria-current={active ? 'page' : undefined}
    >
      <span className={`relative grid h-8 w-11 max-w-full place-items-center rounded-full transition ${active ? 'bg-brand-100 dark:bg-brand-500/20' : ''}`}>
        <t.icon className="h-5 w-5" />
        {badge > 0 && <Badge n={badge} />}
      </span>
      <span className="max-w-full truncate">{t.label}</span>
    </button>
  )
}
