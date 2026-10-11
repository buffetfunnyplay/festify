import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { pushBackHandler } from '../lib/native'

/** Galeria em tela cheia com deslizar (swipe), setas e teclado */
export default function Lightbox({ photos, index, onClose, onIndex, title }) {
  const [dx, setDx] = useState(0)
  const start = useRef(null)
  const n = photos.length
  const prev = useCallback(() => onIndex((index - 1 + n) % n), [index, n, onIndex])
  const next = useCallback(() => onIndex((index + 1) % n), [index, n, onIndex])

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') prev()
      if (e.key === 'ArrowRight') next()
    }
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    const popBack = pushBackHandler(onClose)
    return () => {
      document.body.style.overflow = prevOverflow
      window.removeEventListener('keydown', onKey)
      popBack()
    }
  }, [onClose, prev, next])

  const onTouchStart = (e) => (start.current = e.touches[0].clientX)
  const onTouchMove = (e) => start.current != null && setDx(e.touches[0].clientX - start.current)
  const onTouchEnd = () => {
    if (dx > 60) prev()
    else if (dx < -60) next()
    start.current = null
    setDx(0)
  }

  return createPortal(
    <div className="fixed inset-0 z-[95] flex animate-fade-in flex-col bg-black/95 text-white" role="dialog" aria-modal="true" aria-label={title}>
      <div className="pt-safe flex items-center justify-between px-4 py-3">
        <span className="text-sm font-semibold opacity-80">
          {title} · {index + 1}/{n}
        </span>
        <button onClick={onClose} className="grid h-10 w-10 place-items-center rounded-full bg-white/10 hover:bg-white/20" aria-label="Fechar">
          <X className="h-5 w-5" />
        </button>
      </div>
      <div
        className="relative flex flex-1 touch-pan-y select-none items-center justify-center overflow-hidden"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <img
          key={index}
          src={photos[index]}
          alt={`${title} — foto ${index + 1}`}
          className="max-h-full max-w-full animate-fade-in object-contain"
          style={{ transform: `translateX(${dx}px)`, transition: dx ? 'none' : 'transform .2s' }}
          draggable={false}
        />
        {n > 1 && (
          <>
            <button onClick={prev} className="absolute left-2 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/15 backdrop-blur hover:bg-white/25" aria-label="Foto anterior">
              <ChevronLeft className="h-6 w-6" />
            </button>
            <button onClick={next} className="absolute right-2 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/15 backdrop-blur hover:bg-white/25" aria-label="Próxima foto">
              <ChevronRight className="h-6 w-6" />
            </button>
          </>
        )}
      </div>
      {n > 1 && (
        <div className="pb-safe flex justify-center gap-1.5 py-4">
          {photos.map((_, i) => (
            <button key={i} onClick={() => onIndex(i)} className={`h-2 rounded-full transition-all ${i === index ? 'w-6 bg-white' : 'w-2 bg-white/40'}`} aria-label={`Foto ${i + 1}`} />
          ))}
        </div>
      )}
    </div>,
    document.body
  )
}
