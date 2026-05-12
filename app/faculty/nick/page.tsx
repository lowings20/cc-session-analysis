import { ArrowLeft } from 'lucide-react'
import { getDashboard } from '@/lib/data'
import { computeSessionPoints } from '@/lib/insights'
import staffMappingsRaw from '@/app/data/staff-mappings.json'
import surveyScoresRaw from '@/app/data/survey-scores.json'
import nickAnalysisRaw from '@/app/data/nick-analysis.json'
import type { StaffMap } from '@/lib/insights'
import TalkTimeChart from '@/components/faculty/TalkTimeChart'
import MagicMomentCard from '@/components/faculty/MagicMomentCard'
import CoachingPanel from '@/components/faculty/CoachingPanel'

type SurveyEntry = {
  folder: string
  q1_value: number
  q2_learning: number
  q4_facilitator: number
  responses: number
  q3_takeaways: string[]
  q5_facilitator_feedback: string[]
  q6_liked_most: string[]
}

const surveyScores = surveyScoresRaw as unknown as Record<string, SurveyEntry>
const staffMap = staffMappingsRaw as unknown as StaffMap

function ScoreBar({ value, max = 5 }: { value: number; max?: number }) {
  const pct = (value / max) * 100
  const color = value >= 4.7 ? '#4ade80' : value >= 4.3 ? '#facc15' : '#f87171'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-[#0f172a] rounded-full h-1.5 overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-xs font-semibold text-[#e2e8f0] w-8 text-right">{value.toFixed(2)}</span>
    </div>
  )
}

function Section({ title, subtitle, children }: {
  title: string
  subtitle: string
  children: React.ReactNode
}) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-base font-semibold text-[#e2e8f0]">{title}</h2>
        <p className="text-xs text-[#94a3b8] mt-0.5">{subtitle}</p>
      </div>
      <div className="bg-[#1e293b] border border-[#334155] rounded-lg p-5">
        {children}
      </div>
    </section>
  )
}

export default async function NickPage() {
  const dashboard = await getDashboard()
  const pts = computeSessionPoints(dashboard, staffMap)
  const nickPts = pts.filter(p => p.faculty === 'Nick White')

  const nickSessions = nickAnalysisRaw.sessions
  const allMoments = nickSessions.flatMap(s =>
    s.magicMoments.map(m => ({ ...m, caseShort: s.caseShort, date: s.date }))
  )

  const nickSurveys = nickSessions
    .map(s => ({ session: s, survey: surveyScores[s.id] ?? null }))
    .filter(x => x.survey !== null) as Array<{
      session: typeof nickSessions[number]
      survey: SurveyEntry
    }>

  const avgQ4 = nickSurveys.length
    ? nickSurveys.reduce((s, x) => s + x.survey.q4_facilitator, 0) / nickSurveys.length
    : null

  const overranCount = nickPts.filter(p => p.overran).length
  const withEnd = nickPts.filter(p => p.endDeltaMin !== null)
  const avgOverrun = withEnd.length
    ? Math.round(withEnd.reduce((s, p) => s + p.endDeltaMin!, 0) / withEnd.length)
    : null

  return (
    <div className="min-h-screen">
      <header className="bg-[#1e293b] border-b border-[#334155] px-6 py-4">
        <a
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-[#94a3b8] hover:text-[#e2e8f0] transition-colors mb-3"
        >
          <ArrowLeft size={12} />
          Back to dashboard
        </a>
        <div>
          <h1 className="text-lg font-semibold text-[#e2e8f0]">Nick White — Facilitator Deep Dive</h1>
          <p className="text-xs text-[#94a3b8] mt-0.5">
            {nickPts.length} sessions · BectonDickinson EMEA LEAP programme
          </p>
        </div>
      </header>

      <main className="px-6 py-8 space-y-10 max-w-4xl">

        {/* Quick stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Sessions', value: nickPts.length },
            { label: 'Avg overrun', value: avgOverrun !== null ? `${avgOverrun > 0 ? '+' : ''}${avgOverrun}m` : '—' },
            { label: 'Sessions overran', value: `${overranCount} of ${nickPts.length}` },
            { label: 'Avg Q4 score', value: avgQ4 !== null ? avgQ4.toFixed(2) : '—' },
          ].map(s => (
            <div key={s.label} className="bg-[#1e293b] border border-[#334155] rounded-lg p-4">
              <div className="text-xl font-bold text-[#e2e8f0]">{s.value}</div>
              <div className="text-[10px] text-[#94a3b8] mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {/* AI coaching — outstanding + consider + Q&A */}
        <Section
          title="Coaching overview"
          subtitle="Auto-generated from session data. Regenerate for a fresh perspective, or ask a specific question."
        >
          <CoachingPanel apiRoute="/api/nick-coach" />
        </Section>

        {/* ── Session data ─────────────────────────────────────── */}
        <div className="flex items-center gap-3 pt-2">
          <div className="flex-1 border-t border-[#334155]" />
          <span className="text-[10px] text-[#334155] uppercase tracking-widest">Session data</span>
          <div className="flex-1 border-t border-[#334155]" />
        </div>

        {/* Talk time */}
        <Section
          title="Talk time"
          subtitle="Word share per session across 3 transcribed sessions. Hover a segment for speaker detail."
        >
          <TalkTimeChart sessions={nickSessions} />
        </Section>

        {/* Survey scores */}
        <Section
          title="Facilitator scores by session"
          subtitle="Q4 (facilitator effectiveness), Q1 (value of content), Q2 (learning). Scale 1–5."
        >
          <div className="divide-y divide-[#334155]/50">
            {nickSurveys.map(({ session, survey }) => (
              <div key={session.id} className="py-3 first:pt-0 last:pb-0">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <span className="text-xs font-medium text-[#e2e8f0]">{session.date.replace(', 2026', '')}</span>
                    <span className="mx-2 text-[#334155]">·</span>
                    <span className="text-xs text-[#94a3b8]">{session.caseShort} · {session.cohort}</span>
                  </div>
                  <span className="text-[10px] text-[#475569]">n={survey.responses}</span>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <div className="text-[10px] text-[#475569] mb-1">Q4 Facilitator</div>
                    <ScoreBar value={survey.q4_facilitator} />
                  </div>
                  <div>
                    <div className="text-[10px] text-[#475569] mb-1">Q1 Value</div>
                    <ScoreBar value={survey.q1_value} />
                  </div>
                  <div>
                    <div className="text-[10px] text-[#475569] mb-1">Q2 Learning</div>
                    <ScoreBar value={survey.q2_learning} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* Magic moments */}
        {allMoments.length > 0 && (
          <Section
            title="Magic moments"
            subtitle="Notable facilitation moves identified from session transcripts."
          >
            <div className="space-y-3">
              {allMoments.map((m, i) => (
                <MagicMomentCard
                  key={i}
                  moment={{ title: m.title, quote: m.quote, context: m.context }}
                  caseShort={m.caseShort}
                  date={m.date}
                />
              ))}
            </div>
          </Section>
        )}

        {/* Open-text survey responses */}
        <Section
          title="What participants said"
          subtitle="Open-text responses from Arrow surveys. Q3 = key takeaway, Q6 = what they liked most."
        >
          <div className="space-y-6">
            {nickSurveys.map(({ session, survey }) => {
              const hasQ3 = survey.q3_takeaways.filter(r => !r.startsWith('The facilitator was')).length > 0
              const hasQ6 = survey.q6_liked_most.length > 0
              if (!hasQ3 && !hasQ6) return null
              return (
                <div key={session.id}>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs font-medium text-[#e2e8f0]">{session.date.replace(', 2026', '')}</span>
                    <span className="text-[10px] text-[#475569] px-1.5 py-0.5 rounded bg-[#0f172a] border border-[#334155]">
                      {session.caseShort}
                    </span>
                  </div>
                  <div className="space-y-4">
                    {hasQ3 && (
                      <div>
                        <div className="text-[10px] text-[#475569] mb-1.5 uppercase tracking-wide">Key takeaways</div>
                        <ul className="space-y-1">
                          {survey.q3_takeaways
                            .filter(r => !r.startsWith('The facilitator was'))
                            .map((r, i) => (
                              <li key={i} className="text-xs text-[#94a3b8] leading-relaxed flex gap-2">
                                <span className="text-[#334155] shrink-0">—</span>
                                <span>{r.replace(/^\d+\.\s*/, '')}</span>
                              </li>
                            ))}
                        </ul>
                      </div>
                    )}
                    {hasQ6 && (
                      <div>
                        <div className="text-[10px] text-[#475569] mb-1.5 uppercase tracking-wide">Liked most</div>
                        <ul className="space-y-1">
                          {survey.q6_liked_most.map((r, i) => (
                            <li key={i} className="text-xs text-[#94a3b8] leading-relaxed flex gap-2">
                              <span className="text-[#334155] shrink-0">—</span>
                              <span>{r.replace(/^\d+\.\s*/, '')}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </Section>

      </main>
    </div>
  )
}
