import { useEffect } from 'react'
import { usePublicBuffet, useThemeRecord } from '../hooks/useData'
import { canGoBack, navigate } from '../hooks/useRoute'
import { GuestInvite } from '../guest/GuestView'
import { PublicSpinner } from './LibraryShell'
import { sampleParty } from './themeHelpers'

/** Demonstração completa (envelope animado + convite) de um tema da biblioteca */
export default function ThemeDemo({ handle, slug }) {
  const { buffet, settings, loading: loadingBuffet } = usePublicBuffet(handle)
  const { theme, loading } = useThemeRecord({ slug, buffetId: buffet?.id, wait: !buffet })
  const notFound = !loadingBuffet && (!buffet || (!loading && (!theme || theme.buffetId !== buffet.id)))

  useEffect(() => {
    if (notFound) navigate({ b: handle, tema: slug }, { replace: true })
  }, [notFound, handle, slug])

  if (loadingBuffet || loading || notFound) return <PublicSpinner />

  return (
    <GuestInvite
      key={theme.id}
      party={sampleParty(theme, settings)}
      demo
      banner={{
        label: `Demonstração · ${theme.name}`,
        backLabel: 'Voltar ao tema',
        onBack: () => (canGoBack() ? window.history.back() : navigate({ b: handle, tema: slug }, { replace: true })),
      }}
    />
  )
}
