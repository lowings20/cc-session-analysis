import Link from 'next/link'
import { notFound } from 'next/navigation'
import { findCase, getCaseChallenges } from '@/lib/case-challenges'
import { getSessions } from '@/lib/sessions'
import { getCcSession } from '@/lib/cc-sessions'
import RunsheetTimeline from '@/components/RunsheetTimeline'
import SessionAccordion from '@/components/SessionAccordion'
import type { SessionRow } from '@/components/SessionsTable'
import type { CcSessionData } from '@/lib/cc-sessions'

export function generateStaticParams() {
  return getCaseChallenges().cases.map((c) => ({ slug: c.url_key }))
}

interface PageProps {
  params: Promise<{ slug: string }>
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

  const ccDataEntries = await Promise.all(
    sessions.map(async (s) => [s.session_id, await getCcSession(s.session_id)] as const),
  )
  const ccDataBySessionId: Record<number, CcSessionData> = {}
  for (const [id, data] of ccDataEntries) {
    if (data) ccDataBySessionId[id] = data
  }

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
              <span className="text-[10px] uppercase tracking-wider text-[#475569]">Sessions</span>
              <span className="text-sm text-[#cbd5e1] tabular-nums">{sessions.length}</span>
            </div>
          </div>
        </div>
      </header>

      <section className="rounded-lg border border-[#1e293b] bg-[#0f172a] overflow-hidden mb-6">
        <header className="px-6 py-4 border-b border-[#1e293b]">
          <h2 className="text-lg font-semibold text-[#e2e8f0]">Master Run Sheet</h2>
          <p className="text-xs text-[#94a3b8] mt-0.5">
            {cc.runsheet_version ? `Planned timing from ${cc.runsheet_folder} / ${cc.runsheet_version}` : 'No master runsheet found'}
          </p>
        </header>
        <div className="px-6 py-5">
          <RunsheetTimeline segments={cc.runsheet_segments} />
        </div>
      </section>

      <section className="rounded-lg border border-[#1e293b] bg-[#0a121f] overflow-hidden">
        <header className="px-6 py-4 border-b border-[#1e293b] flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[#e2e8f0]">Sessions</h2>
            <p className="text-xs text-[#94a3b8] mt-0.5">
              Expand a session to see survey, actual vs expected, scoring, rubric, and magic moments.
            </p>
          </div>
          <div className="text-[10px] text-[#475569]">
            {Object.keys(ccDataBySessionId).length} of {sessions.length} have activity feed data
          </div>
        </header>
        <div className="px-4 py-4">
          <SessionAccordion
            sessions={sessions}
            ccDataBySessionId={ccDataBySessionId}
            runsheetSegments={cc.runsheet_segments}
          />
        </div>
      </section>
    </div>
  )
}
