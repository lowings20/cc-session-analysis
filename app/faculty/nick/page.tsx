import { ArrowLeft } from 'lucide-react'
import { getDashboard } from '@/lib/data'
import { computeSessionPoints } from '@/lib/insights'
import staffMappingsRaw from '@/app/data/staff-mappings.json'
import surveyScoresRaw from '@/app/data/survey-scores.json'
import nickAnalysisRaw from '@/app/data/nick-analysis.json'
import engagementRaw from '@/app/data/engagement.json'
import type { StaffMap } from '@/lib/insights'
import FacilitatorView, { type SessionData } from '@/components/faculty/FacilitatorView'

type SurveyEntry = {
  q1_value: number
  q2_learning: number
  q4_facilitator: number
  responses: number
  q3_takeaways: string[]
  q6_liked_most: string[]
  q7_improve?: string[]
}
type EngagementEntry = {
  chapter_scores?: Record<string, { avg: number; median: number; min: number; max: number; n: number }>
  reflection_pct?: number
}

const staffMap = staffMappingsRaw as unknown as StaffMap
const surveyScores = surveyScoresRaw as unknown as Record<string, SurveyEntry>
const engagement = engagementRaw as unknown as Record<string, EngagementEntry>

export default async function NickPage() {
  const dashboard = await getDashboard()
  const pts = computeSessionPoints(dashboard, staffMap)
  const nickPts = pts.filter(p => p.faculty === 'Nick White')

  const sessions: SessionData[] = nickAnalysisRaw.sessions.map(s => {
    const pt = nickPts.find(p => p.sessionId === s.id)
    const survey = surveyScores[s.id] ?? null
    const eng = engagement[s.id] ?? null

    return {
      id: s.id,
      case: s.case,
      caseShort: s.caseShort,
      date: s.date,
      cohort: s.cohort,
      talkTime: s.talkTime ?? null,
      magicMoments: s.magicMoments,
      survey: survey ? {
        q1_value: survey.q1_value,
        q2_learning: survey.q2_learning,
        q4_facilitator: survey.q4_facilitator,
        responses: survey.responses,
        q3_takeaways: survey.q3_takeaways,
        q6_liked_most: survey.q6_liked_most,
        q7_improve: survey.q7_improve ?? [],
      } : null,
      simScores: eng ? {
        chapter_scores: eng.chapter_scores ?? {},
        reflection_pct: eng.reflection_pct,
      } : null,
      endDeltaMin: pt?.endDeltaMin ?? null,
      introDeltaMin: pt?.introDeltaMin ?? null,
    }
  })

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
          <h1 className="text-lg font-semibold text-[#e2e8f0]">Facilitator Deep Dive</h1>
          <p className="text-xs text-[#94a3b8] mt-0.5">BectonDickinson EMEA LEAP programme</p>
        </div>
      </header>

      <main>
        <FacilitatorView activeFacilitator="Nick White" sessions={sessions} />
      </main>
    </div>
  )
}
