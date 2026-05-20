import sessionsData from '@/app/data/sessions.json'
import type { SessionRow } from '@/components/SessionsTable'

export interface SessionsFile {
  generated_at: string
  source: string
  rows: SessionRow[]
}

export function getSessions(): SessionsFile {
  return sessionsData as unknown as SessionsFile
}

export function splitNames(value: string | null | undefined): string[] {
  if (!value) return []
  return value
    .split(',')
    .map((n) => n.trim().replace(/\s+/g, ' '))
    .filter(Boolean)
}

export function formatSnapshotDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
