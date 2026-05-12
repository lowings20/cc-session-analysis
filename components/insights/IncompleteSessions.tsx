import type { SessionPoint } from '@/lib/insights'
import { AlertTriangle } from 'lucide-react'

export default function IncompleteSessions({ points }: { points: SessionPoint[] }) {
  const incomplete = points.filter(p => p.incomplete)

  if (incomplete.length === 0) {
    return (
      <div className="rounded-lg bg-[#1e293b] border border-[#334155] px-6 py-8 text-center">
        <p className="text-sm text-[#4ade80]">All sessions completed all chapters.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-[#94a3b8]">
        {incomplete.length} session{incomplete.length !== 1 ? 's' : ''} completed fewer chapters than the runsheet expected.
      </p>
      <div className="rounded-lg bg-[#1e293b] border border-[#334155] overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-[#334155]">
              <th className="px-5 py-2.5 text-left text-[#94a3b8] font-medium">Session</th>
              <th className="px-4 py-2.5 text-left text-[#94a3b8] font-medium">Case</th>
              <th className="px-4 py-2.5 text-left text-[#94a3b8] font-medium">Date</th>
              <th className="px-4 py-2.5 text-center text-[#94a3b8] font-medium">Chapters</th>
              <th className="px-5 py-2.5 text-right text-[#94a3b8] font-medium">vs schedule</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#334155]/50">
            {incomplete.map(p => (
              <tr key={p.sessionId} className="hover:bg-[#334155]/20 transition-colors">
                <td className="px-5 py-2.5">
                  <a
                    href={`/session/${p.sessionId}`}
                    className="text-[#e2e8f0] hover:text-[#a78bfa] transition-colors font-medium"
                  >
                    {p.cohort}
                  </a>
                </td>
                <td className="px-4 py-2.5 text-[#94a3b8]">{p.caseTitle}</td>
                <td className="px-4 py-2.5 text-[#94a3b8]">{p.date}</td>
                <td className="px-4 py-2.5 text-center">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-amber-900/40 text-amber-300 border border-amber-800/50">
                    <AlertTriangle size={9} />
                    {p.actualChapters}/{p.expectedChapters}
                  </span>
                </td>
                <td className="px-5 py-2.5 text-right">
                  {p.endDeltaMin === null ? (
                    <span className="text-[#475569]">—</span>
                  ) : p.endDeltaMin > 0 ? (
                    <span className="text-red-400">+{p.endDeltaMin}m over</span>
                  ) : (
                    <span className="text-green-400">{Math.abs(p.endDeltaMin)}m under</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
