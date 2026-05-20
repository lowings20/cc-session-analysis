import Link from 'next/link'
import { notFound } from 'next/navigation'
import { findCase, getCaseChallenges } from '@/lib/case-challenges'
import { getSessions } from '@/lib/sessions'
import { getCaseTimelineData } from '@/lib/dashboard'
import { getCcSession } from '@/lib/cc-sessions'
import RunsheetTimeline from '@/components/RunsheetTimeline'
import SurveyResultsChart from '@/components/SurveyResultsChart'
import ActualVsExpected from '@/components/ActualVsExpected'
import CcSessionDeepDive from '@/components/CcSessionDeepDive'
import type { SessionRow } from '@/components/SessionsTable'

export function generateStaticParams() {
  return getCaseChallenges().cases.map((c) => ({ slug: c.url_key }))
}

interface PageProps {
  params: Promise<{ slug: string }>
}

function formatDate(iso: string | null): string {
  if (!iso) return 'No date'
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function Section({ title, subtitle, children, status }: { title: string; subtitle?: string; children: React.ReactNode; status?: 'data' | 'partial' | 'placeholder' }) {
  const dot = status === 'placeholder' ? 'bg-[#475569]' : status === 'partial' ? 'bg-[#f59e0b]' : 'bg-[#34d399]'
  return (
    <section className="rounded-lg border border-[#1e293b] bg-[#0f172a] overflow-hidden">
      <header className="flex items-center justify-between gap-4 px-6 py-4 border-b border-[#1e293b]">
        <div>
          <h2 className="text-lg font-semibold text-[#e2e8f0]">{title}</h2>
          {subtitle && <p className="text-xs text-[#94a3b8] mt-0.5">{subtitle}</p>}
        </div>
        <span className={`w-2 h-2 rounded-full ${dot}`} />
      </header>
      <div className="px-6 py-5">{children}</div>
    </section>
  )
}

function PillarChip({ label, value }: { label: string; value: string | null }) {
  if (!value) return null
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] uppercase tracking-wider text-[#475569]">{label}</span>
      <span className="text-sm text-[#cbd5e1]">{value.replace(/-/g, ' ')}</span>
    </div>
  )
}

export default async function CaseChallengeDetailPage({ params }: PageProps) {
  const { slug } = await params
  const cc = findCase(slug)
  if (!cc) notFound()

  const sessions = (getSessions().rows as SessionRow[])
    .filter((r) => r.case_challenge === cc.case_challenge)
    .sort((a, b) => {
      const ad = a.start_date ? new Date(a.start_date).getTime() : -Infinity
      const bd = b.start_date ? new Date(b.start_date).getTime() : -Infinity
      return bd - ad
    })

  const hasSurveyData = sessions.some((s) => typeof s.survey_score === 'number')
  const timelineData = getCaseTimelineData(cc.case_challenge)
  const hasTimelineData = !!timelineData && timelineData.sessions.length > 0

  const deepDives = await Promise.all(sessions.map((s) => getCcSession(s.session_id).then((d) => ({ session: s, data: d }))))
  const sessionsWithDeepDive = deepDives.filter((d) => d.data !== null) as { session: SessionRow; data: NonNullable<Awaited<ReturnType<typeof getCcSession>>> }[]

  return (
    <div className="min-h-screen px-6 py-8 max-w-5xl mx-auto">
      <div className="mb-4">
        <Link href="/case-challenges" className="text-xs text-[#94a3b8] hover:text-[#e2e8f0]">
          ← All case challenges
        </Link>
      </div>

      <header className="flex flex-col md:flex-row gap-6 mb-8">
        {cc.imageUrl && (
          <img
            src={cc.imageUrl}
            alt=""
            className="w-32 h-32 rounded-lg object-cover bg-[#1e293b] flex-shrink-0"
          />
        )}
        <div className="flex-1">
          <h1 className="text-3xl font-semibold text-[#e2e8f0]">{cc.name}</h1>
          {cc.description && <p className="text-sm text-[#94a3b8] mt-2 max-w-2xl">{cc.description}</p>}
          <div className="flex flex-wrap gap-x-8 gap-y-2 mt-4">
            <PillarChip label="Pillar" value={cc.pillar} />
            <PillarChip label="Level" value={cc.level} />
            <PillarChip label="Duration" value={cc.duration} />
            <PillarChip label="Runsheet" value={cc.runsheet_version} />
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] uppercase tracking-wider text-[#475569]">Sessions in snapshot</span>
              <span className="text-sm text-[#cbd5e1] tabular-nums">{sessions.length}</span>
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-col gap-6">
        <Section
          title="Survey Results"
          subtitle="Post-session survey scores per cohort, from SurveyMonkey via Arrow"
          status={hasSurveyData ? 'partial' : 'placeholder'}
        >
          <SurveyResultsChart rows={sessions} />
        </Section>

        <Section
          title="Run Sheet Timing"
          subtitle={cc.runsheet_version ? `Planned timing from ${cc.runsheet_folder} / ${cc.runsheet_version}` : 'No master runsheet found'}
          status={cc.runsheet_segments.length > 0 ? 'data' : 'placeholder'}
        >
          <RunsheetTimeline segments={cc.runsheet_segments} />
        </Section>

        <Section
          title="Actual vs Expected"
          subtitle="How each session actually ran against the planned runsheet, from cc.abilitie.com activity feeds"
          status={hasTimelineData ? 'data' : 'placeholder'}
        >
          {timelineData ? (
            <ActualVsExpected caseData={timelineData} />
          ) : (
            <p className="text-sm text-[#94a3b8]">
              No activity-feed timings recorded for this case challenge yet.
            </p>
          )}
        </Section>

        <Section
          title="Sessions That Ran"
          subtitle="Each session in the snapshot for this case challenge"
          status="data"
        >
          <div className="space-y-2">
            {sessions.map((s) => (
              <div
                key={s.session_id}
                className="rounded border border-[#1e293b] bg-[#0a121f] px-4 py-3 flex flex-wrap items-baseline gap-x-4 gap-y-1"
              >
                <div className="text-sm text-[#e2e8f0] flex-1 min-w-[200px]">{s.session_name}</div>
                <div className="text-xs text-[#94a3b8] whitespace-nowrap">{formatDate(s.start_date)}</div>
                <a
                  href={`https://arrow.abilitie.com/programs/${s.program_uuid}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-[#a78bfa] hover:underline whitespace-nowrap"
                >
                  {s.program_name}
                </a>
                <div className="text-[10px] text-[#475569]">{s.number_of_teams} teams</div>
              </div>
            ))}
          </div>
        </Section>

        {sessionsWithDeepDive.length > 0 ? (
          sessionsWithDeepDive.map(({ session, data }) => (
            <Section
              key={session.session_id}
              title={`Activity feed deep dive — ${session.program_name}`}
              subtitle={`Session ${session.session_id} · pulled from facilitator console for chapter ${data.viewed_chapter_id.slice(0, 8)}`}
              status="data"
            >
              <CcSessionDeepDive data={data} />
            </Section>
          ))
        ) : (
          <Section
            title="Scoring Heatmap"
            subtitle="Rubric × sessions, colored by % credit — needs facilitator URLs"
            status="placeholder"
          >
            <p className="text-sm text-[#94a3b8]">
              Will populate once we extract data from each session&apos;s facilitator console URL.
            </p>
          </Section>
        )}
      </div>
    </div>
  )
}
