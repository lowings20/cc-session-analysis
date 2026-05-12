import type { Dashboard, MergedSession, SegmentBlock } from '@/app/data/types'

export interface SessionPoint {
  sessionId: string
  cohort: string
  caseTitle: string
  introDeltaMin: number | null  // actual intro - expected intro (pos = late)
  endDeltaMin: number | null    // actual total - scheduled (pos = overran)
  debriefExpectedMin: number
  debriefActualMin: number
  debriefCutMin: number         // expected - actual (pos = less debrief than planned)
  overran: boolean
  incomplete: boolean
  actualChapters: number
  expectedChapters: number
  teams: number
  date: string
}

export interface ChapterSlot {
  caseTitle: string
  chapterIndex: number
  chapterLabel: string
  plannedMin: number   // expected chapter + breakout combined
  actuals: number[]   // per-session actual durations in minutes
  n: number
  min: number
  median: number
  max: number
  p25: number
  p75: number
}

function percentile(sorted: number[], p: number): number {
  const idx = (p / 100) * (sorted.length - 1)
  const lo = Math.floor(idx)
  const hi = Math.ceil(idx)
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo)
}

// Combine expected chapter + its following breakout into one planned slot
function expectedChapterSlots(expected: SegmentBlock[]): Array<{ label: string; duration_s: number }> {
  const slots: Array<{ label: string; duration_s: number }> = []
  for (let i = 0; i < expected.length; i++) {
    const b = expected[i]
    if (b.type !== 'chapter') continue
    let total = b.duration_s
    if (i + 1 < expected.length && expected[i + 1].type === 'chapter_breakout') {
      total += expected[i + 1].duration_s
    }
    slots.push({ label: b.label, duration_s: total })
  }
  return slots
}

export function computeSessionPoints(dashboard: Dashboard): SessionPoint[] {
  const points: SessionPoint[] = []

  for (const [caseTitle, caseData] of Object.entries(dashboard.cases)) {
    const expIntro = caseData.expected.find(b => b.type === 'intro')
    const expDebriefTotal = caseData.expected
      .filter(b => b.type === 'debrief')
      .reduce((s, b) => s + b.duration_s, 0)
    const expChapterSlots = expectedChapterSlots(caseData.expected)
    const expChapters = expChapterSlots.length

    for (const session of caseData.sessions) {
      const actIntro = session.actual.find(b => b.type === 'intro')
      const introDeltaMin =
        expIntro && actIntro
          ? Math.round((actIntro.duration_s - expIntro.duration_s) / 60)
          : null

      const actualEnd = session.actual.length
        ? session.actual[session.actual.length - 1].end_s
        : 0
      const endDeltaMin = session.scheduled_duration_min
        ? Math.round((actualEnd - session.scheduled_duration_min * 60) / 60)
        : null

      const actDebriefTotal = session.actual
        .filter(b => b.type === 'debrief')
        .reduce((s, b) => s + b.duration_s, 0)

      const actChapters = session.actual.filter(b => b.type === 'chapter').length

      points.push({
        sessionId: session.id,
        cohort: session.cohort || session.name,
        caseTitle,
        introDeltaMin,
        endDeltaMin,
        debriefExpectedMin: Math.round(expDebriefTotal / 60),
        debriefActualMin: Math.round(actDebriefTotal / 60),
        debriefCutMin: Math.round((expDebriefTotal - actDebriefTotal) / 60),
        overran: endDeltaMin !== null && endDeltaMin > 0,
        incomplete: actChapters < expChapters,
        actualChapters: actChapters,
        expectedChapters: expChapters,
        teams: session.teams,
        date: session.session_start_display,
      })
    }
  }

  return points
}

export function computeChapterVariance(dashboard: Dashboard): ChapterSlot[] {
  const slots: ChapterSlot[] = []

  for (const [caseTitle, caseData] of Object.entries(dashboard.cases)) {
    const expSlots = expectedChapterSlots(caseData.expected)

    expSlots.forEach((expSlot, idx) => {
      const actuals: number[] = []
      for (const session of caseData.sessions) {
        const sessionChapters = session.actual.filter(b => b.type === 'chapter')
        if (sessionChapters[idx]) {
          actuals.push(sessionChapters[idx].duration_s / 60)
        }
      }
      if (actuals.length === 0) return
      const sorted = [...actuals].sort((a, b) => a - b)
      slots.push({
        caseTitle,
        chapterIndex: idx,
        chapterLabel: expSlot.label.replace(/^CHAPTER\s+/i, 'Ch'),
        plannedMin: expSlot.duration_s / 60,
        actuals,
        n: actuals.length,
        min: sorted[0],
        median: percentile(sorted, 50),
        max: sorted[sorted.length - 1],
        p25: percentile(sorted, 25),
        p75: percentile(sorted, 75),
      })
    })
  }

  return slots
}
