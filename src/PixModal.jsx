import { useState } from 'react'
import { Check, Copy, Gift, Heart } from 'lucide-react'
import Modal from '../components/ui/Modal'
import { PIX_TYPES, copyText } from '../lib/utils'

export default function PixModal({ open, onClose, party, design }) {
  const [copied, setCopied] = useState(false)
  const typeLabel = PIX_TYPES.find((t) => t.id === party.pixType)?.label || 'Chave'

  const copy = async () => {
    const ok = await copyText(String(party.pixKey || '').trim())
    setCopied(ok ? 'ok' : 'fail')
    if (ok) navigator.vibrate?.(30)
  }

  const close = () => {
    setCopied(false)
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={close}
      className={design.className}
      panelClassName="g-sheet relative max-h-[92dvh] w-full animate-pop-in overflow-y-auto rounded-t-[1.75rem] p-5 pb-safe shadow-2xl sm:max-w-md sm:rounded-[1.75rem] sm:pb-6"
    >
      <div className="text-center">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-full text-white" style={{ background: 'var(--g-primary)' }}>
          <Gift className="h-7 w-7" />
        </span>
        <h2 className="g-heading mt-3 text-xl">Presentear via Pix</h2>
        <p className="g-heart-note mx-auto mt-2 inline-flex items-center gap-1.5 px-3 py-1 text-sm">
          <Heart className="h-4 w-4" fill="currentColor" /> Valor de coração
        </p>
        <p className="g-muted mt-2 text-sm">Qualquer quantia é recebida com muito carinho. Obrigado! 💝</p>
      </div>

      <div className="g-soft mt-5 space-y-3 rounded-2xl p-4">
        {party.pixHolder && (
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="g-muted">Titular</span>
            <span className="text-right font-semibold">{party.pixHolder}</span>
          </div>
        )}
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="g-muted">Tipo de chave</span>
          <span className="font-semibold">{typeLabel}</span>
        </div>
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="g-muted">Valor</span>
          <span className="font-bold" style={{ color: 'var(--g-accent)' }}>
            De coração ❤️
          </span>
        </div>
        <div>
          <span className="g-muted text-sm">Chave Pix</span>
          <div className="g-input mt-1 select-all break-all font-mono text-[0.95rem] font-semibold" style={{ padding: '0.75rem 0.9rem' }}>
            {party.pixKey}
          </div>
        </div>
      </div>

      <button onClick={copy} className="g-btn g-btn-primary mt-4 w-full">
        {copied === 'ok' ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
        {copied === 'ok' ? 'Chave copiada!' : 'Copiar chave Pix'}
      </button>

      {copied === 'ok' && (
        <p className="mt-3 animate-pop-in rounded-xl bg-emerald-500/15 px-3 py-2.5 text-center text-sm font-semibold text-emerald-700" role="status">
          ✅ Agora é só abrir o app do seu banco, escolher <b>Pix</b> e colar.
        </p>
      )}
      {copied === 'fail' && (
        <p className="mt-3 text-center text-sm" role="status">
          Não conseguimos copiar automaticamente. Toque e segure a chave acima para copiar.
        </p>
      )}

      <button onClick={close} className="g-muted mt-3 w-full py-2 text-sm font-semibold">
        Fechar
      </button>
    </Modal>
  )
}
