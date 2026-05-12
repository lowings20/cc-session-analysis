import type { StaffStat } from '@/lib/insights'

function DeltaCell({ v }: { v: number | null }) {
  if (v === null) return <span className="text-[#475569]">—</span>
  if (v > 2) return <span className="text-red-400">+{v}m</span>
  if (v < -2) return <span className="text-green-400">{v}m</span>
  return <span className="text-[#94a3b8]">{v > 0 ? `+${v}` : v}m</span>
}

export default function StaffTable({ stats }: { stats: StaffStat[] }) {
  if (stats.length === 0) {
    return <p className="text-xs text-[#94a3b8]">No data matched.</p>
  }

  return (
    <table className="w-full text-xs">
      <thead>
        <tr className="border-b border-[#334155]">
          <th className="px-4 py-2.5 text-left text-[#94a3b8] font-medium">Name</th>
          <th className="px-3 py-2.5 text-center text-[#94a3b8] font-medium">Sessions</th>
          <th className="px-3 py-2.5 text-center text-[#94a3b8] font-medium">Avg intro delta</th>
          <th className="px-3 py-2.5 text-center text-[#94a3b8] font-medium">Avg overrun</th>
          <th className="px-3 py-2.5 text-center text-[#94a3b8] font-medium">% overran</th>
          <th className="px-4 py-2.5 text-left text-[#94a3b8] font-medium">Cases</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-[#334155]/50">
        {stats.map(s => (
          <tr key={s.name} className="hover:bg-[#334155]/20 transition-colors">
            <td className="px-4 py-2.5 text-[#e2e8f0] font-medium">{s.name}</td>
            <td className="px-3 py-2.5 text-center text-[#94a3b8]">{s.sessions}</td>
            <td className="px-3 py-2.5 text-center"><DeltaCell v={s.avgIntroDelta} /></td>
            <td className="px-3 py-2.5 text-center"><DeltaCell v={s.avgEndDelta} /></td>
            <td className="px-3 py-2.5 text-center">
              <span className={s.pctOverran > 60 ? 'text-red-400' : s.pctOverran < 30 ? 'text-green-400' : 'text-[#94a3b8]'}>
                {s.pctOverran}%
              </span>
            </td>
            <td className="px-4 py-2.5 text-[#475569] text-[10px]">
              {s.cases.map(c => c.replace('Creating Strategic Alignment', 'CSA')
                .replace('Enabling Peak Performance', 'EPP')
                .replace('Influencing Without Authority', 'IWA')
                .replace('Managing Profitability', 'MP')
                .replace('Navigating Critical Conversations', 'NCC')
                .replace('Leading in Times of Change', 'LiToC')
                .replace('Kickoff: Shelf Awareness', 'Kickoff')
              ).join(', ')}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
