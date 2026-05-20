import Link from 'next/link'
import { notFound } from 'next/navigation'
import { findFacilitator, getFacilitators } from '@/lib/facilitators'
import MagicMoments from '@/components/MagicMoments'

export function generateStaticParams() {
  return getFacilitators().facilitators.map((f) => ({ slug: f.slug }))
}

interface PageProps {
  params: Promise<{ slug: string }>
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function Stat({ label, value, sublabel }: { label: string; value: string; sublabel?: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] uppercase tracking-wider text-[#475569]">{label}</span>
      <span className="text-lg text-[#e2e8f0] tabular-nums font-medium leading-none">{value}</span>
      {sublabel && <span className="text-[10px] text-[#475569]">{sublabel}</span>}
    </div>
  )
}

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-[#1e293b] bg-[#0f172a] overflow-hidden">
      <header className="px-6 py-4 border-b border-[#1e293b]">
        <h2 className="text-lg font-semibold text-[#e2e8f0]">{title}</h2>
        {subtitle && <p className="text-xs text-[#94a3b8] mt-0.5">{subtitle}</p>}
      </header>
      <div className="px-6 py-5">{children}</div>
    </section>
  )
}

export default async function FacilitatorDetailPage({ params }: PageProps) {
  const { slug } = await params
  const f = findFacilitator(slug)
  if (!f) notFound()

  const hasStrengths = f.strengths.length > 0
  const hasLearnFrom = f.learn_from.length > 0

  return (
    <div className="min-h-screen px-6 py-8 max-w-5xl mx-auto">
      <div className="mb-4">
        <Link href="/facilitators" className="text-xs text-[#94a3b8] hover:text-[#e2e8f0]">
          ← All facilitators
        </Link>
      </div>

      <header className="mb-8">
        <h1 className="text-3xl font-semibold text-[#e2e8f0]">{f.name}</h1>
        <div className="flex flex-wrap gap-x-8 gap-y-3 mt-5">
          <Stat label="Sessions" value={String(f.session_count)} />
          <Stat label="Case Challenges" value={String(f.case_challenges.length)} sublabel={f.case_challenges.join(' · ')} />
          {f.avg_survey_score !== null && (
            <Stat
              label="Avg survey"
              value={f.avg_survey_score.toFixed(2)}
              sublabel={`${f.survey_session_count} session${f.survey_session_count === 1 ? '' : 's'} · scale 0–5`}
            />
          )}
          {f.avg_team_score !== null && (
            <Stat
              label="Avg team score"
              value={f.avg_team_score.toFixed(0)}
              sublabel={`across ${f.team_score_count} team-chapters`}
            />
          )}
          {f.magic_moments.length > 0 && (
            <Stat label="Magic moments" value={String(f.magic_moments.length)} />
          )}
        </div>
      </header>

      <div className="flex flex-col gap-6">
        <Section
          title="Magic Moments"
          subtitle={f.magic_moments.length > 0 ? 'Curated from session transcripts' : undefined}
        >
          <MagicMoments moments={f.magic_moments} />
        </Section>

        <Section
          title="Strengths"
          subtitle={hasStrengths ? f.strengths_method ?? undefined : 'Run scripts/extract_facilitator_profiles.py to populate'}
        >
          {hasStrengths ? (
            <ul className="space-y-4">
              {f.strengths.map((s, i) => (
                <li key={i} className="border-l-2 border-[#7c3aed] pl-4">
                  <div className="text-sm font-medium text-[#e2e8f0]">{s.title}</div>
                  <div className="text-xs text-[#cbd5e1] mt-1 leading-relaxed">{s.evidence}</div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-[#94a3b8]">
              Strengths haven&apos;t been extracted yet for {f.name}. Needs the LLM bake (ANTHROPIC_API_KEY).
            </p>
          )}
        </Section>

        <Section
          title="Learn from"
          subtitle={hasLearnFrom ? 'Peer facilitators recommended for skill transfer' : undefined}
        >
          {hasLearnFrom ? (
            <div className="space-y-3">
              {f.learn_from.map((lf, i) => (
                <div key={i} className="rounded border border-[#1e293b] bg-[#0a121f] p-4">
                  <div className="flex items-baseline gap-2 mb-1">
                    <Link href={`/facilitators/${lf.peer_slug}`} className="text-sm font-medium text-[#a78bfa] hover:underline">
                      {lf.peer_name}
                    </Link>
                    <span className="text-[10px] uppercase tracking-wider text-[#475569]">{lf.area}</span>
                  </div>
                  <div className="text-xs text-[#cbd5e1] leading-relaxed">{lf.why}</div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[#94a3b8]">
              Learn-from pairings haven&apos;t been computed yet for {f.name}. Needs the LLM bake.
            </p>
          )}
        </Section>

        <Section
          title="Sessions"
          subtitle={`${f.session_count} session${f.session_count === 1 ? '' : 's'} across ${f.case_challenges.length} case challenge${f.case_challenges.length === 1 ? '' : 's'}`}
        >
          <div className="space-y-2">
            {f.sessions.map((s) => (
              <div
                key={s.session_id}
                className="rounded border border-[#1e293b] bg-[#0a121f] px-4 py-3 flex flex-wrap items-baseline gap-x-4 gap-y-1"
              >
                <div className="text-sm text-[#e2e8f0] min-w-[200px]">{s.case_challenge}</div>
                <div className="text-sm text-[#cbd5e1] flex-1 min-w-[200px]">{s.session_name}</div>
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
                {typeof s.survey_score === 'number' && (
                  <div className="text-[10px] text-[#94a3b8]">survey {s.survey_score.toFixed(2)}</div>
                )}
              </div>
            ))}
          </div>
        </Section>
      </div>
    </div>
  )
}
