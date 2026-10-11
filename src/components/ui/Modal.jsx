import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { pushBackHandler } from '../../lib/native'

/**
 * Modal acessível. No celular vira "bottom sheet".
 * `unstyled` permite que a visão do convidado aplique as cores do tema.
 */
export default function Modal({ open, onClose, title, children, className = '', panelClassName, unstyled = false }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose?.()
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    const popBack = pushBackHandler(() => onClose?.())
    return () => {
      popBack()
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div className={`fixed inset-0 z-[90] flex items-end justify-center sm:items-center sm:p-4 ${className}`}>
      <div className="absolute inset-0 animate-fade-in bg-slate-950/50 backdrop-blur-sm" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={
          panelClassName ??
          `relative max-h-[92dvh] w-full animate-pop-in overflow-y-auto rounded-t-3xl p-5 pb-safe sm:max-w-md sm:rounded-3xl sm:pb-5 ${
            unstyled ? '' : 'bg-white shadow-2xl dark:bg-[#16161f] dark:ring-1 dark:ring-white/10'
          }`
        }
      >
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-current opacity-15 sm:hidden" />
        {title && (
          <div className="mb-4 flex items-start justify-between gap-3">
            <h2 className="text-lg font-bold leading-tight">{title}</h2>
            <button onClick={onClose} className="-m-1 rounded-full p-1.5 opacity-60 transition hover:opacity-100" aria-label="Fechar">
              <X className="h-5 w-5" />
            </button>
          </div>
        )}
        {children}
      </div>
    </div>,
    document.body
  )
}
