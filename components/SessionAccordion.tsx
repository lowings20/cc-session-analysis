'use client'

import { useState } from 'react'
import type { SessionRow } from './SessionsTable'
import type { CcSessionData, CcTeamResult } from '@/lib/cc-sessions'
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
  const hasActivity = !!ccData
  const hasScoring = !!ccData && Object.keys(ccData.team_results_for_viewed_chapter).length > 0

  return (
    <div className="rounded-lg border border-[#1e293b] bg-[#0f172a] overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-4 px-5 py-4 hover:bg-[#131e2e] transition-colors text-left"
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-[#475569] text-xs">{open ? '▼' : '▶'}</span>
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
          <StatusPill ok={hasSurvey} label="Survey" />
          <StatusPill ok={hasActivity} label="Activity" />
          <StatusPill ok={hasScoring} label="Scoring" />
        </div>
      </button>

      {open && (
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

          <SectionDivider label="Magic moments" />
          <MagicMomentsBlock />
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

  if (!ccData) {
    return (
      <div className="space-y-3">
        <div className="text-sm text-[#94a3b8]">
          No activity feed extracted yet. To enable this row, share the facilitator URL for this session.
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
  if (!ccData) {
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
  if (!ccData) {
    return <div className="text-sm text-[#94a3b8]">Needs activity feed data.</div>
  }
  const teams = ccData.teams
  const results = ccData.team_results_for_viewed_chapter
  const teamRows = teams
    .map((t) => ({ team: t, result: results[t.id] as CcTeamResult | undefined }))
    .filter((r) => r.result)
    .sort((a, b) => (b.result?.score ?? 0) - (a.result?.score ?? 0))

  if (teamRows.length === 0) return <div className="text-sm text-[#94a3b8]">No team scoring data captured.</div>

  // Narrative outcome counts
  const outcomes = new Map<string, number>()
  for (const r of Object.values(results)) outcomes.set(r.narrative_outcome, (outcomes.get(r.narrative_outcome) ?? 0) + 1)

  const viewedChapter = ccData.chapters.find((c) => c.id === ccData.viewed_chapter_id)

  return (
    <div className="space-y-3">
      <div className="text-[10px] text-[#475569]">
        Showing {viewedChapter?.title ?? 'one chapter'} only — full per-chapter scoring needs a URL per chapter.
      </div>

      <div className="flex flex-wrap gap-2">
        {Array.from(outcomes.entries()).map(([o, n]) => (
          <span key={o} className="px-2 py-0.5 rounded bg-[#1e293b] border border-[#334155] text-[11px] text-[#cbd5e1]">
            {o} <span className="text-[#94a3b8]">× {n}</span>
          </span>
        ))}
      </div>

      <div className="space-y-1.5">
        {teamRows.map(({ team, result }) => {
          if (!result) return null
          return (
            <div key={team.id} className="flex items-center gap-3 text-xs">
              <span className="text-base w-6">{team.icon}</span>
              <span className="text-[#cbd5e1] w-44 truncate" title={team.name}>{team.name}</span>
              <div className="flex-1 h-4 bg-[#1e293b] rounded relative overflow-hidden">
                <div className={`absolute inset-y-0 left-0 ${scoreColor(result.score)}`} style={{ width: `${result.score}%` }} />
                <span className="absolute inset-0 px-2 flex items-center text-[10px] font-medium text-white">{result.score}</span>
              </div>
              <span className="text-[10px] text-[#94a3b8] w-32 text-right truncate">{result.narrative_outcome}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function RubricHeatmapBlock({ ccData }: { ccData: CcSessionData | null }) {
  if (!ccData) {
    return <div className="text-sm text-[#94a3b8]">Needs per-team conversation analysis URLs.</div>
  }
  const teams = ccData.teams
  if (teams.length === 0) return <div className="text-sm text-[#94a3b8]">No teams found.</div>

  // Placeholder rubric items — we do not have real data yet, so show the shell
  const placeholderRubric = [
    'Identified key stakeholder dynamics',
    'Built coalition through trusted intermediary',
    'Recognized influence asymmetry',
    'Sequenced outreach strategically',
    'Acknowledged competing priorities',
  ]

  return (
    <div className="space-y-3">
      <div className="text-[10px] text-[#475569]">
        Shell only — rubric criteria and per-team credit not extracted yet. Each criterion comes from the technical insights for a given team / chapter.
      </div>
      <div className="overflow-x-auto">
        <table className="text-[10px] border-separate border-spacing-0">
          <thead>
            <tr>
              <th className="text-left text-[#94a3b8] font-medium px-2 py-1 sticky left-0 bg-[#0f172a]">Rubric criterion</th>
              {teams.map((t) => (
                <th key={t.id} title={t.name} className="text-center text-[#94a3b8] font-medium px-1 py-1 w-8">
                  <span className="text-sm">{t.icon}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {placeholderRubric.map((row) => (
              <tr key={row}>
                <td className="text-[#cbd5e1] px-2 py-1 sticky left-0 bg-[#0f172a]">{row}</td>
                {teams.map((t) => (
                  <td key={t.id} className="text-center bg-[#1e293b] border border-[#0f172a]">
                    <span className="inline-block w-6 h-5 bg-[#1e293b]" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function MagicMomentsBlock() {
  return (
    <div className="text-sm text-[#94a3b8]">
      Coming from transcripts once extracted. Placeholder for now.
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
