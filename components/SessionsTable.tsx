'use client'

import { useMemo, useState } from 'react'

export interface SessionRow {
  session_id: number
  session_uuid: string
  session_name: string
  start_date: string | null
  program_id: number
  program_name: string
  program_uuid: string
  case_challenge: string
  number_of_teams: number
  players_per_team: number | null
  facilitators: string | null
  producers: string | null
}

type SortKey =
  | 'case_challenge'
  | 'session_name'
  | 'start_date'
  | 'number_of_teams'
  | 'program_name'
  | 'facilitators'
  | 'producers'

type SortDir = 'asc' | 'desc'

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function arrowProgramUrl(uuid: string): string {
  return `https://arrow.abilitie.com/programs/${uuid}`
}

function uniqueValues(rows: SessionRow[], key: 'case_challenge' | 'facilitators' | 'producers'): string[] {
  const set = new Set<string>()
  for (const r of rows) {
    const v = r[key]
    if (!v) continue
    if (key === 'case_challenge') {
      set.add(v)
    } else {
      for (const name of v.split(',')) {
        const trimmed = name.trim().replace(/\s+/g, ' ')
        if (trimmed) set.add(trimmed)
      }
    }
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b))
}

function compare(a: SessionRow, b: SessionRow, key: SortKey, dir: SortDir): number {
  const mult = dir === 'asc' ? 1 : -1
  if (key === 'number_of_teams') {
    return (a.number_of_teams - b.number_of_teams) * mult
  }
  if (key === 'start_date') {
    const av = a.start_date ? new Date(a.start_date).getTime() : -Infinity
    const bv = b.start_date ? new Date(b.start_date).getTime() : -Infinity
    return (av - bv) * mult
  }
  const av = (a[key] ?? '') as string
  const bv = (b[key] ?? '') as string
  return av.localeCompare(bv) * mult
}

const COLUMNS: { key: SortKey; label: string; align?: 'right' }[] = [
  { key: 'case_challenge', label: 'Case Challenge' },
  { key: 'session_name', label: 'Session' },
  { key: 'start_date', label: 'Date' },
  { key: 'number_of_teams', label: 'Teams', align: 'right' },
  { key: 'program_name', label: 'Program' },
  { key: 'facilitators', label: 'Facilitator' },
  { key: 'producers', label: 'Producer' },
]

export default function SessionsTable({ rows }: { rows: SessionRow[] }) {
  const [search, setSearch] = useState('')
  const [caseFilter, setCaseFilter] = useState('')
  const [facilitatorFilter, setFacilitatorFilter] = useState('')
  const [producerFilter, setProducerFilter] = useState('')
  const [minTeams, setMinTeams] = useState<number>(4)
  const [sortKey, setSortKey] = useState<SortKey>('start_date')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  const cases = useMemo(() => uniqueValues(rows, 'case_challenge'), [rows])
  const facilitators = useMemo(() => uniqueValues(rows, 'facilitators'), [rows])
  const producers = useMemo(() => uniqueValues(rows, 'producers'), [rows])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return rows.filter((r) => {
      if (caseFilter && r.case_challenge !== caseFilter) return false
      if (facilitatorFilter && !(r.facilitators ?? '').toLowerCase().includes(facilitatorFilter.toLowerCase())) return false
      if (producerFilter && !(r.producers ?? '').toLowerCase().includes(producerFilter.toLowerCase())) return false
      if (r.number_of_teams < minTeams) return false
      if (q) {
        const hay = [
          r.case_challenge,
          r.session_name,
          r.program_name,
          r.facilitators ?? '',
          r.producers ?? '',
        ]
          .join(' ')
          .toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [rows, search, caseFilter, facilitatorFilter, producerFilter, minTeams])

  const sorted = useMemo(() => {
    const copy = [...filtered]
    copy.sort((a, b) => compare(a, b, sortKey, sortDir))
    return copy
  }, [filtered, sortKey, sortDir])

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir(key === 'start_date' || key === 'number_of_teams' ? 'desc' : 'asc')
    }
  }

  const inputClass =
    'bg-[#0f172a] border border-[#1e293b] text-[#e2e8f0] text-sm rounded px-3 py-2 focus:outline-none focus:border-[#475569]'

  return (
    <div>
      <div className="flex flex-wrap gap-3 mb-4 items-end">
        <div className="flex flex-col gap-1 flex-1 min-w-[240px]">
          <label className="text-[10px] uppercase tracking-wider text-[#475569]">Search</label>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search session, program, person…"
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] uppercase tracking-wider text-[#475569]">Case challenge</label>
          <select value={caseFilter} onChange={(e) => setCaseFilter(e.target.value)} className={inputClass}>
            <option value="">All ({cases.length})</option>
            {cases.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] uppercase tracking-wider text-[#475569]">Facilitator</label>
          <select value={facilitatorFilter} onChange={(e) => setFacilitatorFilter(e.target.value)} className={inputClass}>
            <option value="">All ({facilitators.length})</option>
            {facilitators.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] uppercase tracking-wider text-[#475569]">Producer</label>
          <select value={producerFilter} onChange={(e) => setProducerFilter(e.target.value)} className={inputClass}>
            <option value="">All ({producers.length})</option>
            {producers.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] uppercase tracking-wider text-[#475569]">Min teams</label>
          <input
            type="number"
            min={1}
            value={minTeams}
            onChange={(e) => setMinTeams(Number(e.target.value) || 1)}
            className={`${inputClass} w-24`}
          />
        </div>

        {(search || caseFilter || facilitatorFilter || producerFilter || minTeams !== 4) && (
          <button
            type="button"
            onClick={() => {
              setSearch('')
              setCaseFilter('')
              setFacilitatorFilter('')
              setProducerFilter('')
              setMinTeams(4)
            }}
            className="text-xs text-[#94a3b8] hover:text-[#e2e8f0] underline underline-offset-2"
          >
            Reset
          </button>
        )}
      </div>

      <div className="text-xs text-[#94a3b8] mb-2">
        Showing {sorted.length} of {rows.length} sessions
      </div>

      <div className="rounded-lg border border-[#1e293b] overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-[#1e293b] text-[#94a3b8] select-none">
            <tr>
              {COLUMNS.map((col) => {
                const active = sortKey === col.key
                const arrow = active ? (sortDir === 'asc' ? '▲' : '▼') : ''
                return (
                  <th
                    key={col.key}
                    onClick={() => toggleSort(col.key)}
                    className={`font-medium px-4 py-3 cursor-pointer hover:text-[#e2e8f0] ${
                      col.align === 'right' ? 'text-right' : 'text-left'
                    }`}
                  >
                    <span className="inline-flex items-center gap-1">
                      {col.label}
                      <span className={`text-[10px] ${active ? 'text-[#a78bfa]' : 'text-[#334155]'}`}>{arrow || '↕'}</span>
                    </span>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {sorted.map((r) => (
              <tr key={r.session_id} className="border-t border-[#1e293b] hover:bg-[#131e2e]">
                <td className="px-4 py-3 text-[#e2e8f0]">{r.case_challenge}</td>
                <td className="px-4 py-3 text-[#cbd5e1]">{r.session_name}</td>
                <td className="px-4 py-3 text-[#94a3b8] whitespace-nowrap">{formatDate(r.start_date)}</td>
                <td className="px-4 py-3 text-right text-[#e2e8f0] font-medium tabular-nums">{r.number_of_teams}</td>
                <td className="px-4 py-3">
                  <a
                    href={arrowProgramUrl(r.program_uuid)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#a78bfa] hover:text-[#c4b5fd] hover:underline"
                  >
                    {r.program_name}
                  </a>
                </td>
                <td className="px-4 py-3 text-[#cbd5e1]">{r.facilitators ?? '—'}</td>
                <td className="px-4 py-3 text-[#94a3b8]">{r.producers ?? '—'}</td>
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={COLUMNS.length} className="px-4 py-8 text-center text-[#475569]">
                  No sessions match the current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
