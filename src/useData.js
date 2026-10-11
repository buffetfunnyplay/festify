// Hooks de dados — reagem em tempo real às mudanças do repositório
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { repo, ready } from '../services/repository'
import { sumRsvps } from '../lib/utils'

/**
 * Carrega dados e recarrega quando chegar um aviso relevante.
 * `when(e)` decide quais avisos disparam recarga. Recargas simultâneas são agrupadas.
 */
function useLive(loader, deps, when) {
  const key = JSON.stringify(deps)
  const [state, setState] = useState({ data: undefined, loading: true, error: null, key })
  const gen = useRef(0)
  const whenRef = useRef(when)
  whenRef.current = when

  // Vale sempre a resposta da recarga mais recente
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const load = useCallback(async () => {
    const my = ++gen.current
    try {
      await ready
      const data = await loader()
      if (my === gen.current) setState({ data, loading: false, error: null, key })
    } catch (error) {
      if (my === gen.current) setState((s) => ({ ...s, loading: false, error, key }))
    }
  }, deps)

  useEffect(() => {
    load()
    return repo.subscribe((e) => whenRef.current(e) && load())
  }, [load])

  // Enquanto os parâmetros mudaram e a resposta nova não chegou, está "carregando"
  const stale = state.key !== key
  return { data: stale ? undefined : state.data, loading: state.loading || stale, error: state.error, reload: load }
}

// ── Conta logada (compartilhada por todas as telas) ──────────
let accState = { loading: true, busy: false, session: null, account: null, error: null }
const accListeners = new Set()
let accStarted = false
let accRunning = null

function setAcc(next) {
  accState = { ...accState, ...next }
  accListeners.forEach((l) => l())
}

let accAgain = false

/** Recarrega a conta. Se já estiver carregando, carrega de novo no fim (nunca devolve dado velho). */
export function refreshAccount() {
  if (accRunning) {
    accAgain = true
    return accRunning
  }
  accRunning = (async () => {
    do {
      accAgain = false
      try {
        await ready
        const session = await repo.getSession()
        const account = session ? await repo.getAccount() : null
        if (!accAgain) setAcc({ loading: false, session, account, error: null })
      } catch (error) {
        if (!accAgain) setAcc({ loading: false, error })
      }
    } while (accAgain)
    accRunning = null
  })()
  return accRunning
}

/** Enquanto um cadastro/login está em andamento, o painel espera (evita piscar telas) */
export async function withAuthBusy(fn) {
  setAcc({ busy: true })
  try {
    return await fn()
  } finally {
    await refreshAccount()
    setAcc({ busy: false })
  }
}

function startAccount() {
  if (accStarted) return
  accStarted = true
  refreshAccount()
  repo.onAuthChange(() => refreshAccount())
  repo.subscribe((e) => e.type === 'account' && refreshAccount())
}

/**
 * { loading, session, account, active, pending, blocked, isSuper, buffet, refresh }
 *   active → login liberado e buffet ativo (pode usar o painel)
 */
export function useAccount() {
  startAccount()
  const s = useSyncExternalStore(
    (l) => {
      accListeners.add(l)
      return () => accListeners.delete(l)
    },
    () => accState
  )
  const member = s.account?.member
  const buffet = s.account?.buffet
  const blocked = member?.status === 'blocked' || buffet?.status === 'blocked'
  const active = !blocked && member?.status === 'active' && buffet?.status === 'active'
  return {
    ...s,
    member,
    buffet,
    active,
    blocked,
    pending: Boolean(member) && !active && !blocked,
    isSuper: Boolean(s.account?.super),
    refresh: refreshAccount,
  }
}

/** O visitante é o dono deste buffet (mostra atalhos de administrador no site público) */
export function useIsOwner(buffetId) {
  const { active, buffet } = useAccount()
  return Boolean(active && buffetId && buffet?.id === buffetId)
}

// ── Painel do buffet ─────────────────────────────────────────
const isAdminEvent = () => true

/** Lista de festas + totais de RSVP de cada uma (para o painel) */
export function useParties() {
  const { data, loading, error, reload } = useLive(
    async () => {
      const [parties, stats] = await Promise.all([repo.listParties(), repo.listRsvpTotals()])
      return { parties, stats }
    },
    [],
    isAdminEvent
  )
  return { parties: data?.parties || [], stats: data?.stats || {}, loading, error, reload }
}

/** Uma festa (painel: por id · convidado: por slug) */
export function useParty({ id, slug }) {
  const { data, loading, error } = useLive(
    () => (id ? repo.getParty(id) : repo.getPartyBySlug(slug)),
    [id, slug],
    (e) => e.type === 'party' || (id && e.type === 'poll')
  )
  return { party: data || null, loading, error }
}

/** RSVPs de uma festa, com totais e destaque das novas entradas (tempo real) */
export function useRsvps(partyId) {
  const [fresh, setFresh] = useState(new Set())
  const known = useRef(null)
  const { data, loading, reload, error } = useLive(
    () => (partyId ? repo.listRsvps(partyId) : []),
    [partyId],
    (e) => e.type === 'poll' || (e.type === 'rsvp' && (!e.partyId || e.partyId === partyId))
  )
  const rsvps = data || []

  useEffect(() => {
    if (!data) return
    const ids = new Set(data.map((r) => r.id))
    if (known.current) {
      const added = data.filter((r) => !known.current.has(r.id)).map((r) => r.id)
      if (added.length) setFresh(new Set(added))
    }
    known.current = ids
  }, [data])

  return { rsvps, loading, error, freshIds: fresh, totals: sumRsvps(rsvps), reload }
}

/** Ajustes do buffet logado (nome, logo, banner, WhatsApp...) */
export function useSettings() {
  const { data, loading, reload } = useLive(() => repo.getSettings(), [], (e) => e.type === 'settings')
  return { settings: data || {}, loading, reload }
}

/** Temas de um buffet (público: passe buffetId · painel: sem argumento) */
export function useThemes(buffetId, { enabled = true } = {}) {
  const { data, loading, error, reload } = useLive(
    () => (enabled ? repo.listThemes(buffetId) : []),
    [buffetId, enabled],
    (e) => e.type === 'theme'
  )
  return { themes: data || [], loading: enabled && loading, error, reload }
}

/** Um tema por id ou slug (slug + buffetId no site público) */
export function useThemeRecord({ id, slug, buffetId, wait = false }) {
  const { data, loading } = useLive(
    () => (wait ? new Promise(() => {}) : id ? repo.getTheme(id) : slug ? repo.getThemeBySlug(slug, buffetId) : null),
    [id, slug, buffetId, wait],
    (e) => e.type === 'theme'
  )
  return { theme: data || null, loading }
}

/** Buffet público pelo endereço (?b=handle) */
export function usePublicBuffet(handle) {
  const { data, loading } = useLive(() => repo.getPublicBuffet(handle), [handle], (e) => e.type === 'settings')
  const buffet = data || null
  return {
    buffet,
    loading,
    settings: buffet ? { ...buffet.data, buffetName: buffet.name, handle: buffet.handle, buffetId: buffet.id } : {},
  }
}

/** Lista privada do cliente (link com token) — atualiza sozinha */
export function useClientList(token) {
  const { data, loading, reload } = useLive(
    () => repo.getClientList(token),
    [token],
    (e) => e.type === 'poll' || e.type === 'rsvp' || e.type === 'party'
  )
  // Plano B extra (modo demonstração não tem o aviso periódico)
  useEffect(() => {
    const t = setInterval(() => document.visibilityState === 'visible' && reload(), 15000)
    return () => clearInterval(t)
  }, [reload])
  return { data: data || null, loading }
}
