import { useEffect, useState } from 'react'
import { ArrowLeft, Eye, EyeOff, KeyRound, Loader2, LogIn, Mail, Sparkles, UserPlus } from 'lucide-react'
import { repo, isDemo } from '../services/repository'
import { navigate } from '../hooks/useRoute'
import { refreshAccount, withAuthBusy } from '../hooks/useData'
import { isAppShell, isNative } from '../lib/native'
import { buffetHandle, isDesktopApp } from '../lib/auth'
import Logo from './Logo'

export function AuthLayout({ children, back = true }) {
  return (
    <div className="grid min-h-dvh place-items-center bg-[radial-gradient(ellipse_at_top,color-mix(in_srgb,var(--brand)_16%,transparent),transparent_60%)] px-4 py-10 dark:bg-[#0b0b12]">
      <div className="pt-safe w-full max-w-sm">
        <div className="mb-6 flex justify-center">
          <Logo />
        </div>
        {children}
        {back && !isAppShell() && (
          <button onClick={() => navigate({})} className="btn-ghost mx-auto mt-4 flex">
            <ArrowLeft className="h-4 w-4" /> Voltar ao site
          </button>
        )}
      </div>
    </div>
  )
}

function ErrorBox({ children }) {
  if (!children) return null
  return (
    <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-600 dark:bg-rose-500/10 dark:text-rose-300" role="alert">
      {children}
    </p>
  )
}

/** Tela de entrada do painel do buffet */
export default function Login() {
  const desktop = isDesktopApp()
  const showGoogle = repo.supportsGoogle && !desktop
  const [mode, setMode] = useState(showGoogle ? 'google' : 'login') // google · login · signup
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [waitingBrowser, setWaitingBrowser] = useState(false)

  useEffect(() => {
    document.title = 'Entrar · Festify'
    return repo.onAuthError((msg) => {
      setError(msg)
      setBusy(false)
      setWaitingBrowser(false)
    })
  }, [])

  // No APK: se a pessoa voltar do navegador sem concluir, libera o botão de novo
  useEffect(() => {
    if (!waitingBrowser) return
    const onVisible = () => document.visibilityState === 'visible' && setTimeout(() => setBusy(false), 1500)
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [waitingBrowser])

  const google = async () => {
    setError('')
    setBusy(true)
    try {
      await repo.signInWithGoogle()
      if (isNative()) setWaitingBrowser(true)
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  if (isDemo) {
    return (
      <AuthLayout>
        <div className="card p-6 text-center">
          <h1 className="text-xl font-extrabold">Área do buffet</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Você está no <b>modo demonstração</b>: os dados ficam só neste aparelho.
          </p>
          <button
            onClick={async () => {
              await repo.signInDemo()
              refreshAccount()
            }}
            className="btn-primary mt-5 w-full py-3"
          >
            <Sparkles className="h-4 w-4" /> Entrar no modo demonstração
          </button>
          <p className="mt-4 rounded-xl bg-amber-50 p-3 text-left text-xs leading-relaxed text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">
            ⚠️ No modo demonstração, confirmações feitas no celular dos convidados <b>não chegam</b> ao seu app. Para usar de verdade, conecte o
            Supabase (veja o tutorial).
          </p>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout>
      <div className="card p-6">
        <h1 className="text-center text-xl font-extrabold">Área do buffet</h1>
        <p className="mt-1 text-center text-sm text-slate-500 dark:text-slate-400">Entre uma vez — o acesso fica salvo neste aparelho.</p>

        {mode === 'google' ? (
          <div className="mt-6 space-y-3">
            <button onClick={google} disabled={busy} className="btn-primary w-full py-3.5 text-base">
              {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Mail className="h-5 w-5" />} Entrar com Google (Gmail)
            </button>
            {waitingBrowser && busy && (
              <p className="text-center text-xs text-slate-500">Conclua o login na janela do Google. Depois você volta para o app sozinho.</p>
            )}
            <ErrorBox>{error}</ErrorBox>
            {repo.supportsPassword && (
              <button onClick={() => (setMode('login'), setError(''))} className="btn-ghost w-full text-sm">
                <KeyRound className="h-4 w-4" /> Entrar com nome do buffet e senha
              </button>
            )}
          </div>
        ) : (
          <PasswordForm mode={mode} setMode={setMode} error={error} setError={setError} />
        )}

        {mode !== 'google' && showGoogle && (
          <button onClick={() => (setMode('google'), setError(''))} className="btn-ghost mt-2 w-full text-sm">
            <Mail className="h-4 w-4" /> Voltar para o login com Google
          </button>
        )}
      </div>
      <p className="mt-4 text-center text-xs leading-relaxed text-slate-500 dark:text-slate-400">
        Primeiro acesso? Depois de entrar, seu pedido vai para aprovação do administrador do Festify.
      </p>
    </AuthLayout>
  )
}

function PasswordForm({ mode, setMode, error, setError }) {
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const signup = mode === 'signup'
  const handle = buffetHandle(name)

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    if (handle.length < 3) return setError('Digite o nome do buffet (pelo menos 3 letras).')
    if (password.length < 6) return setError('A senha precisa ter pelo menos 6 caracteres.')
    if (signup && password !== confirm) return setError('As senhas não são iguais.')
    setBusy(true)
    try {
      await withAuthBusy(() => (signup ? repo.signUpWithPassword(name, password) : repo.signInWithPassword(name, password)))
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="mt-5 space-y-3">
      <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1 dark:bg-white/5">
        {[
          ['login', 'Entrar'],
          ['signup', 'Primeiro acesso'],
        ].map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => (setMode(id), setError(''))}
            className={`rounded-lg py-2 text-sm font-semibold transition ${mode === id ? 'bg-white text-slate-900 shadow-sm dark:bg-white/15 dark:text-white' : 'text-slate-500'}`}
          >
            {label}
          </button>
        ))}
      </div>
      <div>
        <label className="label" htmlFor="buffet-name">
          Nome do buffet
        </label>
        <input
          id="buffet-name"
          className="input"
          autoComplete="username"
          placeholder="Ex.: Buffet Magia & Farra"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        {signup && handle.length >= 3 && <p className="hint">Seu login será: <b>{handle}</b></p>}
      </div>
      <div>
        <label className="label" htmlFor="buffet-pass">
          {signup ? 'Crie uma senha' : 'Senha'}
        </label>
        <div className="relative">
          <input
            id="buffet-pass"
            type={show ? 'text' : 'password'}
            className="input pr-11"
            autoComplete={signup ? 'new-password' : 'current-password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
          />
          <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-slate-400" aria-label={show ? 'Esconder senha' : 'Mostrar senha'}>
            {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>
      {signup && (
        <div>
          <label className="label" htmlFor="buffet-pass2">
            Repita a senha
          </label>
          <input id="buffet-pass2" type={show ? 'text' : 'password'} className="input" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
        </div>
      )}
      <ErrorBox>{error}</ErrorBox>
      <button type="submit" disabled={busy} className="btn-primary w-full py-3">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : signup ? <UserPlus className="h-4 w-4" /> : <LogIn className="h-4 w-4" />}
        {signup ? 'Criar acesso e pedir liberação' : 'Entrar'}
      </button>
    </form>
  )
}
