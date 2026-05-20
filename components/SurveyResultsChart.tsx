import type { SessionRow } from './SessionsTable'

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function SurveyResultsChart({ rows }: { rows: SessionRow[] }) {
  const withScores = rows
    .filter((r) => typeof r.survey_score === 'number' && r.survey_score !== null)
    .sort((a, b) => {
      const ad = a.start_date ? new Date(a.start_date).getTime() : 0
      const bd = b.start_date ? new Date(b.start_date).getTime() : 0
      return ad - bd
    })
  const pending = rows.filter((r) => r.survey_response_count === 0 && r.survey_analyze_url)
  const noSurvey = rows.filter((r) => !r.survey_analyze_url && r.survey_response_count !== 0)

  if (withScores.length === 0 && pending.length === 0) {
    return (
      <div className="text-sm text-[#94a3b8]">
        No survey data yet. Surveys are tracked in SurveyMonkey and synced to Arrow; none of these sessions have responses recorded.
      </div>
    )
  }

  const avg = withScores.length
    ? withScores.reduce((s, r) => s + (r.survey_score ?? 0), 0) / withScores.length
    : null

  return (
    <div className="space-y-5">
      {avg !== null && (
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-semibold text-[#e2e8f0] tabular-nums">{avg.toFixed(2)}</span>
          <span className="text-sm text-[#94a3b8]">avg across {withScores.length} session{withScores.length === 1 ? '' : 's'} with responses</span>
        </div>
      )}

      {withScores.length > 0 && (
        <div className="space-y-2">
          {withScores.map((r) => {
            const score = r.survey_score ?? 0
            const pct = Math.max(0, Math.min(100, (score / 5) * 100))
            return (
              <div key={r.session_id} className="flex items-center gap-3">
                <div className="w-44 text-xs text-[#cbd5e1] truncate" title={r.program_name}>
                  {r.program_name}
                </div>
                <div className="w-20 text-[10px] text-[#94a3b8] tabular-nums">{formatDate(r.start_date)}</div>
                <div className="flex-1 h-5 bg-[#1e293b] rounded overflow-hidden relative">
                  <div className="h-full bg-gradient-to-r from-[#7c3aed] to-[#a78bfa]" style={{ width: `${pct}%` }} />
                  <div className="absolute inset-0 flex items-center px-2 text-[10px] text-white font-medium">
                    {score.toFixed(2)} / 5.0
                  </div>
                </div>
                <div className="w-16 text-[10px] text-[#94a3b8] text-right tabular-nums">n={r.survey_response_count ?? '?'}</div>
                {r.survey_analyze_url && (
                  <a
                    href={r.survey_analyze_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] text-[#a78bfa] hover:underline"
                  >
                    SurveyMonkey →
                  </a>
                )}
              </div>
            )
          })}
        </div>
      )}

      {pending.length > 0 && (
        <div className="text-xs text-[#475569]">
          {pending.length} session{pending.length === 1 ? '' : 's'} have a survey set up but no responses yet.
        </div>
      )}
      {noSurvey.length > 0 && (
        <div className="text-xs text-[#475569]">
          {noSurvey.length} session{noSurvey.length === 1 ? '' : 's'} have no survey linked in Arrow.
        </div>
      )}
    </div>
  )
}
