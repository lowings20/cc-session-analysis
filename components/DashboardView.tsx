'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { RefreshCw, Users, User } from 'lucide-react'
import type { Dashboard, MergedSession, SegmentBlock } from '@/app/data/types'
import type { StaffMap } from '@/lib/insights'
import { applyFilters, defaultFilterState, parseFilterState, toDateStr, type FilterState } from '@/lib/filter'
import Timeline from '@/components/Timeline'
import InsightsTab from '@/components/InsightsTab'
import engagementRaw from '@/app/data/engagement.json'

type ChapterScore = { avg: number; median: number; min: number; max: number; n: number; zeros?: number }
type EngagementEntry = {
  chapter_scores?: Record<string, ChapterScore>
  reflection_pct?: number
  bookmarks?: number
  conversation?: { total: number; user: number; asst: number; teams: number; players: number }
}
const engagement = engagementRaw as unknown as Record<string, EngagementEntry>

const CHAPTER_LABEL: Record<string, string> = {
  IWA_Ch4: 'Ch4',
  MP_Ch1_Gelatoat: 'Ch1',
  MP_Ch2_Demand: 'Ch2',
  MP_Ch3_Recommendation: 'Ch3',
}

function scoreColor(avg: number) {
  if (avg >= 80) return '#4ade80'
  if (avg >= 65) return '#facc15'
  return '#f87171'
}

const EPP = 'Enabling Peak Performance'

function sortedCaseTitles(dashboard: Dashboard): string[] {
  const titles = Object.keys(dashboard.cases)
  const epp = titles.filter(t => t === EPP)
  const rest = titles.filter(t => t !== EPP).sort()
  return [...epp, ...rest]
}

function getActualDuration(session: MergedSession): number {
  if (!session.actual.length) return 0
  return session.actual[session.actual.length - 1].end_s
}

function getIntroDelta(expected: SegmentBlock[], session: MergedSession): number | null {
  const expIntro = expected.find(b => b.type === 'intro')
  const actIntro = session.actual.find(b => b.type === 'intro')
  if (!expIntro || !actIntro) return null
  return Math.round((actIntro.duration_s - expIntro.duration_s) / 60)
}

function getEndDelta(session: MergedSession): number | null {
  if (!session.scheduled_duration_min) return null
  const actual = getActualDuration(session)
  return Math.round((actual - session.scheduled_duration_min * 60) / 60)
}

function IntroPill({ delta }: { delta: number | null }) {
  if (delta === null) return null
  const abs = Math.abs(delta)
  if (delta > 0)
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-red-900/40 text-red-300 border border-red-800/50">
        intro +{abs}m late
      </span>
    )
  if (delta < 0)
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-green-900/40 text-green-300 border border-green-800/50">
        intro {abs}m early
      </span>
    )
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-slate-700/50 text-slate-300 border border-slate-600/50">
      on time intro
    </span>
  )
}

function EndPill({ delta }: { delta: number | null }) {
  if (delta === null) return null
  const abs = Math.abs(delta)
  if (delta > 0)
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-red-900/40 text-red-300 border border-red-800/50">
        ran +{abs}m over
      </span>
    )
  if (delta < 0)
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-green-900/40 text-green-300 border border-green-800/50">
        ended {abs}m under
      </span>
    )
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-slate-700/50 text-slate-300 border border-slate-600/50">
      ended on time
    </span>
  )
}

function computeMaxSeconds(dashboard: Dashboard): number {
  let max = 0
  for (const caseData of Object.values(dashboard.cases)) {
    for (const b of caseData.expected) max = Math.max(max, b.end_s)
    for (const s of caseData.sessions) {
      for (const b of s.actual) max = Math.max(max, b.end_s)
    }
  }
  const maxMinutes = Math.ceil(max / 60 / 10) * 10
  return maxMinutes * 60
}

// --- Chip button ---
function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1 rounded text-xs font-medium border transition-colors cursor-pointer ${
        active
          ? 'bg-[#334155] border-[#475569] text-[#e2e8f0]'
          : 'bg-transparent border-[#334155] text-[#94a3b8] hover:border-[#475569] hover:text-[#e2e8f0]'
      }`}
    >
      {children}
    </button>
  )
}

// --- Refresh button ---
function RefreshButton() {
  const [showTip, setShowTip] = useState(false)
  const ref = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!showTip) return
    const t = setTimeout(() => setShowTip(false), 3000)
    return () => clearTimeout(t)
  }, [showTip])

  return (
    <div className="relative">
      <button
        ref={ref}
        onClick={() => setShowTip(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs border border-[#334155] text-[#94a3b8] hover:text-[#e2e8f0] hover:border-[#475569] transition-colors cursor-pointer"
        aria-label="Refresh data"
      >
        <RefreshCw size={12} />
        Refresh
      </button>
      {showTip && (
        <div className="absolute right-0 top-full mt-2 w-64 p-3 rounded bg-[#1e293b] border border-[#334155] text-xs text-[#94a3b8] z-50 shadow-lg">
          Snapshot is static — regenerate in Cowork to refresh.
        </div>
      )}
    </div>
  )
}

// --- Filter bar ---
function FilterBar({
  filters,
  allCases,
  totalSessions,
  onChange,
}: {
  filters: FilterState
  allCases: string[]
  totalSessions: number
  onChange: (f: FilterState) => void
}) {
  const today = new Date()
  const todayStr = toDateStr(today)

  const setPreset = (days: number | null) => {
    if (days === null) {
      onChange({ ...filters, dateRange: { from: null, to: null } })
      return
    }
    const from = new Date()
    from.setDate(from.getDate() - days)
    onChange({ ...filters, dateRange: { from, to: new Date() } })
  }

  const isPreset = (days: number) => {
    if (!filters.dateRange.from || !filters.dateRange.to) return false
    const diff = Math.round(
      (filters.dateRange.to.getTime() - filters.dateRange.from.getTime()) / 86400000
    )
    return diff === days - 1 || diff === days
  }

  const isAll = !filters.dateRange.from && !filters.dateRange.to

  const toggleCase = (c: string) => {
    const next = filters.cases.includes(c)
      ? filters.cases.filter(x => x !== c)
      : [...filters.cases, c]
    onChange({ ...filters, cases: next })
  }

  return (
    <div className="bg-[#1e293b] border-b border-[#334155] px-6 py-4 space-y-3">
      {/* Date row */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-[#94a3b8] w-16 shrink-0">Date</span>
        <div className="flex flex-wrap items-center gap-1.5">
          <Chip active={isPreset(30)} onClick={() => setPreset(30)}>30d</Chip>
          <Chip active={isPreset(60)} onClick={() => setPreset(60)}>60d</Chip>
          <Chip active={isPreset(90)} onClick={() => setPreset(90)}>90d</Chip>
          <Chip active={isAll} onClick={() => setPreset(null)}>All</Chip>
          <span className="text-[#475569] text-xs px-1">|</span>
          <input
            type="date"
            value={filters.dateRange.from ? toDateStr(filters.dateRange.from) : ''}
            max={todayStr}
            onChange={e => {
              const d = e.target.value ? new Date(e.target.value + 'T00:00:00') : null
              onChange({ ...filters, dateRange: { ...filters.dateRange, from: d } })
            }}
            className="bg-[#0f172a] border border-[#334155] rounded px-2 py-0.5 text-xs text-[#94a3b8] focus:outline-none focus:border-[#475569]"
          />
          <span className="text-[#475569] text-xs">–</span>
          <input
            type="date"
            value={filters.dateRange.to ? toDateStr(filters.dateRange.to) : ''}
            max={todayStr}
            onChange={e => {
              const d = e.target.value ? new Date(e.target.value + 'T00:00:00') : null
              onChange({ ...filters, dateRange: { ...filters.dateRange, to: d } })
            }}
            className="bg-[#0f172a] border border-[#334155] rounded px-2 py-0.5 text-xs text-[#94a3b8] focus:outline-none focus:border-[#475569]"
          />
        </div>
      </div>

      {/* Case row */}
      <div className="flex flex-wrap items-start gap-2">
        <span className="text-xs text-[#94a3b8] w-16 shrink-0 pt-1">Cases</span>
        <div className="flex flex-wrap gap-1.5">
          <Chip active={filters.cases.length === 0} onClick={() => onChange({ ...filters, cases: [] })}>
            All
          </Chip>
          {allCases.map(c => (
            <Chip key={c} active={filters.cases.includes(c)} onClick={() => toggleCase(c)}>
              {c}
            </Chip>
          ))}
        </div>
      </div>

      {/* Search + minTeams row */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-xs text-[#94a3b8] w-16 shrink-0">Search</span>
        <input
          type="text"
          placeholder="Search cohorts…"
          value={filters.search}
          onChange={e => onChange({ ...filters, search: e.target.value })}
          className="bg-[#0f172a] border border-[#334155] rounded px-3 py-1 text-xs text-[#e2e8f0] placeholder-[#475569] focus:outline-none focus:border-[#475569] w-48"
        />
        <label className="flex items-center gap-2 text-xs text-[#94a3b8]">
          <span>≥</span>
          <input
            type="number"
            min={1}
            value={filters.minTeams}
            onChange={e => {
              const v = parseInt(e.target.value, 10)
              onChange({ ...filters, minTeams: isNaN(v) ? 4 : v })
            }}
            className="bg-[#0f172a] border border-[#334155] rounded px-2 py-1 text-xs text-[#e2e8f0] focus:outline-none focus:border-[#475569] w-14 text-center"
          />
          <span>teams</span>
        </label>
        <span className="ml-auto text-xs text-[#475569]">{totalSessions} sessions</span>
      </div>
    </div>
  )
}

// --- Main component ---
export default function DashboardView({
  dashboard,
  snapshotDate,
  staffMap = {},
}: {
  dashboard: Dashboard
  snapshotDate: string
  staffMap?: StaffMap
}) {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Parse filters from URL, falling back to defaults
  const [filters, setFilters] = useState<FilterState>(() => {
    const params = new URLSearchParams(searchParams.toString())
    const hasAnyParam = params.has('from') || params.has('to') || params.has('cases') || params.has('search') || params.has('minTeams')
    return hasAnyParam ? parseFilterState(params) : defaultFilterState()
  })

  const updateFilters = useCallback(
    (next: FilterState) => {
      setFilters(next)
      const params = new URLSearchParams()
      if (next.dateRange.from) params.set('from', toDateStr(next.dateRange.from))
      if (next.dateRange.to) params.set('to', toDateStr(next.dateRange.to))
      if (next.cases.length) params.set('cases', next.cases.join(','))
      if (next.search) params.set('search', next.search)
      if (next.minTeams !== 4) params.set('minTeams', String(next.minTeams))
      const qs = params.toString()
      router.replace(qs ? `/?${qs}` : '/', { scroll: false })
    },
    [router]
  )

  const [tab, setTab] = useState<'sessions' | 'insights'>('sessions')

  const filtered = applyFilters(dashboard, filters)
  const sortedTitles = sortedCaseTitles(dashboard)
  const allCases = sortedTitles

  const totalSessions = Object.values(filtered.cases).reduce(
    (sum, c) => sum + c.sessions.length,
    0
  )

  const maxSeconds = computeMaxSeconds(filtered.cases ? filtered : dashboard)

  // For InsightsTab scope pickers
  const caseOptions = sortedTitles.map(title => ({
    title,
    count: dashboard.cases[title]?.sessions.length ?? 0,
  }))
  const facultyCounts: Record<string, number> = {}
  for (const entry of Object.values(staffMap)) {
    if (entry.faculty) facultyCounts[entry.faculty] = (facultyCounts[entry.faculty] ?? 0) + 1
  }
  const facultyOptions = Object.entries(facultyCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({ name, count }))

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-[#1e293b] border-b border-[#334155] px-6 pt-4 sticky top-0 z-40">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-lg font-semibold text-[#e2e8f0]">Runsheet vs Actual</h1>
            <p className="text-xs text-[#94a3b8] mt-0.5">
              cc.abilitie.com session pacing analysis
              {snapshotDate && ` · snapshot from ${snapshotDate}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="/insights"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs border border-[#334155] text-[#94a3b8] hover:text-[#e2e8f0] hover:border-[#475569] transition-colors"
            >
              Insights
            </a>
            <a
              href="/faculty/nick"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs border border-[#334155] text-[#94a3b8] hover:text-[#e2e8f0] hover:border-[#475569] transition-colors"
            >
              Facilitator
            </a>
            <RefreshButton />
          </div>
        </div>
        {/* Tab bar */}
        <div className="flex items-center gap-0 mt-3">
          {([
            { id: 'sessions', label: 'Sessions' },
            { id: 'insights', label: 'Generate Insights' },
          ] as const).map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors cursor-pointer ${
                tab === t.id
                  ? t.id === 'insights'
                    ? 'border-[#a78bfa] text-[#a78bfa]'
                    : 'border-[#e2e8f0] text-[#e2e8f0]'
                  : 'border-transparent text-[#475569] hover:text-[#94a3b8]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </header>

      {tab === 'sessions' && (
        <>
          {/* Filter bar */}
          <FilterBar
            filters={filters}
            allCases={allCases}
            totalSessions={totalSessions}
            onChange={updateFilters}
          />
          {/* Content */}
          <main className="px-6 py-6 space-y-6">
        {totalSessions === 0 ? (
          <div className="text-center py-16 text-[#94a3b8]">
            No sessions match. Try widening the date range or lowering the team threshold.
          </div>
        ) : (
          sortedTitles.map(title => {
            const caseData = filtered.cases[title]
            if (!caseData) return null
            const isEPP = title === EPP

            return (
              <section
                key={title}
                className="rounded-lg bg-[#1e293b] overflow-hidden"
                style={isEPP ? { borderLeft: '3px solid #a78bfa' } : { borderLeft: '3px solid transparent' }}
              >
                {/* Case header */}
                <div className="px-5 py-3 border-b border-[#334155] flex items-center gap-3">
                  <h2 className="text-sm font-semibold text-[#e2e8f0]">{title}</h2>
                  <span className="text-xs text-[#475569]">
                    {caseData.sessions.length} session{caseData.sessions.length !== 1 ? 's' : ''}
                  </span>
                </div>

                {/* Sessions */}
                <div className="divide-y divide-[#334155]">
                  {caseData.sessions.map(session => {
                    const introDelta = getIntroDelta(caseData.expected, session)
                    const endDelta = getEndDelta(session)

                    return (
                      <div key={session.id} className="px-5 py-4">
                        {/* Session header */}
                        <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
                          <div className="flex flex-wrap items-center gap-2 min-w-0">
                            <a
                              href={`/session/${session.id}`}
                              className="text-sm font-medium text-[#e2e8f0] hover:text-[#a78bfa] transition-colors truncate"
                            >
                              {session.cohort || session.name}
                            </a>
                            <span className="text-xs text-[#475569]">{session.session_start_display}</span>
                            <span className="flex items-center gap-0.5 text-xs text-[#94a3b8]">
                              <Users size={11} />
                              {session.teams}
                            </span>
                            <span className="flex items-center gap-0.5 text-xs text-[#94a3b8]">
                              <User size={11} />
                              {session.players}
                            </span>
                            {session.inferred && (
                              <span className="text-[10px] text-[#475569] italic">inferred start</span>
                            )}
                            {staffMap[session.id]?.faculty && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#1e3a5f]/60 text-[#93c5fd] border border-[#1e40af]/40">
                                {staffMap[session.id].faculty}
                              </span>
                            )}
                            {staffMap[session.id]?.producer && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#2d1b4e]/60 text-[#c4b5fd] border border-[#5b21b6]/40">
                                {staffMap[session.id].producer}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <IntroPill delta={introDelta} />
                            <EndPill delta={endDelta} />
                          </div>
                        </div>

                        {/* Timeline */}
                        <Timeline
                          expected={caseData.expected}
                          actual={session.actual}
                          maxSeconds={maxSeconds}
                          scheduledDurationMin={session.scheduled_duration_min}
                          sessionId={session.id}
                          sessionLabel={session.cohort || session.name}
                        />

                        {/* Sim scores + reflection */}
                        {(() => {
                          const eng = engagement[session.id]
                          if (!eng) return null
                          const scores = eng.chapter_scores
                          const reflPct = eng.reflection_pct
                          return (
                            <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1">
                              {scores && Object.entries(scores).map(([key, s]) => (
                                <div key={key} className="flex items-center gap-1.5">
                                  <span className="text-[10px] text-[#475569]">{CHAPTER_LABEL[key] ?? key}</span>
                                  <span className="text-[11px] font-semibold tabular-nums" style={{ color: scoreColor(s.avg) }}>
                                    {Math.round(s.avg)}
                                  </span>
                                  <span className="text-[10px] text-[#334155]">avg</span>
                                  <span className="text-[10px] text-[#475569]">({s.min}–{s.max}, n={s.n})</span>
                                </div>
                              ))}
                              {reflPct !== undefined && (
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[10px] text-[#475569]">reflections</span>
                                  <span className="text-[11px] font-semibold tabular-nums" style={{ color: scoreColor(reflPct) }}>
                                    {Math.round(reflPct)}%
                                  </span>
                                </div>
                              )}
                            </div>
                          )
                        })()}
                      </div>
                    )
                  })}
                </div>
              </section>
            )
          })
        )}
      </main>
        </>
      )}

      {tab === 'insights' && (
        <InsightsTab
          cases={caseOptions}
          faculty={facultyOptions}
          totalSessions={Object.values(dashboard.cases).reduce((s, c) => s + c.sessions.length, 0)}
        />
      )}
    </div>
  )
}
