import { useEffect } from 'react'
import { Loader2, RefreshCw, WifiOff } from 'lucide-react'
import { useDarkMode } from '../hooks/useDarkMode'
import { useAccount } from '../hooks/useData'
import { goAdmin } from '../hooks/useRoute'
import Header from './Header'
import Login from './Login'
import { Blocked, Onboarding, Pending } from './AccountScreens'
import Dashboard from './Dashboard'
import PartyForm from './PartyForm'
import RsvpManager from './RsvpManager'
import ThemesAdmin from './ThemesAdmin'
import ThemeEditor from './ThemeEditor'
import SettingsAdmin from './SettingsAdmin'
import AccessAdmin from './AccessAdmin'

export default function HostApp({ route }) {
  const [dark, toggleDark] = useDarkMode()
  const acc = useAccount()

  useEffect(() => {
    document.title = 'Festify — Painel do Buffet'
  }, [])

  // Página só do dono da plataforma
  useEffect(() => {
    if (!acc.loading && acc.active && route.view === 'access' && !acc.isSuper) goAdmin({}, { replace: true })
  }, [acc.loading, acc.active, acc.isSuper, route.view])

  if (acc.loading || (acc.busy && acc.session && !acc.member)) {
    return (
      <div className="grid min-h-dvh place-items-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
      </div>
    )
  }
  if (acc.error && !acc.account) {
    return (
      <div className="grid min-h-dvh place-items-center px-6 text-center">
        <div className="max-w-sm">
          <WifiOff className="mx-auto h-10 w-10 text-slate-400" />
          <p className="mt-3 font-semibold">Não foi possível conectar</p>
          <p className="mt-1 text-sm text-slate-500">{acc.error.message}</p>
          <button onClick={acc.refresh} className="btn-primary mt-5">
            <RefreshCw className="h-4 w-4" /> Tentar de novo
          </button>
        </div>
      </div>
    )
  }
  if (!acc.session) return <Login />
  if (!acc.member) return <Onboarding session={acc.session} />
  if (acc.blocked) return <Blocked account={acc.account} />
  if (!acc.active) return <Pending session={acc.session} account={acc.account} />

  let page
  switch (route.view) {
    case 'new':
      page = <PartyForm key={`new-${route.theme || ''}`} themeId={route.theme} />
      break
    case 'edit':
      page = <PartyForm key={route.id} partyId={route.id} />
      break
    case 'guests':
      page = <RsvpManager key={route.id} partyId={route.id} />
      break
    case 'library':
      page = <ThemesAdmin />
      break
    case 'theme':
      page = <ThemeEditor key={route.id} themeId={route.id === 'new' ? null : route.id} />
      break
    case 'settings':
      page = <SettingsAdmin />
      break
    case 'access':
      page = <AccessAdmin />
      break
    default:
      page = <Dashboard />
  }

  const tab = ['library', 'theme'].includes(route.view) ? 'library' : route.view === 'settings' ? 'settings' : route.view === 'access' ? 'access' : 'invites'

  return (
    <div className="min-h-dvh bg-[radial-gradient(ellipse_at_top,color-mix(in_srgb,var(--brand)_8%,transparent),transparent_60%)] dark:bg-[radial-gradient(ellipse_at_top,color-mix(in_srgb,var(--brand)_14%,transparent),transparent_60%)]">
      <Header dark={dark} onToggleDark={toggleDark} tab={tab} />
      <main className="mx-auto w-full max-w-6xl px-4 pb-28 pt-6 sm:px-6 sm:pb-24">{page}</main>
    </div>
  )
}
