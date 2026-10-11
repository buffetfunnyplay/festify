import { useEffect } from 'react'
import { LayoutDashboard, MessageCircle, Shield } from 'lucide-react'
import { goAdmin } from '../hooks/useRoute'
import { whatsappLink } from '../lib/utils'
import { goLibrary } from './themeHelpers'

/** Moldura das páginas públicas de um buffet (biblioteca e página do tema) — branco + azul */
export default function LibraryShell({ settings = {}, isOwner = false, children, bottomPadding = false }) {
  useEffect(() => {
    document.documentElement.classList.remove('dark') // site público sempre claro
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#ffffff')
  }, [])

  return (
    <div className={`min-h-dvh bg-[#f5f9ff] text-slate-900 ${bottomPadding ? 'pb-28' : ''}`}>
      <header className="pt-safe sticky top-0 z-30 border-b border-brand-100/70 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-3 px-4">
          <button onClick={() => goLibrary(settings.handle)} className="flex min-w-0 items-center gap-2.5 rounded-xl" aria-label="Início da biblioteca">
            {settings.logo ? (
              <img src={settings.logo} alt="" className="h-10 w-10 shrink-0 rounded-xl object-cover ring-1 ring-black/5" />
            ) : (
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-brand-400 to-brand-700 text-xl shadow-glow">🎉</span>
            )}
            <span className="truncate font-display text-[1.05rem] font-extrabold leading-tight">{settings.buffetName || 'Temas de festa'}</span>
          </button>
          {settings.whatsapp && (
            <a
              href={whatsappLink(settings.whatsapp, 'Olá! Vim pela biblioteca de temas 🎉')}
              target="_blank"
              rel="noopener noreferrer"
              className="btn shrink-0 bg-emerald-50 px-3 py-2 text-emerald-700 ring-1 ring-emerald-200 hover:bg-emerald-100"
            >
              <MessageCircle className="h-4 w-4" />
              <span className="hidden min-[380px]:inline">Fale conosco</span>
            </a>
          )}
        </div>
        {isOwner && (
          <div className="bg-slate-900 text-white">
            <div className="mx-auto flex max-w-5xl items-center justify-between gap-2 px-4 py-1.5 text-xs font-semibold">
              <span className="flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5 text-amber-300" /> Você é o administrador deste buffet
              </span>
              <button onClick={() => goAdmin()} className="flex items-center gap-1 rounded-lg bg-white/15 px-2.5 py-1 hover:bg-white/25">
                <LayoutDashboard className="h-3.5 w-3.5" /> Painel
              </button>
            </div>
          </div>
        )}
      </header>

      <main>{children}</main>

      <footer className="mx-auto max-w-5xl px-4 pb-8 pt-12 text-center text-xs text-slate-400">
        <p>
          © {new Date().getFullYear()} {settings.buffetName || 'Festify'} · Convites digitais com Festify
        </p>
        {!isOwner && (
          <button onClick={() => goAdmin()} className="mt-2 font-semibold text-slate-400 underline-offset-4 hover:text-slate-600 hover:underline">
            Área do buffet
          </button>
        )}
      </footer>
    </div>
  )
}

/** Tela de carregamento / não encontrado das páginas públicas */
export function PublicMessage({ emoji = '🔎', title, text, action }) {
  return (
    <div className="grid min-h-dvh place-items-center bg-[#f5f9ff] px-6 text-center">
      <div className="max-w-sm">
        <div className="text-5xl">{emoji}</div>
        <h1 className="mt-3 font-display text-2xl font-extrabold">{title}</h1>
        {text && <p className="mt-1 text-slate-500">{text}</p>}
        {action}
      </div>
    </div>
  )
}

export function PublicSpinner() {
  return (
    <div className="grid min-h-dvh place-items-center bg-[#f5f9ff]">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-100 border-t-brand-500" />
    </div>
  )
}
