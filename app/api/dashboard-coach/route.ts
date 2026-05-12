import Anthropic from '@anthropic-ai/sdk'
import { NextRequest } from 'next/server'
import dashboardRaw from '@/app/data/dashboard.json'
import staffMappingsRaw from '@/app/data/staff-mappings.json'
import surveyScoresRaw from '@/app/data/survey-scores.json'
import { computeSessionPoints } from '@/lib/insights'
import type { Dashboard } from '@/app/data/types'
import type { StaffMap } from '@/lib/insights'

type SurveyEntry = { q1_value: number; q2_learning: number; responses: number }
type Scope = { type: 'all' } | { type: 'case'; value: string } | { type: 'faculty'; value: string }

const dashboard = dashboardRaw as unknown as Dashboard
const staffMap = staffMappingsRaw as unknown as StaffMap
const surveyScores = surveyScoresRaw as unknown as Record<string, SurveyEntry>

function buildContext(scope: Scope): string {
  const allPts = computeSessionPoints(dashboard, staffMap)

  let pts = allPts
  let scopeDesc = `all ${allPts.length} sessions across all cases and faculty`

  if (scope.type === 'case') {
    pts = allPts.filter(p => p.caseTitle === scope.value)
    scopeDesc = `${pts.length} sessions of the "${scope.value}" case`
  } else if (scope.type === 'faculty') {
    pts = allPts.filter(p => p.faculty === scope.value)
    scopeDesc = `${pts.length} sessions facilitated by ${scope.value}`
  }

  const overran = pts.filter(p => p.overran)
  const withEnd = pts.filter(p => p.endDeltaMin !== null)
  const avgEnd = withEnd.length
    ? Math.round(withEnd.reduce((s, p) => s + p.endDeltaMin!, 0) / withEnd.length)
    : null
  const withIntro = pts.filter(p => p.introDeltaMin !== null)
  const lateIntro = withIntro.filter(p => p.introDeltaMin! > 0)

  const surveyPts = pts.filter(p => surveyScores[p.sessionId])
  const avgQ1 = surveyPts.length
    ? (surveyPts.reduce((s, p) => s + surveyScores[p.sessionId].q1_value, 0) / surveyPts.length).toFixed(2)
    : null
  const avgQ2 = surveyPts.length
    ? (surveyPts.reduce((s, p) => s + surveyScores[p.sessionId].q2_learning, 0) / surveyPts.length).toFixed(2)
    : null

  const uniqueCases = [...new Set(pts.map(p => p.caseTitle))]
  const uniqueFaculty = [...new Set(pts.map(p => p.faculty).filter(Boolean))]

  const caseBreakdown = uniqueCases.map(c => {
    const cPts = pts.filter(p => p.caseTitle === c)
    const cOver = cPts.filter(p => p.overran)
    const cAvg = cPts.filter(p => p.endDeltaMin !== null)
    const avg = cAvg.length
      ? Math.round(cAvg.reduce((s, p) => s + p.endDeltaMin!, 0) / cAvg.length)
      : null
    const fac = [...new Set(cPts.map(p => p.faculty).filter(Boolean))].join(', ')
    return `- ${c}: ${cOver.length}/${cPts.length} overran, avg end delta ${avg !== null ? (avg > 0 ? '+' : '') + avg + 'm' : '?'}${fac ? ` (${fac})` : ''}`
  })

  const perSessionLines = pts.map(p => {
    const intro = p.introDeltaMin !== null ? `intro ${p.introDeltaMin > 0 ? '+' : ''}${p.introDeltaMin}m` : null
    const end = p.endDeltaMin !== null ? `end ${p.endDeltaMin > 0 ? '+' : ''}${p.endDeltaMin}m` : null
    const sv = surveyScores[p.sessionId]
    const scores = sv ? `Q1=${sv.q1_value} Q2=${sv.q2_learning} n=${sv.responses}` : null
    return `- ${p.cohort} (${p.caseTitle.replace('Influencing Without Authority', 'IWA').replace('Managing Profitability', 'MP').replace('Enabling Peak Performance', 'EPP').replace('Navigating Critical Conversations', 'NCC')}): ${[intro, end, scores].filter(Boolean).join(', ')}`
  })

  return `You are an operations and learning design consultant reviewing session delivery data for cc.abilitie.com, a platform running AI-simulation business case sessions for corporate leadership programmes (BectonDickinson EMEA LEAP programme on the Arrow platform).

SCOPE: ${scopeDesc}
${scope.type === 'faculty' ? `Cases delivered: ${uniqueCases.join(', ')}` : ''}
${scope.type === 'case' ? `Faculty who delivered it: ${uniqueFaculty.join(', ')}` : ''}

PACING SUMMARY:
- ${overran.length} of ${pts.length} sessions (${pts.length ? Math.round(overran.length / pts.length * 100) : 0}%) ran over scheduled time
- Average end delta: ${avgEnd !== null ? (avgEnd > 0 ? '+' : '') + avgEnd + 'm' : 'n/a'}
- Late intros: ${lateIntro.length} of ${withIntro.length} sessions
${uniqueCases.length > 1 ? `\nBY CASE:\n${caseBreakdown.join('\n')}` : ''}
${surveyPts.length > 0 ? `\nSURVEY (${surveyPts.length} sessions with data, scale 1–5):\n- Avg Q1 Content Value: ${avgQ1}\n- Avg Q2 Learning: ${avgQ2}` : ''}

PER-SESSION DETAIL:
${perSessionLines.join('\n')}`.trim()
}

export async function POST(req: NextRequest) {
  const { type, question, scope = { type: 'all' } } = await req.json() as {
    type: 'suggestions' | 'question'
    question?: string
    scope?: Scope
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return new Response('ANTHROPIC_API_KEY is not set. Add it to .env.local.', { status: 503 })
  }

  const client = new Anthropic({ apiKey })
  const context = buildContext(scope)

  const userMessage = type === 'suggestions'
    ? `Based on the session data, give feedback in exactly two parts.

Part 1 — 3 things the team should be AWARE OF. Flag the most important patterns, risks, or findings from this specific scope.

AWARE: [title, 5 words or fewer]
DETAIL: [1–2 sentences with specifics from the data]
---

Part 2 — 3 PRODUCT improvements: concrete changes to Arrow case content or runsheet timing the product team could actually make. Think about what to cut from the intro, how to adjust chapter timing, where the planned time doesn't match reality. Do NOT compare facilitator scores to learning scores.

IMPROVE: [title, 5 words or fewer]
DETAIL: [1–2 sentences describing the specific change]
---

Output: three AWARE/DETAIL/--- blocks, then three IMPROVE/DETAIL/--- blocks. Nothing else.`
    : `The programme team is asking a question about this data. Answer specifically. Be direct.

Question: ${question}`

  const stream = await client.messages.stream({
    model: 'claude-opus-4-6',
    max_tokens: 700,
    system: context,
    messages: [{ role: 'user', content: userMessage }],
  })

  const encoder = new TextEncoder()
  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
            controller.enqueue(encoder.encode(chunk.delta.text))
          }
        }
      } finally {
        controller.close()
      }
    },
  })

  return new Response(readable, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
}
