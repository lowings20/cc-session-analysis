import data from '@/app/data/facilitators.json'
import type { MagicMoment } from './magic-moments'

export interface FacilitatorSession {
  session_id: number
  program_name: string
  program_uuid: string
  session_name: string
  case_challenge: string
  start_date: string | null
  number_of_teams: number
  survey_score: number | null
  survey_response_count: number | null
}

export interface FacilitatorStrength {
  title: string
  evidence: string
}

export interface FacilitatorLearnFrom {
  peer_name: string
  peer_slug: string
  area: string
  why: string
}

export interface FacilitatorProfile {
  name: string
  slug: string
  session_count: number
  case_challenges: string[]
  avg_survey_score: number | null
  survey_session_count: number
  avg_team_score: number | null
  team_score_count: number
  narrative_outcomes: Record<string, number>
  sessions: FacilitatorSession[]
  magic_moments: (MagicMoment & { case_challenge: string })[]
  strengths: FacilitatorStrength[]
  learn_from: FacilitatorLearnFrom[]
  strengths_method: string | null
}

interface FacilitatorsFile {
  generated_at: string
  source: string
  facilitators: FacilitatorProfile[]
}

export function getFacilitators(): FacilitatorsFile {
  return data as unknown as FacilitatorsFile
}

export function findFacilitator(slug: string): FacilitatorProfile | undefined {
  return getFacilitators().facilitators.find((f) => f.slug === slug)
}
