import type { Dashboard, MergedSession } from '@/app/data/types'

export interface FilterState {
  dateRange: { from: Date | null; to: Date | null }
  cases: string[]
  search: string
  minTeams: number
}

function parseSessionDate(session: MergedSession): Date | null {
  // Format: "May 6, 12:00 PM EDT"
  const m = session.session_start_display.match(/^(\w+\s+\d+),\s+(\d+:\d+\s+[AP]M)/)
  if (!m) return null
  const d = new Date(`${m[1]} 2026 ${m[2]}`)
  return isNaN(d.getTime()) ? null : d
}

export function applyFilters(dashboard: Dashboard, filters: FilterState): Dashboard {
  const { dateRange, cases, search, minTeams } = filters
  const result: Dashboard = { cases: {} }

  for (const [title, caseData] of Object.entries(dashboard.cases)) {
    if (cases.length > 0 && !cases.includes(title)) continue

    const sessions = caseData.sessions.filter(session => {
      if (session.teams < minTeams) return false

      if (dateRange.from || dateRange.to) {
        const date = parseSessionDate(session)
        if (date) {
          if (dateRange.from) {
            const from = new Date(dateRange.from)
            from.setHours(0, 0, 0, 0)
            if (date < from) return false
          }
          if (dateRange.to) {
            const to = new Date(dateRange.to)
            to.setHours(23, 59, 59, 999)
            if (date > to) return false
          }
        }
      }

      if (search) {
        const q = search.toLowerCase()
        if (
          !session.name.toLowerCase().includes(q) &&
          !session.cohort.toLowerCase().includes(q)
        )
          return false
      }

      return true
    })

    if (sessions.length > 0) {
      result.cases[title] = { ...caseData, sessions }
    }
  }

  return result
}

export function parseDateParam(val: string | null): Date | null {
  if (!val) return null
  const d = new Date(val + 'T00:00:00')
  return isNaN(d.getTime()) ? null : d
}

export function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10)
}

export function parseFilterState(params: URLSearchParams): FilterState {
  const fromStr = params.get('from')
  const toStr = params.get('to')
  const casesStr = params.get('cases')
  const search = params.get('search') ?? ''
  const minTeams = parseInt(params.get('minTeams') ?? '4', 10)

  return {
    dateRange: {
      from: parseDateParam(fromStr),
      to: parseDateParam(toStr),
    },
    cases: casesStr ? casesStr.split(',').map(c => decodeURIComponent(c.trim())).filter(Boolean) : [],
    search,
    minTeams: isNaN(minTeams) ? 4 : minTeams,
  }
}

export function defaultFilterState(): FilterState {
  const to = new Date()
  const from = new Date()
  from.setDate(from.getDate() - 90)
  return {
    dateRange: { from, to },
    cases: [],
    search: '',
    minTeams: 4,
  }
}
