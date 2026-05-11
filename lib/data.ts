import type { Dashboard } from '@/app/data/types'

export interface DataOptions {
  from?: Date
  to?: Date
}

export async function getDashboard(_options: DataOptions = {}): Promise<Dashboard> {
  // v1: bundled static data. v2: fetch('/api/sessions?from=...&to=...')
  const data = await import('@/app/data/dashboard.json')
  return data.default as unknown as Dashboard
}
