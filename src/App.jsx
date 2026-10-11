import { lazy, Suspense } from 'react'
import { useRoute } from './hooks/useRoute'
import { ToastProvider } from './components/ui/Toast'
import ErrorBoundary from './components/ErrorBoundary'
import { isAppShell } from './lib/native'

// Code-splitting: cada visitante baixa só o que precisa
const HostApp = lazy(() => import('./host/HostApp'))
const GuestView = lazy(() => import('./guest/GuestView'))
const LibraryView = lazy(() => import('./library/LibraryView'))
const ThemePage = lazy(() => import('./library/ThemePage'))
const ThemeDemo = lazy(() => import('./library/ThemeDemo'))
const Landing = lazy(() => import('./library/Landing'))
const ClientListView = lazy(() => import('./client/ClientListView'))

function Splash() {
  return (
    <div className="grid min-h-dvh place-items-center">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-200 border-t-brand-500" />
    </div>
  )
}

function Router({ route }) {
  if (route.festa) return <GuestView key={route.festa} slug={route.festa} preview={route.preview === '1'} />
  if (route.lista) return <ClientListView token={route.lista} />
  if (route.b && route.tema && route.demo) return <ThemeDemo key={`${route.b}/${route.tema}`} handle={route.b} slug={route.tema} />
  if (route.b && route.tema) return <ThemePage key={`${route.b}/${route.tema}`} handle={route.b} slug={route.tema} />
  if (route.b) return <LibraryView key={route.b} handle={route.b} />
  if (route.admin || route.view || isAppShell()) return <HostApp route={route} />
  return <Landing />
}

export default function App() {
  const route = useRoute()
  return (
    <ErrorBoundary>
      <ToastProvider>
        <Suspense fallback={<Splash />}>
          <Router route={route} />
        </Suspense>
      </ToastProvider>
    </ErrorBoundary>
  )
}
