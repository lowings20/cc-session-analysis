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

export interface CcTeamAnalysis {
  teamId: string
  teamName: string
  teamIcon: string
  chapterId: string
  score: number
  analysisType: string
  analysisOptions?: { from?: string; subject?: string }
  analysis: string
  narrativeImpact?: { title: string; story: string; description: string; image?: string }
  generatedAt?: string
}

export type RubricCell = 'full' | 'partial' | 'missing'

export interface CcSessionRubric {
  criteria: { id: string; label: string }[]
  team_cells: { id: string; label: string; cells: Record<string, RubricCell> }[]
  method: string
}

export interface CcSessionData {
  session_arrow_id: number
  session_cc_uuid: string
  case_challenge: string
  case_challenge_id: string
  viewed_chapter_id: string
  extracted_at: string
  source_url: string
  tenant_dns?: string
  chapters: CcSessionChapter[]
  teams: CcSessionTeam[]
  team_results_for_viewed_chapter: Record<string, CcTeamResult>
  team_results_by_chapter?: Record<string, Record<string, CcTeamResult>>
  team_analyses_for_viewed_chapter?: Record<string, CcTeamAnalysis>
  team_analyses_by_chapter?: Record<string, Record<string, CcTeamAnalysis>>
  rubric?: CcSessionRubric
  rubric_by_chapter?: Record<string, CcSessionRubric>
  chapter_timings: Record<string, { started_at?: string; ended_at?: string }>
  events: CcSessionEvent[]
}

import { SESSION_REGISTRY as REGISTRY } from './cc-session-registry'

export async function getCcSession(arrowId: number): Promise<CcSessionData | null> {
  const loader = REGISTRY[arrowId]
  if (!loader) return null
  const mod = await loader()
  return mod.default
}

export function hasCcSession(arrowId: number): boolean {
  return arrowId in REGISTRY
}
