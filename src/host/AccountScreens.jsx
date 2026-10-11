import { useEffect, useState } from 'react'
import { Ban, Clock, Loader2, LogOut, RefreshCw, Send, Undo2 } from 'lucide-react'
import { repo } from '../services/repository'
import { refreshAccount } from '../hooks/useData'
import { buffetHandle } from '../lib/auth'
import { publicUrl } from '../lib/utils'
import { AuthLayout } from './Login'

const who = (session, member) =>
  member?.method === 'senha' ? 'login com nome do buffet e senha' : session?.user?.email || member?.email || 'sua conta Google'

async function logout() {
  await repo.signOut()
  refreshAccount()
}

/** Logou, mas ainda não disse qual é o buffet */
export function Onboarding({ session }) {
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const handle = buffetHandle(name)

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    if (handle.length < 3) return setError('Digite o nome do buffet (pelo menos 3 letras).')
    setBusy(true)
    try {
      await repo.requestAccess(name, 'google')
      await refreshAccount()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthLayout back={false}>
      <form onSubmit={submit} className="card space-y-4 p-6">
        <div className="text-center">
          <div className="text-4xl">🎈</div>
          <h1 className="mt-2 text-xl font-extrabold">Qual é o nome do seu buffet?</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Conectado como {who(session)}</p>
        </div>
        <div>
          <label className="label" htmlFor="ob-name">
            Nome do buffet
          </label>
          <input id="ob-name" className="input" placeholder="Ex.: Buffet Magia & Farra" value={name} onChange={(e) => setName(e.target.value)} autoFocus maxLength={80} />
          {handle.length >= 3 && (
            <p className="hint break-all">
              Endereço da sua biblioteca: <b>{publicUrl({ b: handle })}</b>
            </p>
          )}
        </div>
        {error && <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">{error}</p>}
        <button type="submit" disabled={busy} className="btn-primary w-full py-3">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Pedir acesso
        </button>
        <p className="text-center text-xs text-slate-500">Se o buffet já existir, você entra na equipe dele após a liberação.</p>
        <button type="button" onClick={logout} className="btn-ghost w-full text-sm">
          <LogOut className="h-4 w-4" /> Sair / usar outra conta
        </button>
      </form>
    </AuthLayout>
  )
}

/** Pedido enviado: aguardando o dono da plataforma liberar */
export function Pending({ session, account }) {
  const [busy, setBusy] = useState(false)
  const [checked, setChecked] = useState(false)

  // Confere sozinho a cada 15 s
  useEffect(() => {
    const t = setInterval(() => document.visibilityState === 'visible' && refreshAccount(), 15000)
    return () => clearInterval(t)
  }, [])

  const check = async () => {
    setBusy(true)
    await refreshAccount()
    setBusy(false)
    setChecked(true)
  }

  const cancel = async () => {
    setBusy(true)
    try {
      await repo.cancelRequest()
      await refreshAccount()
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthLayout back={false}>
      <div className="card p-6 text-center">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300">
          <Clock className="h-7 w-7" />
        </span>
        <h1 className="mt-3 text-xl font-extrabold">Aguardando liberação</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Pedido de acesso ao <b className="text-slate-800 dark:text-slate-100">{account?.buffet?.name}</b> enviado. Assim que o administrador do Festify liberar, o
          painel abre sozinho.
        </p>
        <p className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-500 dark:bg-white/5">Conta: {who(session, account?.member)}</p>
        <div className="mt-5 grid gap-2">
          <button onClick={check} disabled={busy} className="btn-primary">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Já fui liberado — atualizar
          </button>
          {checked && !busy && <p className="text-xs text-slate-500">Ainda pendente. Avise o administrador do Festify.</p>}
          <button onClick={cancel} disabled={busy} className="btn-secondary">
            <Undo2 className="h-4 w-4" /> Cancelar pedido (digitei o nome errado)
          </button>
          <button onClick={logout} className="btn-ghost text-sm">
            <LogOut className="h-4 w-4" /> Sair
          </button>
        </div>
      </div>
    </AuthLayout>
  )
}

export function Blocked({ account }) {
  return (
    <AuthLayout back={false}>
      <div className="card p-6 text-center">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-rose-100 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300">
          <Ban className="h-7 w-7" />
        </span>
        <h1 className="mt-3 text-xl font-extrabold">Acesso bloqueado</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          O acesso {account?.buffet?.name ? <>ao <b>{account.buffet.name}</b> </> : ''}está bloqueado. Fale com o administrador do Festify.
        </p>
        <button onClick={logout} className="btn-secondary mt-5 w-full">
          <LogOut className="h-4 w-4" /> Sair
        </button>
      </div>
    </AuthLayout>
  )
}
