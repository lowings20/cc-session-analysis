'use client'

interface Speaker {
  name: string
  role: string
  words: number
  wordPct: number
  turns: number
}

interface SessionTalkTime {
  totalWords: number
  durationMin: number
  speakers: Speaker[]
}

interface Session {
  id: string
  caseShort: string
  date: string
  cohort: string
  talkTime: SessionTalkTime | null
}

interface Props {
  sessions: Session[]
}

const ROLE_COLORS: Record<string, string> = {
  faculty: '#60a5fa',
  producer: '#a78bfa',
  host: '#fb923c',
  participant: '#334155',
  participants: '#334155',
}

function groupSpeakers(speakers: Speaker[]): {
  faculty: number
  producer: number
  others: number
  nickPct: number
} {
  let faculty = 0, producer = 0, others = 0, nickPct = 0
  for (const s of speakers) {
    if (s.role === 'faculty') { faculty += s.wordPct; nickPct = s.wordPct }
    else if (s.role === 'producer') producer += s.wordPct
    else others += s.wordPct
  }
  return { faculty, producer, others, nickPct }
}

export default function TalkTimeChart({ sessions }: Props) {
  const transcribed = sessions.filter(s => s.talkTime !== null)
  if (!transcribed.length) return null

  const barH = 36
  const labelW = 140
  const gap = 12
  const chartW = 520
  const barW = chartW - labelW - 8

  return (
    <div className="space-y-1">
      {/* Legend */}
      <div className="flex items-center gap-4 mb-4 text-[10px] text-[#94a3b8]">
        {[
          { color: '#60a5fa', label: 'Nick (faculty)' },
          { color: '#a78bfa', label: 'Producer' },
          { color: '#fb923c', label: 'Host / guest' },
          { color: '#334155', label: 'Participants' },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm" style={{ background: color }} />
            {label}
          </div>
        ))}
      </div>

      <svg width={chartW} height={transcribed.length * (barH + gap) + 20} style={{ display: 'block', maxWidth: '100%' }}>
        {transcribed.map((session, i) => {
          const tt = session.talkTime!
          const y = i * (barH + gap)
          const { nickPct } = groupSpeakers(tt.speakers)

          // Build segments left to right: faculty first, then sorted by wordPct desc
          const sorted = [...tt.speakers].sort((a, b) => {
            if (a.role === 'faculty') return -1
            if (b.role === 'faculty') return 1
            if (a.role === 'producer') return -1
            if (b.role === 'producer') return 1
            return b.wordPct - a.wordPct
          })

          let offset = 0
          const segments = sorted.map(sp => {
            const w = (sp.wordPct / 100) * barW
            const seg = { x: offset, w, sp }
            offset += w
            return seg
          })

          return (
            <g key={session.id} transform={`translate(0,${y})`}>
              {/* Session label */}
              <text x={0} y={barH / 2 + 2} fontSize={10} fill="#94a3b8" dominantBaseline="middle">
                {session.date.replace(', 2026', '')}
              </text>
              <text x={0} y={barH / 2 + 14} fontSize={9} fill="#475569" dominantBaseline="middle">
                {session.caseShort}
              </text>

              {/* Bar group */}
              <g transform={`translate(${labelW},0)`}>
                {segments.map(({ x, w, sp }) => (
                  <rect
                    key={sp.name}
                    x={x} y={0}
                    width={Math.max(w, 0)}
                    height={barH}
                    fill={ROLE_COLORS[sp.role] ?? '#475569'}
                    rx={x === 0 ? 3 : 0}
                    style={{ transition: 'width 0.3s' }}
                  >
                    <title>{sp.name}: {sp.wordPct.toFixed(1)}% · {sp.words} words · {sp.turns} turns</title>
                  </rect>
                ))}
                {/* Right cap radius */}
                <rect x={barW - 3} y={0} width={3} height={barH} rx={3} fill="transparent" />

                {/* Nick % label */}
                <text
                  x={(nickPct / 100) * barW - 6}
                  y={barH / 2}
                  fontSize={11}
                  fontWeight="700"
                  fill="#fff"
                  textAnchor="end"
                  dominantBaseline="middle"
                >
                  {nickPct.toFixed(0)}%
                </text>

                {/* Word count */}
                <text
                  x={barW + 6}
                  y={barH / 2}
                  fontSize={9}
                  fill="#475569"
                  dominantBaseline="middle"
                >
                  {tt.totalWords.toLocaleString()} words · {tt.durationMin}m
                </text>
              </g>
            </g>
          )
        })}

        {/* X axis label */}
        <text
          x={labelW + barW / 2}
          y={transcribed.length * (barH + gap) + 14}
          fontSize={10}
          fill="#475569"
          textAnchor="middle"
        >
          word share
        </text>
      </svg>

      <p className="text-[10px] text-[#475569] mt-2">
        Hover a bar segment to see speaker detail. Talk time measured by word count across Zoom transcript.
      </p>
    </div>
  )
}
