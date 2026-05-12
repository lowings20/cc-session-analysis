interface MagicMoment {
  title: string
  quote: string | null
  context: string
}

interface Props {
  moment: MagicMoment
  caseShort: string
  date: string
}

export default function MagicMomentCard({ moment, caseShort, date }: Props) {
  return (
    <div className="bg-[#0f172a] border border-[#334155] rounded-lg p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-sm font-semibold text-[#e2e8f0] leading-snug">{moment.title}</h3>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[10px] text-[#475569] px-2 py-0.5 rounded bg-[#1e293b] border border-[#334155]">
            {caseShort}
          </span>
          <span className="text-[10px] text-[#475569]">{date.replace(', 2026', '')}</span>
        </div>
      </div>
      {moment.quote && (
        <blockquote className="border-l-2 border-[#60a5fa] pl-3">
          <p className="text-sm text-[#94a3b8] italic leading-relaxed">
            &ldquo;{moment.quote}&rdquo;
          </p>
        </blockquote>
      )}
      <p className="text-xs text-[#64748b] leading-relaxed">{moment.context}</p>
    </div>
  )
}
