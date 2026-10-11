import { designOf } from '../lib/designs'

/** Miniatura da festa: foto de capa ou cor do convite */
export default function PartyThumb({ party, className = '' }) {
  const design = designOf(party)
  if (party.coverImage) {
    return <img src={party.coverImage} alt="" className={`h-full w-full object-cover ${className}`} loading="lazy" decoding="async" />
  }
  return (
    <div className={`grid h-full w-full place-items-center ${className}`} style={{ background: `linear-gradient(135deg, ${design.page}, ${design.swatch[1]})` }}>
      <span className="text-5xl drop-shadow-md">{design.emoji}</span>
    </div>
  )
}
