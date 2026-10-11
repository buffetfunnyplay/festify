import { TriangleAlert } from 'lucide-react'
import Modal from './Modal'

export default function ConfirmDialog({ open, title, description, confirmLabel = 'Confirmar', onConfirm, onClose, danger }) {
  return (
    <Modal open={open} onClose={onClose}>
      <div className="text-center">
        <div
          className={`mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full ${
            danger ? 'bg-rose-100 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300' : 'bg-brand-100 text-brand-600'
          }`}
        >
          <TriangleAlert className="h-6 w-6" />
        </div>
        <h2 className="text-lg font-bold">{title}</h2>
        {description && <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">{description}</p>}
        <div className="mt-6 grid grid-cols-2 gap-2">
          <button className="btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button
            className={danger ? 'btn bg-rose-600 text-white hover:bg-rose-700' : 'btn-primary'}
            onClick={() => {
              onConfirm?.()
              onClose?.()
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  )
}
