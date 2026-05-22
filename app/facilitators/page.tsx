import Link from 'next/link'
import { getFacilitators } from '@/lib/facilitators'
import { getSessions, formatSnapshotDate } from '@/lib/sessions'

export default function FacilitatorsPage() {
  const facilitators = getFacilitators().facilitators
  const snapshot = formatSnapshotDate(getSessions().generated_at)

  return (
    <div className="min-h-screen px-6 py-10 max-w-5xl mx-auto">
      <div className="mb-6">
        <Link href="/" className="text-xs text-[#94a3b8] hover:text-[#e2e8f0]">
          ← Back
        </Link>
      </div>
      <header className="mb-8">
        <h1 className="text-2xl font-semibold text-[#e2e8f0]">Facilitators</h1>
        <p className="text-sm text-[#94a3b8] mt-1">
          {facilitators.length} facilitators · snapshot {snapshot}
        </p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {facilitators.map((f) => {
          const totalSessions = f.arrow?.all_session_count ?? f.session_count
          const surveyAvg = f.arrow?.all_survey_avg_normalized_0_5 ?? f.avg_survey_score
          return (
            <Link
              key={f.slug}
              href={`/facilitators/${f.slug}`}
              className="relative rounded-lg border border-[#1e293b] bg-[#0f172a] hover:border-[#334155] hover:bg-[#131e2e] transition-colors px-5 py-5 min-h-[140px] block"
            >
              <div className="text-base font-medium text-[#e2e8f0] pr-12">{f.name}</div>
              <div className="text-[11px] text-[#94a3b8] mt-1">
                {f.case_challenges.length} case challenge{f.case_challenges.length === 1 ? '' : 's'}
                {surveyAvg !== null && surveyAvg !== undefined && (
                  <>
                    <span className="mx-1.5 text-[#475569]">·</span>
                    avg survey {surveyAvg.toFixed(2)}
                  </>
                )}
              </div>
              <div className="flex items-center gap-3 mt-2 text-[10px]">
                {f.has_transcripts && (
                  <span className="text-[#22d3ee]" title="Has Zoom transcripts">🎙 transcript</span>
                )}
                {f.magic_moments.length > 0 && (
                  <span className="text-[#a78bfa]" title={`${f.magic_moments.length} magic moments`}>
                    ✨ {f.magic_moments.length} magic
                  </span>
                )}
              </div>
              <div className="absolute bottom-3 right-4 text-3xl font-semibold text-[#a78bfa] tabular-nums leading-none">
                {totalSessions}
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
