import { useEffect, useMemo, useState } from 'react'
import { Baby, CalendarDays, Copy, Eye, FileDown, Loader2, Lock, MessageCircle, Search, Send, User, Users } from 'lucide-react'
import { useClientList } from '../hooks/useData'
import { navigate } from '../hooks/useRoute'
import { buildWhatsAppText, downloadGuestPdf } from '../lib/exporters'
import { sendWhatsApp } from '../lib/native'
import { copyText, formatDateLong, formatTime, initials, relativeTime, searchKey, sumRsvps } from '../lib/utils'
import { useToast } from '../components/ui/Toast'

/** Página privada do cliente (pai/mãe): lista de confirmados da festa dele */
export default function ClientListView({ token }) {
  const { data, loading } = useClientList(token)
  const toast = useToast()
  const [query, setQuery] = useState('')
  const [pdfLoading, setPdfLoading] = useState(false)

  useEffect(() => {
    document.documentElement.classList.remove('dark')
    if (data?.party) document.title = `Confirmados · ${data.party.title}`
  }, [data])

  const rsvps = data?.rsvps || []
  const totals = sumRsvps(rsvps)
  const filtered = useMemo(() => {
    const q = searchKey(query)
    if (!q) return rsvps
    return rsvps.filter((r) => searchKey([r.name, ...(r.guests || []).map((g) => g.name)].join(' ')).includes(q))
  }, [rsvps, query])

  if (loading) {
    return (
      <div className="grid min-h-dvh place-items-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="grid min-h-dvh place-items-center bg-slate-50 px-6 text-center">
        <div className="max-w-sm">
          <div className="text-5xl">🔒</div>
          <h1 className="mt-3 text-xl font-bold">Lista não encontrada</h1>
          <p className="mt-1 text-sm text-slate-500">Confira se o link está completo ou peça um novo link ao buffet.</p>
        </div>
      </div>
    )
  }

  const { party } = data

  const pdf = async () => {
    setPdfLoading(true)
    try {
      await downloadGuestPdf(party, rsvps)
    } catch {
      toast('Erro ao gerar o PDF', 'error')
    } finally {
      setPdfLoading(false)
    }
  }

  return (
    <div className="min-h-dvh bg-slate-50 text-slate-900">
      <header className="pt-safe bg-gradient-to-br from-brand-500 to-brand-700 text-white">
        <div className="mx-auto max-w-3xl px-4 pb-6 pt-5">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-white/80">
            <Lock className="h-3.5 w-3.5" /> Lista privada · {data.buffet?.name || 'Festify'}
          </p>
          <h1 className="mt-2 font-display text-2xl font-extrabold leading-tight sm:text-3xl">{party.title}</h1>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-white/85">
            <CalendarDays className="h-4 w-4" /> {formatDateLong(party)} às {formatTime(party)}
          </p>
          <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-xs font-semibold">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-300" />
            </span>
            Atualiza sozinha
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-4 px-4 pb-12 pt-4">
        <div className="grid grid-cols-3 gap-2.5">
          {[
            { label: 'Total', value: totals.total, icon: Users, tone: 'text-brand-600 bg-brand-50' },
            { label: 'Adultos', value: totals.adults, icon: User, tone: 'text-brand-600 bg-brand-50' },
            { label: 'Crianças', value: totals.children, icon: Baby, tone: 'text-sky-600 bg-sky-50' },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl bg-white p-3.5 shadow-soft ring-1 ring-black/5">
              <span className={`grid h-8 w-8 place-items-center rounded-lg ${s.tone}`}>
                <s.icon className="h-4 w-4" />
              </span>
              <p className="mt-2 text-2xl font-extrabold tabular-nums">{s.value}</p>
              <p className="text-xs font-medium text-slate-500">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button onClick={pdf} disabled={!rsvps.length || pdfLoading} className="btn-primary">
            {pdfLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />} Baixar PDF
          </button>
          <button onClick={() => sendWhatsApp(buildWhatsAppText(party, rsvps))} disabled={!rsvps.length} className="btn-whatsapp">
            <Send className="h-4 w-4" /> WhatsApp
          </button>
          <button
            onClick={async () => {
              const ok = await copyText(buildWhatsAppText(party, rsvps))
              toast(ok ? 'Lista copiada!' : 'Não foi possível copiar', ok ? 'success' : 'error')
            }}
            disabled={!rsvps.length}
            className="btn-secondary"
          >
            <Copy className="h-4 w-4" /> Copiar lista
          </button>
          <button onClick={() => navigate({ festa: party.slug })} className="btn-secondary">
            <Eye className="h-4 w-4" /> Ver convite
          </button>
        </div>

        <section className="overflow-hidden rounded-2xl bg-white shadow-soft ring-1 ring-black/5">
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 p-4">
            <h2 className="font-bold">
              Confirmações <span className="text-slate-400">({rsvps.length})</span>
            </h2>
            <div className="relative w-44 sm:w-64">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input className="input py-2 pl-9" placeholder="Buscar..." value={query} onChange={(e) => setQuery(e.target.value)} />
            </div>
          </div>
          {rsvps.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <div className="text-4xl">💌</div>
              <p className="mt-2 font-semibold">Ainda não há confirmações</p>
              <p className="text-sm text-slate-500">Assim que alguém confirmar, aparece aqui.</p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {filtered.map((r) => (
                <li key={r.id} className="flex items-start gap-3 p-4">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand-400 to-brand-700 text-sm font-bold text-white">
                    {initials(r.name)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold leading-tight">{r.name}</p>
                    <p className="mt-0.5 text-sm text-slate-500">
                      {r.adults} {r.adults === 1 ? 'adulto' : 'adultos'} · {r.children} {r.children === 1 ? 'criança' : 'crianças'}
                    </p>
                    {r.guests?.length > 0 && (
                      <ul className="mt-2 flex flex-wrap gap-1.5">
                        {r.guests.map((g, i) => (
                          <li
                            key={i}
                            className={`inline-flex max-w-full items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold ${g.kind === 'child' ? 'bg-sky-50 text-sky-700' : 'bg-slate-100 text-slate-700'}`}
                          >
                            {g.kind === 'child' ? <Baby className="h-3 w-3 shrink-0" /> : <User className="h-3 w-3 shrink-0" />}
                            <span className="truncate">{g.name}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                    {r.message && (
                      <p className="mt-2 flex gap-1.5 rounded-xl bg-slate-50 px-3 py-2 text-sm italic text-slate-600">
                        <MessageCircle className="mt-0.5 h-4 w-4 shrink-0 not-italic text-slate-400" /> “{r.message}”
                      </p>
                    )}
                    <p className="mt-1 text-xs text-slate-400">{relativeTime(r.createdAt)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  )
}
