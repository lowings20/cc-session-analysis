import type { CaseData } from '@/app/data/types'
import Timeline from './Timeline'

interface Props {
  caseData: CaseData
}

export default function ActualVsExpected({ caseData }: Props) {
  if (!caseData || caseData.sessions.length === 0) {
    return (
      <div className="text-sm text-[#94a3b8]">
        No actual session timings available in dashboard.json for this case challenge yet.
      </div>
    )
  }

  const expectedEnd = caseData.expected.length
    ? caseData.expected[caseData.expected.length - 1].end_s
    : 0

  // Sort sessions by start date (most recent first)
  const sessions = [...caseData.sessions].sort((a, b) => {
    return (b.session_start_display || '').localeCompare(a.session_start_display || '')
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[10px] text-[#475569]">
        <LegendChip color="#fce8b2" label="intro" />
        <LegendChip color="#34a853" label="chapter" />
        <LegendChip color="#2a9943" label="breakout" />
        <LegendChip color="#fbbc04" label="debrief" />
        <LegendChip color="#9aa0a6" label="break" />
        <LegendChip color="#f6a821" label="reflect / close" />
        <LegendChip color="#ed8936" label="buffer" />
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-0.5 border-t-2 border-dashed border-[#ef4444]" />
          scheduled end
        </span>
      </div>

      {sessions.map((session) => {
        const actualEnd = session.actual.length
          ? session.actual[session.actual.length - 1].end_s
          : 0
        const maxSeconds = Math.max(expectedEnd, actualEnd, (session.scheduled_duration_min ?? 0) * 60)

        return (
          <div key={session.id} className="rounded border border-[#1e293b] bg-[#0a121f] px-4 py-3">
            <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 mb-3">
              <div className="text-sm font-medium text-[#e2e8f0]">{session.cohort}</div>
              <div className="text-xs text-[#94a3b8]">{session.session_start_display}</div>
              <div className="text-[10px] text-[#475569]">
                {session.teams} teams · {session.players} players
                {session.inferred && ' · inferred start'}
              </div>
            </div>
            <Timeline
              expected={caseData.expected}
              actual={session.actual}
              maxSeconds={maxSeconds}
              scheduledDurationMin={session.scheduled_duration_min}
              sessionId={session.id}
              sessionLabel={session.cohort}
            />
          </div>
        )
      })}
    </div>
  )
}

function LegendChip({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1">
      <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: color }} />
      {label}
    </span>
  )
}
