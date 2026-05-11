import { Suspense } from 'react'
import { getDashboard } from '@/lib/data'
import DashboardView from '@/components/DashboardView'

function getSnapshotDate(dashboard: Awaited<ReturnType<typeof getDashboard>>): string {
  let latest: Date | null = null
  for (const caseData of Object.values(dashboard.cases)) {
    for (const session of caseData.sessions) {
      const m = session.session_start_display.match(/^(\w+\s+\d+),/)
      if (m) {
        const d = new Date(`${m[1]} 2026`)
        if (!latest || d > latest) latest = d
      }
    }
  }
  if (!latest) return ''
  return latest.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

export default async function Page() {
  const dashboard = await getDashboard()
  const snapshotDate = getSnapshotDate(dashboard)

  return (
    <Suspense fallback={<div className="p-8 text-[#94a3b8]">Loading…</div>}>
      <DashboardView dashboard={dashboard} snapshotDate={snapshotDate} />
    </Suspense>
  )
}
