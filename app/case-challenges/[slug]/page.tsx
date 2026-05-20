import Link from 'next/link'
import { notFound } from 'next/navigation'
import { findCase, getCaseChallenges } from '@/lib/case-challenges'
import { getSessions } from '@/lib/sessions'
import RunsheetTimeline from '@/components/RunsheetTimeline'
import SurveyResultsChart from '@/components/SurveyResultsChart'
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

        <Section
          title="Activity Feed (per session)"
          subtitle="Live activity feed from cc.abilitie.com — to be wired"
          status="placeholder"
        >
          <p className="text-sm text-[#94a3b8]">
            Will populate once the cc.abilitie.com MCP exposes session results.
          </p>
          <p className="text-xs text-[#475569] mt-3">
            Today the <code className="text-[#cbd5e1] bg-[#1e293b] px-1 py-0.5 rounded">pe_*</code> tools only cover product/program/slide editing. We need a tool like{' '}
            <code className="text-[#cbd5e1] bg-[#1e293b] px-1 py-0.5 rounded">pe_get_session_activity</code> that returns the activity feed entries
            for a given cc.abilitie.com session id. Once added, this card will render the timeline of each session.
          </p>
        </Section>

        <Section
          title="Scoring Heatmap"
          subtitle="Rubric × sessions, colored by % credit — to be wired"
          status="placeholder"
        >
          <p className="text-sm text-[#94a3b8]">
            Will populate once the cc.abilitie.com MCP exposes per-team rubric results.
          </p>
          <p className="text-xs text-[#475569] mt-3">
            Need: a tool like{' '}
            <code className="text-[#cbd5e1] bg-[#1e293b] px-1 py-0.5 rounded">pe_get_session_scoring</code> that returns, for each session,
            the rubric categories and the % of teams that earned credit on each. Then we render rows = rubric items, columns = sessions,
            cells red / yellow / green by threshold.
          </p>
        </Section>
      </div>
    </div>
  )
}
