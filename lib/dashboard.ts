import dashboardData from '@/app/data/dashboard.json'
import type { Dashboard, CaseData } from '@/app/data/types'

export function getDashboard(): Dashboard {
  return dashboardData as unknown as Dashboard
}

export function getCaseTimelineData(caseChallenge: string): CaseData | undefined {
  return getDashboard().cases[caseChallenge]
}
