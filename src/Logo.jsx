export default function Logo({ className = '', compact = false }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <span className="relative grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-brand-400 to-brand-800 shadow-glow">
        <svg viewBox="0 0 24 24" className="h-5 w-5 text-white" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="7" width="18" height="13" rx="2.5" />
          <path d="m3.5 8 8.5 6.5L20.5 8" />
          <path d="M8 4.5 7 2.5M12 4V2M16 4.5l1-2" />
        </svg>
        <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-rose-400 ring-2 ring-white dark:ring-[#0b0b12]" />
      </span>
      {!compact && (
        <span className="bg-gradient-to-r from-brand-500 to-brand-700 bg-clip-text font-display text-[1.45rem] font-extrabold tracking-tight text-transparent">Festify</span>
      )}
    </span>
  )
}
