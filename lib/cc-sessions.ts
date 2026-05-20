export interface CcSessionEvent {
  id: string
  chapter_id: string
  type: 'CASE_PROGRESS' | 'FACILITATION_TIP' | 'COHORT_INSIGHTS' | 'STARTING_MESSAGE' | 'ENDING_MESSAGE' | string
  content: string
  is_finished: boolean
  invalidated: boolean
  metadata: { source?: string; techDetails?: { model?: string }; [k: string]: unknown }
  created_at: string
  updated_at: string
}

export interface CcSessionChapter {
  id: string
  title: string
  order: number
  duration_min: number
  blocks: number
}

export interface CcSessionTeam {
  id: string
  name: string
  icon: string
  group_letter: string
}

export interface CcTeamResult {
  completed_block_count: number
  opened_block_count: number
  score: number
  narrative_outcome: string
}

export interface CcSessionData {
  session_arrow_id: number
  session_cc_uuid: string
  case_challenge: string
  case_challenge_id: string
  viewed_chapter_id: string
  extracted_at: string
  source_url: string
  chapters: CcSessionChapter[]
  teams: CcSessionTeam[]
  team_results_for_viewed_chapter: Record<string, CcTeamResult>
  chapter_timings: Record<string, { started_at?: string; ended_at?: string }>
  events: CcSessionEvent[]
}

const REGISTRY: Record<number, () => Promise<{ default: CcSessionData }>> = {
  13505: () => import('@/app/data/sessions/13505.json') as unknown as Promise<{ default: CcSessionData }>,
}

export async function getCcSession(arrowId: number): Promise<CcSessionData | null> {
  const loader = REGISTRY[arrowId]
  if (!loader) return null
  const mod = await loader()
  return mod.default
}

export function hasCcSession(arrowId: number): boolean {
  return arrowId in REGISTRY
}
