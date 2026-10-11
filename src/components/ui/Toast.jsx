import { createContext, useCallback, useContext, useRef, useState } from 'react'
import { CircleCheck, Info, TriangleAlert } from 'lucide-react'

const ToastCtx = createContext(() => {})

const ICONS = { success: CircleCheck, error: TriangleAlert, info: Info }
const COLORS = { success: 'text-emerald-400', error: 'text-rose-400', info: 'text-sky-400' }

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null)
  const timer = useRef()

  const show = useCallback((message, type = 'success', duration = 2600) => {
    clearTimeout(timer.current)
    setToast({ message, type, id: Date.now() })
    timer.current = setTimeout(() => setToast(null), duration)
  }, [])

  const Icon = toast ? ICONS[toast.type] || Info : null

  return (
    <ToastCtx.Provider value={show}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-0 z-[100]">
        {toast && (
          <div
            key={toast.id}
            role="status"
            className="absolute bottom-[calc(env(safe-area-inset-bottom)+6.5rem)] md:bottom-6 left-1/2 flex w-max max-w-[92vw] animate-toast-in items-center gap-2.5 rounded-2xl bg-slate-900/95 px-4 py-3 text-sm font-medium text-white shadow-2xl ring-1 ring-white/10 backdrop-blur"
            style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
          >
            <Icon className={`h-5 w-5 shrink-0 ${COLORS[toast.type]}`} />
            <span>{toast.message}</span>
          </div>
        )}
      </div>
    </ToastCtx.Provider>
  )
}

export const useToast = () => useContext(ToastCtx)
