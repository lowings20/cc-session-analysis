'use client'

import { useState } from 'react'
import type { SessionRow } from './SessionsTable'
import type { CcSessionData, CcTeamResult, CcTeamAnalysis, RubricCell } from '@/lib/cc-sessions'
import type { RunsheetSegment } from '@/lib/case-challenges'
import { segmentKind } from '@/lib/case-challenges'

interface Props {
  sessions: SessionRow[]
  ccDataBySessionId: Record<number, CcSessionData>
  runsheetSegments: RunsheetSegment[]
}

function formatDate(iso: string | null): string {
  if (!iso) return 'No date'
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatClock(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
}

function ts(iso: string): number {
  return new Date(iso).getTime()
}

function scoreColor(score: number): string {
  if (score >= 85) return 'bg-[#34d399]'
  if (score >= 70) return 'bg-[#facc15]'
  return 'bg-[#ef4444]'
}

function htmlToText(html: string): string {
  return html
    .replace(/<\/?(?:b|i|ul|li|br|div|span|strong|em)[^>]*>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const SEG_COLOR: Record<string, string> = {
  intro: 'bg-[#475569]',
  chapter: 'bg-[#7c3aed]',
  breakout: 'bg-[#a78bfa]',
  debrief: 'bg-[#0ea5e9]',
  break: 'bg-[#334155]',
  close: 'bg-[#475569]',
  buffer: 'bg-[#1e293b]',
  other: 'bg-[#64748b]',
}

function SectionDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 mt-6 mb-3">
      <span className="text-[10px] uppercase tracking-wider text-[#64748b] font-medium">{label}</span>
      <div className="flex-1 h-px bg-[#1e293b]" />
    </div>
  )
}

interface ItemProps {
  session: SessionRow
  ccData: CcSessionData | null
  runsheetSegments: RunsheetSegment[]
}

function SessionItem({ session, ccData, runsheetSegments }: ItemProps) {
  const [open, setOpen] = useState(false)

  const hasSurvey = typeof session.survey_score === 'number'
  const hasActivity = !!ccData && ccData.events.length > 0
  const hasScoring = !!ccData && Object.keys(ccData.team_results_for_viewed_chapter).length > 0

  // Is this session in the future?
  const isFuture = (() => {
    if (!session.start_date) return false
    return new Date(session.start_date).getTime() > Date.now()
  })()

  return (
    <div className={`rounded-lg border border-[#1e293b] overflow-hidden ${isFuture ? 'bg-[#0a121f] opacity-70' : 'bg-[#0f172a]'}`}>
      <button
        type="button"
        onClick={() => !isFuture && setOpen((v) => !v)}
        disabled={isFuture}
        className={`w-full flex items-center justify-between gap-4 px-5 py-4 text-left ${
          isFuture ? 'cursor-not-allowed' : 'hover:bg-[#131e2e] transition-colors'
        }`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-[#475569] text-xs">{isFuture ? '·' : open ? '▼' : '▶'}</span>
          <div className="min-w-0">
            <div className="text-sm font-medium text-[#e2e8f0] truncate">{session.program_name}</div>
            <div className="text-[11px] text-[#94a3b8] mt-0.5 flex flex-wrap items-center gap-x-3">
              <span>{session.session_name}</span>
              <span className="text-[#475569]">·</span>
              <span>{formatDate(session.start_date)}</span>
              <span className="text-[#475569]">·</span>
              <span>{session.number_of_teams} teams</span>
              {session.facilitators && (
                <>
                  <span className="text-[#475569]">·</span>
                  <span>{session.facilitators}</span>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {isFuture ? (
            <span className="text-[9px] px-2 py-0.5 rounded uppercase tracking-wider bg-[#1e293b] text-[#94a3b8] border border-[#334155]">
              Scheduled
            </span>
          ) : (
            <>
              <StatusPill ok={hasSurvey} label="Survey" />
              <StatusPill ok={hasActivity} label="Activity" />
              <StatusPill ok={hasScoring} label="Scoring" />
            </>
          )}
        </div>
      </button>

      {open && !isFuture && (
        <div className="border-t border-[#1e293b] px-5 py-5 space-y-1">
          <SectionDivider label="Survey" />
          <SurveyBlock session={session} />

          <SectionDivider label="Actual vs Expected" />
          <TimingBlock session={session} ccData={ccData} runsheetSegments={runsheetSegments} />

          <SectionDivider label="Outcome timing insight" />
          <TimingInsightBlock ccData={ccData} runsheetSegments={runsheetSegments} />

          <SectionDivider label="Scoring" />
          <ScoringBlock ccData={ccData} />

          <SectionDivider label="Rubric heatmap" />
          <RubricHeatmapBlock ccData={ccData} />

          <SectionDivider label="Reflections" />
          <ReflectionsBlock ccData={ccData} />

        </div>
      )}
    </div>
  )
}

function StatusPill({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className={`text-[9px] px-1.5 py-0.5 rounded uppercase tracking-wider ${
      ok ? 'bg-[#1e3a2e] text-[#34d399] border border-[#166534]' : 'bg-[#1e293b] text-[#475569] border border-[#334155]'
    }`}>
      {label}
    </span>
  )
}

function SurveyBlock({ session }: { session: SessionRow }) {
  if (typeof session.survey_score !== 'number') {
    return (
      <div className="text-sm text-[#94a3b8]">
        No survey responses for this session.
        {session.survey_analyze_url && (
          <>
            {' '}
            <a href={session.survey_analyze_url} target="_blank" rel="noopener noreferrer" className="text-[#a78bfa] hover:underline">
              Open in SurveyMonkey →
            </a>
          </>
        )}
      </div>
    )
  }
  const score = session.survey_score
  const pct = Math.max(0, Math.min(100, (score / 5) * 100))
  return (
    <div className="flex items-center gap-4">
      <div className="text-3xl font-semibold text-[#e2e8f0] tabular-nums">{score.toFixed(2)}</div>
      <div className="flex-1 max-w-md">
        <div className="h-3 bg-[#1e293b] rounded relative overflow-hidden">
          <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#7c3aed] to-[#a78bfa]" style={{ width: `${pct}%` }} />
        </div>
        <div className="text-[10px] text-[#475569] mt-1">
          {session.survey_response_count ?? 0} response{session.survey_response_count === 1 ? '' : 's'} · scale 0-5
        </div>
      </div>
      {session.survey_analyze_url && (
        <a href={session.survey_analyze_url} target="_blank" rel="noopener noreferrer" className="text-xs text-[#a78bfa] hover:underline">
          SurveyMonkey →
        </a>
      )}
    </div>
  )
}

function TimingBlock({ session, ccData, runsheetSegments }: { session: SessionRow; ccData: CcSessionData | null; runsheetSegments: RunsheetSegment[] }) {
  const plannedTotalMin = runsheetSegments.reduce((s, x) => s + x.length_min, 0)

  if (!ccData || ccData.events.length === 0) {
    return (
      <div className="space-y-3">
        <div className="text-sm text-[#94a3b8]">
          {ccData
            ? 'No activity feed events were recorded for this session — it was launched but may not have been run.'
            : 'No activity feed extracted yet. To enable this row, share the facilitator URL for this session.'}
        </div>
        {/* Show planned-only as reference */}
        <PlannedBar segments={runsheetSegments} totalMin={plannedTotalMin} />
      </div>
    )
  }

  const sessionStart = ts(ccData.events[0].created_at)
  const sessionEnd = ts(ccData.events[ccData.events.length - 1].created_at)
  const actualTotalMin = (sessionEnd - sessionStart) / 60000
  const orderedChapters = [...ccData.chapters].sort((a, b) => a.order - b.order)

  // Build actual segments from activity feed
  // We can identify chapter blocks from chapter_timings, and pre/post as "intro"/"close"
  return (
    <div className="space-y-4">
      <div className="text-xs text-[#94a3b8]">
        Planned <span className="text-[#e2e8f0] font-medium">{plannedTotalMin.toFixed(0)}m</span>
        <span className="mx-2 text-[#475569]">·</span>
        Actual <span className="text-[#e2e8f0] font-medium">{actualTotalMin.toFixed(0)}m</span>
        <span className="mx-2 text-[#475569]">·</span>
        Started {formatClock(ccData.events[0].created_at)}
        <span className="mx-2 text-[#475569]">·</span>
        Ended {formatClock(ccData.events[ccData.events.length - 1].created_at)}
      </div>

      <div>
        <div className="text-[10px] text-[#475569] mb-1">Plan</div>
        <PlannedBar segments={runsheetSegments} totalMin={plannedTotalMin} />
      </div>

      <div>
        <div className="text-[10px] text-[#475569] mb-1">Actual (per chapter)</div>
        <div className="space-y-1.5">
          {orderedChapters.map((c) => {
            const t = ccData.chapter_timings[c.id]
            const actualMin = t?.started_at && t?.ended_at ? (ts(t.ended_at) - ts(t.started_at)) / 60000 : null
            const planned = c.duration_min
            const delta = actualMin === null ? null : actualMin - planned
            return (
              <div key={c.id} className="grid grid-cols-[100px_1fr_60px] gap-3 items-center text-xs">
                <div className="text-[#cbd5e1]">{c.title}</div>
                <div className="h-4 bg-[#1e293b] rounded relative overflow-hidden">
                  {actualMin !== null ? (
                    <>
                      <div
                        className={`absolute inset-y-0 left-0 ${
                          delta !== null && delta > 1 ? 'bg-[#f59e0b]' : delta !== null && delta < -1 ? 'bg-[#0ea5e9]' : 'bg-[#34d399]'
                        }`}
                        style={{ width: `${Math.min(100, (actualMin / Math.max(planned, actualMin)) * 100)}%` }}
                      />
                      <span className="absolute inset-0 px-2 flex items-center text-[10px] text-white/90">
                        {actualMin.toFixed(1)}m / plan {planned}m
                      </span>
                    </>
                  ) : (
                    <span className="absolute inset-0 px-2 flex items-center text-[10px] text-[#475569]">no data</span>
                  )}
                </div>
                <div className={`text-[10px] tabular-nums text-right ${delta !== null && Math.abs(delta) > 1 ? (delta > 0 ? 'text-[#f59e0b]' : 'text-[#0ea5e9]') : 'text-[#475569]'}`}>
                  {delta !== null ? (delta > 0 ? `+${delta.toFixed(1)}m` : `${delta.toFixed(1)}m`) : ''}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function PlannedBar({ segments, totalMin }: { segments: RunsheetSegment[]; totalMin: number }) {
  if (totalMin === 0) return <div className="text-xs text-[#475569]">No runsheet available.</div>
  return (
    <div className="flex h-7 rounded overflow-hidden border border-[#1e293b]">
      {segments.map((s, i) => {
        const kind = segmentKind(s.section)
        const pct = (s.length_min / totalMin) * 100
        return (
          <div
            key={i}
            title={`${s.section} · ${s.length_min.toFixed(1)}m`}
            className={`${SEG_COLOR[kind]} h-full flex items-center justify-center text-[9px] text-white/90 font-medium border-r border-[#0f172a] last:border-r-0 overflow-hidden`}
            style={{ width: `${pct}%`, minWidth: '3px' }}
          >
            {pct > 5 && s.section.length < 13 ? s.section : ''}
          </div>
        )
      })}
    </div>
  )
}

function TimingInsightBlock({ ccData, runsheetSegments }: { ccData: CcSessionData | null; runsheetSegments: RunsheetSegment[] }) {
  if (!ccData || ccData.events.length === 0) {
    return <div className="text-sm text-[#94a3b8]">Needs activity feed data.</div>
  }
  const sessionStart = ts(ccData.events[0].created_at)
  const sessionEnd = ts(ccData.events[ccData.events.length - 1].created_at)
  const actualTotalMin = (sessionEnd - sessionStart) / 60000
  const plannedTotalMin = runsheetSegments.reduce((s, x) => s + x.length_min, 0)
  const overallDelta = actualTotalMin - plannedTotalMin

  const orderedChapters = [...ccData.chapters].sort((a, b) => a.order - b.order)
  const chapterDeltas = orderedChapters.map((c) => {
    const t = ccData.chapter_timings[c.id]
    if (!t?.started_at || !t?.ended_at) return { c, delta: null as number | null }
    return { c, delta: (ts(t.ended_at) - ts(t.started_at)) / 60000 - c.duration_min }
  })

  // Sort by absolute delta, highlight outliers
  const longest = chapterDeltas.filter((x) => x.delta !== null).sort((a, b) => (b.delta ?? 0) - (a.delta ?? 0))[0]
  const shortest = chapterDeltas.filter((x) => x.delta !== null).sort((a, b) => (a.delta ?? 0) - (b.delta ?? 0))[0]

  // Gap between chapter end and next chapter start (non-chapter time)
  const gaps: { after: string; gap_min: number }[] = []
  for (let i = 0; i < orderedChapters.length - 1; i++) {
    const a = ccData.chapter_timings[orderedChapters[i].id]
    const b = ccData.chapter_timings[orderedChapters[i + 1].id]
    if (a?.ended_at && b?.started_at) {
      gaps.push({ after: orderedChapters[i].title, gap_min: (ts(b.started_at) - ts(a.ended_at)) / 60000 })
    }
  }
  const longestGap = gaps.sort((a, b) => b.gap_min - a.gap_min)[0]

  return (
    <ul className="text-sm text-[#cbd5e1] space-y-1.5 list-disc list-inside marker:text-[#475569]">
      <li>
        Session ran <span className="font-medium text-[#e2e8f0]">{actualTotalMin.toFixed(0)}m</span> vs planned <span className="font-medium text-[#e2e8f0]">{plannedTotalMin.toFixed(0)}m</span> ({overallDelta > 0 ? `+${overallDelta.toFixed(0)}` : overallDelta.toFixed(0)}m).
      </li>
      {longest && longest.delta !== null && longest.delta > 0.5 && (
        <li>
          <span className="text-[#f59e0b]">Longest over plan:</span> {longest.c.title} ran +{longest.delta.toFixed(1)}m.
        </li>
      )}
      {shortest && shortest.delta !== null && shortest.delta < -0.5 && (
        <li>
          <span className="text-[#0ea5e9]">Most under plan:</span> {shortest.c.title} finished {shortest.delta.toFixed(1)}m short.
        </li>
      )}
      {longestGap && (
        <li>
          Longest between-chapter break was after {longestGap.after}: <span className="font-medium text-[#e2e8f0]">{longestGap.gap_min.toFixed(0)}m</span>.
        </li>
      )}
    </ul>
  )
}

function ScoringBlock({ ccData }: { ccData: CcSessionData | null }) {
  const [expandedKey, setExpandedKey] = useState<string | null>(null)
  if (!ccData) {
    return <div className="text-sm text-[#94a3b8]">Needs activity feed data.</div>
  }
  const teams = ccData.teams
  const resultsByChapter = ccData.team_results_by_chapter ?? { [ccData.viewed_chapter_id]: ccData.team_results_for_viewed_chapter }
  const analysesByChapter = ccData.team_analyses_by_chapter ?? (ccData.team_analyses_for_viewed_chapter ? { [ccData.viewed_chapter_id]: ccData.team_analyses_for_viewed_chapter } : {})
  const orderedChapters = [...ccData.chapters].sort((a, b) => a.order - b.order)
  // Only chapters that have any results
  const chaptersWithData = orderedChapters.filter((c) => Object.keys(resultsByChapter[c.id] ?? {}).length > 0)

  if (chaptersWithData.length === 0) return <div className="text-sm text-[#94a3b8]">No team scoring data captured.</div>

  return (
    <div className="space-y-5">
      {chaptersWithData.map((chap) => {
        const results = resultsByChapter[chap.id]
        const analyses = analysesByChapter[chap.id] ?? {}
        const teamRows = teams
          .map((t) => ({ team: t, result: results[t.id] as CcTeamResult | undefined, analysis: analyses[t.id] as CcTeamAnalysis | undefined }))
          .filter((r) => r.result)
          .sort((a, b) => (b.result?.score ?? 0) - (a.result?.score ?? 0))
        const outcomes = new Map<string, number>()
        for (const r of Object.values(results)) outcomes.set(r.narrative_outcome, (outcomes.get(r.narrative_outcome) ?? 0) + 1)
        return (
          <div key={chap.id}>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-[11px] font-semibold text-[#e2e8f0] uppercase tracking-wider">{chap.title}</span>
              <div className="flex flex-wrap gap-1.5">
                {Array.from(outcomes.entries()).map(([o, n]) => (
                  <span key={o} className="px-1.5 py-0.5 rounded bg-[#1e293b] border border-[#334155] text-[10px] text-[#cbd5e1]">
                    {o} <span className="text-[#94a3b8]">× {n}</span>
                  </span>
                ))}
              </div>
            </div>
            <div className="space-y-1">
              {teamRows.map(({ team, result, analysis }) => {
                if (!result) return null
                const key = `${chap.id}:${team.id}`
                const open = expandedKey === key
                return (
                  <div key={key}>
                    <button
                      type="button"
                      onClick={() => setExpandedKey(open ? null : key)}
                      className="w-full flex items-center gap-3 text-xs hover:bg-[#131e2e] rounded px-2 py-1 -mx-2"
                    >
                      <span className="text-[#475569] w-3">{open ? '▼' : '▶'}</span>
                      <span className="text-base w-6">{team.icon}</span>
                      <span className="text-[#cbd5e1] w-44 truncate text-left" title={team.name}>{team.name}</span>
                      <div className="flex-1 h-4 bg-[#1e293b] rounded relative overflow-hidden">
                        <div className={`absolute inset-y-0 left-0 ${scoreColor(result.score)}`} style={{ width: `${result.score}%` }} />
                        <span className="absolute inset-0 px-2 flex items-center text-[10px] font-medium text-white">{result.score}</span>
                      </div>
                      <span className="text-[10px] text-[#94a3b8] w-32 text-right truncate">{result.narrative_outcome}</span>
                    </button>
                    {open && analysis && (
                      <div className="ml-8 mt-2 mb-3 p-3 rounded border border-[#1e293b] bg-[#0a121f] text-xs space-y-3">
                        {analysis.narrativeImpact && (
                          <div>
                            <div className="text-[10px] uppercase tracking-wider text-[#475569] mb-1">Narrative impact — {analysis.narrativeImpact.title}</div>
                            <div className="text-[#cbd5e1] italic">{analysis.narrativeImpact.description}</div>
                          </div>
                        )}
                        {analysis.analysis && (
                          <div>
                            <div className="text-[10px] uppercase tracking-wider text-[#475569] mb-1">
                              {analysis.analysisType === 'EMAIL' && analysis.analysisOptions?.from
                                ? `Email from ${analysis.analysisOptions.from}`
                                : 'Detailed feedback'}
                            </div>
                            <div className="text-[#cbd5e1] whitespace-pre-line leading-relaxed">{analysis.analysis}</div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

const CELL_COLOR: Record<RubricCell, string> = {
  full: 'bg-[#16a34a]',
  partial: 'bg-[#eab308]',
  missing: 'bg-[#7f1d1d]',
}

const CELL_GLYPH: Record<RubricCell, string> = {
  full: '✓',
  partial: '~',
  missing: '·',
}

function RubricHeatmapBlock({ ccData }: { ccData: CcSessionData | null }) {
  if (!ccData) {
    return <div className="text-sm text-[#94a3b8]">Needs per-team conversation analysis URLs.</div>
  }
  if (ccData.teams.length === 0) {
    return <div className="text-sm text-[#94a3b8]">No teams.</div>
  }

  const orderedChapters = [...ccData.chapters].sort((a, b) => a.order - b.order)
  const rubricByChapter = ccData.rubric_by_chapter
  // Fallback: if no per-chapter, use legacy single rubric on the last chapter
  const chaptersWithRubric: { chapId: string; chapTitle: string; rubric: NonNullable<CcSessionData['rubric']> }[] = []
  if (rubricByChapter) {
    for (const chap of orderedChapters) {
      const r = rubricByChapter[chap.id]
      if (r) chaptersWithRubric.push({ chapId: chap.id, chapTitle: chap.title, rubric: r })
    }
  } else if (ccData.rubric) {
    const chap = orderedChapters.find((c) => c.id === ccData.viewed_chapter_id) ?? orderedChapters[orderedChapters.length - 1]
    chaptersWithRubric.push({ chapId: chap?.id ?? 'legacy', chapTitle: chap?.title ?? 'Chapter', rubric: ccData.rubric })
  }

  if (chaptersWithRubric.length === 0) {
    return (
      <div className="text-sm text-[#94a3b8]">
        Rubric not extracted yet. Run <code className="text-[#cbd5e1] bg-[#1e293b] px-1 rounded">scripts/extract_rubric.py {ccData.session_arrow_id}</code> (needs ANTHROPIC_API_KEY).
      </div>
    )
  }

  const teams = ccData.teams

  function pctFull(rowCells: Record<string, RubricCell>): number {
    const total = Object.keys(rowCells).length
    if (total === 0) return 0
    const full = Object.values(rowCells).filter((c) => c === 'full').length
    return Math.round((full / total) * 100)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3 text-[10px] text-[#94a3b8]">
        <span className="flex items-center gap-1.5"><span className={`inline-block w-3 h-3 rounded ${CELL_COLOR.full}`} /> full credit</span>
        <span className="flex items-center gap-1.5"><span className={`inline-block w-3 h-3 rounded ${CELL_COLOR.partial}`} /> mentioned as improvement</span>
        <span className="flex items-center gap-1.5"><span className={`inline-block w-3 h-3 rounded ${CELL_COLOR.missing}`} /> not mentioned</span>
      </div>

      {chaptersWithRubric.map(({ chapId, chapTitle, rubric }) => (
        <div key={chapId}>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-[11px] font-semibold text-[#e2e8f0] uppercase tracking-wider">{chapTitle}</span>
            <span className="text-[10px] text-[#475569] truncate">{rubric.method}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="text-[11px] border-separate border-spacing-0">
              <thead>
                <tr>
                  <th className="text-left text-[#94a3b8] font-medium px-2 py-1 sticky left-0 bg-[#0f172a] z-10 min-w-[260px]">Criterion</th>
                  <th className="text-right text-[#475569] font-medium px-2 py-1 w-12">% full</th>
                  {teams.map((t) => (
                    <th key={t.id} title={t.name} className="text-center text-[#94a3b8] font-medium px-1 py-1 w-7">
                      <span className="text-sm">{t.icon}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rubric.team_cells.map((row) => (
                  <tr key={row.id}>
                    <td className="text-[#cbd5e1] px-2 py-1 sticky left-0 bg-[#0f172a] z-10">{row.label}</td>
                    <td className="text-right text-[#94a3b8] tabular-nums px-2">{pctFull(row.cells)}%</td>
                    {teams.map((t) => {
                      const cell = row.cells[t.id] ?? 'missing'
                      return (
                        <td
                          key={t.id}
                          title={`${t.name}: ${cell}`}
                          className={`text-center text-[10px] text-white/90 ${CELL_COLOR[cell]} border border-[#0f172a]`}
                        >
                          {CELL_GLYPH[cell]}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  )
}

function ReflectionsBlock({ ccData }: { ccData: CcSessionData | null }) {
  if (!ccData) return <div className="text-sm text-[#94a3b8]">Needs activity feed data.</div>
  const questions = ccData.reflections ?? []
  const withAnswers = questions.filter((q) => q.answers.length > 0)
  if (withAnswers.length === 0) {
    return <div className="text-sm text-[#94a3b8]">No reflections captured for this session.</div>
  }
  return (
    <div className="space-y-5">
      {withAnswers.map((q) => (
        <div key={q.id}>
          <div className="mb-2">
            <div className="text-sm font-medium text-[#e2e8f0]">{q.question}</div>
            <div className="text-[10px] text-[#475569] mt-0.5">
              {q.chapter_title ? `${q.chapter_title} · ` : ''}{q.answers.length} response{q.answers.length === 1 ? '' : 's'}
            </div>
          </div>
          <div className="space-y-1.5">
            {q.answers.map((a) => (
              <div key={a.id} className="rounded border border-[#1e293b] bg-[#0a121f] px-3 py-2 text-xs flex items-start gap-3">
                <div className="flex flex-col gap-0.5 min-w-[140px]">
                  {a.team && (
                    <span className="text-[#cbd5e1] truncate">
                      <span className="mr-1">{a.team.icon}</span>
                      {a.team.name}
                    </span>
                  )}
                  {a.player && <span className="text-[10px] text-[#94a3b8] truncate">{a.player.name}</span>}
                </div>
                <div className="flex-1 text-[#e2e8f0] whitespace-pre-line leading-relaxed">{a.answer}</div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export default function SessionAccordion({ sessions, ccDataBySessionId, runsheetSegments }: Props) {
  if (sessions.length === 0) {
    return <div className="text-sm text-[#94a3b8]">No sessions for this case challenge yet.</div>
  }
  return (
    <div className="space-y-2">
      {sessions.map((s) => (
        <SessionItem
          key={s.session_id}
          session={s}
          ccData={ccDataBySessionId[s.session_id] ?? null}
          runsheetSegments={runsheetSegments}
        />
      ))}
    </div>
  )
}
