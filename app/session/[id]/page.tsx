import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { getDashboard } from '@/lib/data'
import type { SegmentBlock, MergedSession } from '@/app/data/types'
import Timeline from '@/components/Timeline'
import { fmtMinutes } from '@/lib/utils'

function getActualDuration(session: MergedSession): number {
  if (!session.actual.length) return 0
  return session.actual[session.actual.length - 1].end_s
}

function matchBlocks(
  expected: SegmentBlock[],
  actual: SegmentBlock[]
): Array<{
  actualBlock: SegmentBlock
  expectedBlock: SegmentBlock | null
  deltaMin: number | null
}> {
  const typeCounts: Record<string, number> = {}
  return actual.map(actualBlock => {
    const type = actualBlock.type
    const idx = typeCounts[type] ?? 0
    typeCounts[type] = idx + 1
    const sameType = expected.filter(b => b.type === type)
    const expectedBlock = sameType[idx] ?? null
    const deltaMin = expectedBlock
      ? Math.round((actualBlock.duration_s - expectedBlock.duration_s) / 60)
      : null
    return { actualBlock, expectedBlock, deltaMin }
  })
}

const SEGMENT_DOT: Record<string, string> = {
  intro: '#fce8b2',
  chapter: '#34a853',
  chapter_breakout: '#2a9943',
  debrief: '#fbbc04',
  break: '#9aa0a6',
  reflect: '#f6a821',
  close: '#f6a821',
  buffer: '#ed8936',
  other: '#64748b',
}

export default async function SessionPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const dashboard = await getDashboard()

  let session: MergedSession | null = null
  let caseTitle = ''
  let expected: SegmentBlock[] = []

  for (const [title, caseData] of Object.entries(dashboard.cases)) {
    const found = caseData.sessions.find(s => s.id === id)
    if (found) {
      session = found
      caseTitle = title
      expected = caseData.expected
      break
    }
  }

  if (!session) notFound()

  const matched = matchBlocks(expected, session.actual)
  const actualDuration = getActualDuration(session)
  const scheduledS = session.scheduled_duration_min ? session.scheduled_duration_min * 60 : null
  const endDeltaMin = scheduledS !== null ? Math.round((actualDuration - scheduledS) / 60) : null

  const expIntro = expected.find(b => b.type === 'intro')
  const actIntro = session.actual.find(b => b.type === 'intro')
  const introDeltaMin =
    expIntro && actIntro ? Math.round((actIntro.duration_s - expIntro.duration_s) / 60) : null

  const debriefTotal = session.actual
    .filter(b => b.type === 'debrief')
    .reduce((sum, b) => sum + b.duration_s, 0)

  // Compute maxSeconds for this single session
  const maxS = Math.ceil(
    Math.max(
      ...expected.map(b => b.end_s),
      ...session.actual.map(b => b.end_s),
      scheduledS ?? 0
    ) / 60 / 10
  ) * 10 * 60

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-[#1e293b] border-b border-[#334155] px-6 py-4">
        <a
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-[#94a3b8] hover:text-[#e2e8f0] transition-colors mb-3"
        >
          <ArrowLeft size={12} />
          Back to dashboard
        </a>
        <h1 className="text-lg font-semibold text-[#e2e8f0]">
          {session.cohort || session.name}
        </h1>
        <p className="text-xs text-[#94a3b8] mt-0.5">
          {caseTitle} · {session.session_start_display} · {session.teams} teams · {session.players} players
          {session.inferred && ' · inferred start'}
        </p>
      </header>

      <main className="px-6 py-6 space-y-8 max-w-5xl">
        {/* Quick stats */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            {
              label: 'Total length',
              value: fmtMinutes(actualDuration),
            },
            {
              label: 'Scheduled',
              value: session.scheduled_duration_min ? `${session.scheduled_duration_min}m` : '—',
            },
            {
              label: 'vs schedule',
              value:
                endDeltaMin === null
                  ? '—'
                  : endDeltaMin > 0
                  ? `+${endDeltaMin}m over`
                  : endDeltaMin < 0
                  ? `${Math.abs(endDeltaMin)}m under`
                  : 'on time',
              color:
                endDeltaMin === null
                  ? '#94a3b8'
                  : endDeltaMin > 0
                  ? '#f87171'
                  : endDeltaMin < 0
                  ? '#4ade80'
                  : '#94a3b8',
            },
            {
              label: 'Intro delta',
              value:
                introDeltaMin === null
                  ? '—'
                  : introDeltaMin > 0
                  ? `+${introDeltaMin}m late`
                  : introDeltaMin < 0
                  ? `${Math.abs(introDeltaMin)}m early`
                  : 'on time',
              color:
                introDeltaMin === null
                  ? '#94a3b8'
                  : introDeltaMin > 0
                  ? '#f87171'
                  : introDeltaMin < 0
                  ? '#4ade80'
                  : '#94a3b8',
            },
          ].map(stat => (
            <div
              key={stat.label}
              className="bg-[#1e293b] border border-[#334155] rounded-lg px-4 py-3"
            >
              <div className="text-xs text-[#94a3b8] mb-1">{stat.label}</div>
              <div
                className="text-sm font-semibold"
                style={{ color: stat.color ?? '#e2e8f0' }}
              >
                {stat.value}
              </div>
            </div>
          ))}
        </section>

        {/* Debrief total */}
        {debriefTotal > 0 && (
          <div className="text-xs text-[#94a3b8]">
            Total debrief time: <span className="text-[#e2e8f0] font-medium">{fmtMinutes(debriefTotal)}</span>
          </div>
        )}

        {/* Timeline */}
        <section className="bg-[#1e293b] border border-[#334155] rounded-lg p-5">
          <h2 className="text-sm font-semibold text-[#e2e8f0] mb-4">Timeline</h2>
          <Timeline
            expected={expected}
            actual={session.actual}
            maxSeconds={maxS}
            scheduledDurationMin={session.scheduled_duration_min}
            sessionId={session.id}
            sessionLabel={session.cohort || session.name}
          />
        </section>

        {/* Segment table */}
        <section className="bg-[#1e293b] border border-[#334155] rounded-lg overflow-hidden">
          <h2 className="text-sm font-semibold text-[#e2e8f0] px-5 py-3 border-b border-[#334155]">
            Segment breakdown
          </h2>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[#334155]">
                <th className="text-left px-5 py-2 text-[#94a3b8] font-medium">Segment</th>
                <th className="text-right px-4 py-2 text-[#94a3b8] font-medium">Actual</th>
                <th className="text-right px-4 py-2 text-[#94a3b8] font-medium">Expected</th>
                <th className="text-right px-5 py-2 text-[#94a3b8] font-medium">Delta</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#334155]/50">
              {matched.map(({ actualBlock, expectedBlock, deltaMin }, i) => (
                <tr key={i}>
                  <td className="px-5 py-2 text-[#e2e8f0] flex items-center gap-2">
                    <span
                      className="inline-block w-2 h-2 rounded-sm shrink-0"
                      style={{ backgroundColor: SEGMENT_DOT[actualBlock.type] ?? '#64748b' }}
                    />
                    {actualBlock.label}
                  </td>
                  <td className="px-4 py-2 text-right text-[#e2e8f0]">
                    {fmtMinutes(actualBlock.duration_s)}
                  </td>
                  <td className="px-4 py-2 text-right text-[#94a3b8]">
                    {expectedBlock ? fmtMinutes(expectedBlock.duration_s) : '—'}
                  </td>
                  <td className="px-5 py-2 text-right">
                    {deltaMin === null ? (
                      <span className="text-[#475569]">—</span>
                    ) : deltaMin > 0 ? (
                      <span className="text-red-400">+{deltaMin}m</span>
                    ) : deltaMin < 0 ? (
                      <span className="text-green-400">{deltaMin}m</span>
                    ) : (
                      <span className="text-[#94a3b8]">0m</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </main>
    </div>
  )
}
