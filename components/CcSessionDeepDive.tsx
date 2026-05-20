'use client'

import { useState } from 'react'
import type { CcSessionData, CcSessionEvent } from '@/lib/cc-sessions'

const EVENT_COLOR: Record<string, string> = {
  STARTING_MESSAGE: 'bg-[#34d399]',
  ENDING_MESSAGE: 'bg-[#f59e0b]',
  CASE_PROGRESS: 'bg-[#7c3aed]',
  FACILITATION_TIP: 'bg-[#0ea5e9]',
  COHORT_INSIGHTS: 'bg-[#a78bfa]',
}

const EVENT_LABEL: Record<string, string> = {
  STARTING_MESSAGE: 'Start',
  ENDING_MESSAGE: 'End',
  CASE_PROGRESS: 'Progress',
  FACILITATION_TIP: 'Tip',
  COHORT_INSIGHTS: 'Insight',
}

function ts(iso: string): number {
  return new Date(iso).getTime()
}

function formatClock(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
}

function formatDuration(ms: number): string {
  const totalSec = Math.round(ms / 1000)
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

function htmlToText(html: string): string {
  return html
    .replace(/<\/?(?:b|i|ul|li|br|div|span|strong|em)[^>]*>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

interface Props {
  data: CcSessionData
}

export default function CcSessionDeepDive({ data }: Props) {
  const [filter, setFilter] = useState<Set<string>>(new Set(['STARTING_MESSAGE', 'ENDING_MESSAGE', 'CASE_PROGRESS', 'FACILITATION_TIP', 'COHORT_INSIGHTS']))
  const [showAll, setShowAll] = useState(false)

  const events = data.events.filter((e) => filter.has(e.type))
  const visibleEvents = showAll ? events : events.slice(0, 20)

  // Build chapter timing comparison: planned (cumulative) vs actual
  const orderedChapters = [...data.chapters].sort((a, b) => a.order - b.order)

  // Find session start (earliest event) and end (latest event)
  if (data.events.length === 0) return <div className="text-sm text-[#94a3b8]">No events.</div>
  const sessionStart = ts(data.events[0].created_at)
  const sessionEnd = ts(data.events[data.events.length - 1].created_at)
  const sessionDurationMs = sessionEnd - sessionStart

  // Per-chapter actual duration
  const chapterActuals = orderedChapters.map((c) => {
    const timing = data.chapter_timings[c.id]
    if (!timing?.started_at || !timing?.ended_at) return { chapter: c, actual_min: null as number | null, start_offset_min: null as number | null }
    return {
      chapter: c,
      actual_min: (ts(timing.ended_at) - ts(timing.started_at)) / 60000,
      start_offset_min: (ts(timing.started_at) - sessionStart) / 60000,
    }
  })

  const totalPlannedMin = orderedChapters.reduce((s, c) => s + c.duration_min, 0)

  // Teams sorted by score descending
  const teams = [...data.teams]
  const results = data.team_results_for_viewed_chapter
  const teamsSortedByScore = teams
    .map((t) => ({ team: t, result: results[t.id] }))
    .filter((t) => t.result)
    .sort((a, b) => (b.result!.score ?? 0) - (a.result!.score ?? 0))

  // Narrative outcome distribution
  const outcomeCount = new Map<string, number>()
  for (const r of Object.values(results)) {
    outcomeCount.set(r.narrative_outcome, (outcomeCount.get(r.narrative_outcome) ?? 0) + 1)
  }

  function toggleFilter(t: string) {
    const next = new Set(filter)
    if (next.has(t)) next.delete(t)
    else next.add(t)
    setFilter(next)
  }

  function scoreColor(score: number): string {
    if (score >= 85) return 'bg-[#34d399]'
    if (score >= 70) return 'bg-[#facc15]'
    return 'bg-[#ef4444]'
  }

  return (
    <div className="space-y-8">
      <div className="text-xs text-[#475569]">
        Source: <a href={data.source_url} target="_blank" rel="noopener noreferrer" className="text-[#a78bfa] hover:underline break-all">facilitator console</a>
        <span className="mx-2">·</span>
        Session ran {formatClock(data.events[0].created_at)} – {formatClock(data.events[data.events.length - 1].created_at)} ({formatDuration(sessionDurationMs)})
      </div>

      {/* Chapter timing actual vs planned */}
      <div>
        <h3 className="text-sm font-semibold text-[#e2e8f0] mb-3">Chapter timing — actual vs planned</h3>
        <div className="text-[10px] text-[#475569] mb-2">
          Planned chapters total {totalPlannedMin}m. Actual session length {formatDuration(sessionDurationMs)}.
        </div>
        <div className="space-y-2">
          {orderedChapters.map((c, i) => {
            const actual = chapterActuals[i]
            const planned = c.duration_min
            const actualMin = actual.actual_min ?? null
            const widthBase = Math.max(planned, actualMin ?? 0, 1)
            return (
              <div key={c.id} className="grid grid-cols-[100px_1fr] gap-3 items-center text-xs">
                <div className="text-[#cbd5e1] font-medium">{c.title}</div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-[#475569] w-12">plan</span>
                    <div className="flex-1 h-3 bg-[#1e293b] rounded relative">
                      <div className="absolute inset-y-0 left-0 bg-[#475569] rounded" style={{ width: `${(planned / widthBase) * 100}%` }} />
                      <span className="absolute inset-0 px-2 flex items-center text-[9px] text-white/80">{planned}m</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-[#475569] w-12">actual</span>
                    <div className="flex-1 h-3 bg-[#1e293b] rounded relative">
                      {actualMin !== null ? (
                        <>
                          <div className={`absolute inset-y-0 left-0 rounded ${actualMin > planned ? 'bg-[#f59e0b]' : 'bg-[#34d399]'}`} style={{ width: `${(actualMin / widthBase) * 100}%` }} />
                          <span className="absolute inset-0 px-2 flex items-center text-[9px] text-white/80">{actualMin.toFixed(1)}m</span>
                        </>
                      ) : (
                        <span className="absolute inset-0 px-2 flex items-center text-[9px] text-[#475569]">no data</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Team outcomes */}
      <div>
        <h3 className="text-sm font-semibold text-[#e2e8f0] mb-1">Team outcomes — Chapter 4</h3>
        <div className="text-[10px] text-[#475569] mb-3">
          From the facilitator chapter URL we have. Each chapter would require its own URL for full coverage.
        </div>
        <div className="flex flex-wrap gap-2 mb-4">
          {Array.from(outcomeCount.entries()).map(([outcome, n]) => (
            <span key={outcome} className="px-2 py-1 rounded bg-[#1e293b] border border-[#334155] text-[11px] text-[#cbd5e1]">
              {outcome} <span className="text-[#94a3b8]">× {n}</span>
            </span>
          ))}
        </div>

        <div className="space-y-1.5">
          {teamsSortedByScore.map(({ team, result }) => {
            if (!result) return null
            return (
              <div key={team.id} className="flex items-center gap-3 text-xs">
                <span className="text-base w-6">{team.icon}</span>
                <span className="text-[#cbd5e1] w-44 truncate" title={team.name}>{team.name}</span>
                <div className="flex-1 h-5 bg-[#1e293b] rounded relative overflow-hidden">
                  <div className={`absolute inset-y-0 left-0 ${scoreColor(result.score)}`} style={{ width: `${result.score}%` }} />
                  <span className="absolute inset-0 px-2 flex items-center text-[10px] font-medium text-white">{result.score}</span>
                </div>
                <span className="text-[10px] text-[#94a3b8] w-32 text-right truncate">{result.narrative_outcome}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Activity feed event stream */}
      <div>
        <h3 className="text-sm font-semibold text-[#e2e8f0] mb-1">Activity feed</h3>
        <div className="text-[10px] text-[#475569] mb-3">{data.events.length} events. {events.length} match filter.</div>

        <div className="flex flex-wrap gap-2 mb-4">
          {(['STARTING_MESSAGE', 'ENDING_MESSAGE', 'CASE_PROGRESS', 'FACILITATION_TIP', 'COHORT_INSIGHTS'] as const).map((t) => {
            const active = filter.has(t)
            return (
              <button
                key={t}
                type="button"
                onClick={() => toggleFilter(t)}
                className={`px-2 py-1 rounded text-[10px] border transition-colors ${
                  active
                    ? `${EVENT_COLOR[t]} text-white border-transparent`
                    : 'bg-transparent text-[#94a3b8] border-[#334155] hover:border-[#475569]'
                }`}
              >
                {EVENT_LABEL[t]}
              </button>
            )
          })}
        </div>

        <div className="space-y-2">
          {visibleEvents.map((e) => (
            <Event key={e.id} event={e} sessionStart={sessionStart} />
          ))}
        </div>
        {events.length > 20 && (
          <button
            type="button"
            onClick={() => setShowAll((v) => !v)}
            className="text-xs text-[#a78bfa] hover:text-[#c4b5fd] mt-3"
          >
            {showAll ? `Show first 20 ▲` : `Show all ${events.length} ▼`}
          </button>
        )}
      </div>

      {/* Heatmap placeholder */}
      <div>
        <h3 className="text-sm font-semibold text-[#e2e8f0] mb-1">Scoring rubric heatmap</h3>
        <div className="text-xs text-[#94a3b8]">
          We have the overall chapter score per team (above). The rubric sub-criteria (the &quot;technical pieces of the analysis&quot;) live in per-team
          conversation analysis pages — one URL per team per chapter — which we have not fetched yet. Once we have those, this heatmap will render
          rubric rows × team columns, colored by whether each team earned credit on each criterion.
        </div>
      </div>
    </div>
  )
}

function Event({ event, sessionStart }: { event: CcSessionEvent; sessionStart: number }) {
  const [open, setOpen] = useState(false)
  const offsetMs = ts(event.created_at) - sessionStart
  const offsetMin = Math.floor(offsetMs / 60000)
  const offsetSec = Math.floor((offsetMs % 60000) / 1000)
  const cleanText = htmlToText(event.content)
  const truncated = cleanText.length > 140 ? cleanText.slice(0, 140) + '…' : cleanText
  const hasMore = cleanText.length > 140

  return (
    <div className="flex gap-3 items-start text-xs">
      <span className="text-[10px] text-[#475569] tabular-nums w-12 mt-1">
        {String(offsetMin).padStart(2, '0')}:{String(offsetSec).padStart(2, '0')}
      </span>
      <span className={`mt-1.5 w-2 h-2 rounded-full ${EVENT_COLOR[event.type] ?? 'bg-[#64748b]'} flex-shrink-0`} />
      <div className="flex-1">
        <div className="text-[10px] text-[#94a3b8] uppercase tracking-wider">{EVENT_LABEL[event.type] ?? event.type}</div>
        <div className="text-[#cbd5e1]">
          {open || !hasMore ? cleanText : truncated}
          {hasMore && (
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="text-[#a78bfa] hover:underline ml-2 text-[10px]"
            >
              {open ? 'less' : 'more'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
