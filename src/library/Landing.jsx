import { useEffect } from 'react'
import { LayoutDashboard, LibraryBig, LogIn, PartyPopper, Smartphone, Users } from 'lucide-react'
import { useAccount } from '../hooks/useData'
import { goAdmin, navigate } from '../hooks/useRoute'
import { isDemo } from '../services/repository'
import Logo from '../host/Logo'
import Sky from '../guest/Sky'

/** Página inicial do site (sem buffet escolhido) */
export default function Landing() {
  const { active, buffet } = useAccount()

  useEffect(() => {
    document.title = 'Festify · Convites digitais para buffets'
    document.documentElement.classList.remove('dark')
  }, [])

  return (
    <div className="relative min-h-dvh overflow-hidden">
      <Sky balloonColors={['#3b82f6', '#f472b6', '#ef4444', '#facc15', '#34d399', '#ffffff']} />
      <div className="pt-safe pb-safe relative z-10 mx-auto flex min-h-dvh max-w-md flex-col justify-center px-5 py-10">
        <div className="rounded-[2rem] bg-white/92 p-6 shadow-2xl ring-1 ring-white/60 backdrop-blur-xl sm:p-8">
          <Logo />
          <h1 className="mt-5 font-display text-[1.9rem] font-extrabold leading-tight tracking-tight text-slate-900">
            Convites digitais animados para o seu buffet
          </h1>
          <ul className="mt-4 space-y-2.5 text-[0.95rem] text-slate-600">
            <li className="flex gap-2.5">
              <LibraryBig className="mt-0.5 h-5 w-5 shrink-0 text-brand-500" /> Biblioteca de temas para os clientes escolherem
            </li>
            <li className="flex gap-2.5">
              <PartyPopper className="mt-0.5 h-5 w-5 shrink-0 text-brand-500" /> Convite com envelope animado, contagem regressiva e Pix
            </li>
            <li className="flex gap-2.5">
              <Users className="mt-0.5 h-5 w-5 shrink-0 text-brand-500" /> Lista de presença com o nome de cada convidado, ao vivo
            </li>
            <li className="flex gap-2.5">
              <Smartphone className="mt-0.5 h-5 w-5 shrink-0 text-brand-500" /> App para celular, tablet e computador
            </li>
          </ul>

          <div className="mt-6 grid gap-2.5">
            {active ? (
              <>
                <button onClick={() => goAdmin()} className="btn-primary py-3 text-base">
                  <LayoutDashboard className="h-5 w-5" /> Abrir meu painel
                </button>
                <button onClick={() => navigate({ b: buffet.handle })} className="btn-secondary py-3 text-base">
                  <LibraryBig className="h-5 w-5" /> Ver minha biblioteca
                </button>
              </>
            ) : (
              <button onClick={() => goAdmin()} className="btn-primary py-3 text-base">
                <LogIn className="h-5 w-5" /> Área do buffet
              </button>
            )}
            {isDemo && !active && (
              <button onClick={() => navigate({ b: 'demo' })} className="btn-secondary py-3 text-base">
                <LibraryBig className="h-5 w-5" /> Ver biblioteca de exemplo
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
