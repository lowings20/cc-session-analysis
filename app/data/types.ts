export type SegmentType =
  | 'intro'
  | 'chapter'
  | 'chapter_breakout'
  | 'debrief'
  | 'break'
  | 'reflect'
  | 'close'
  | 'buffer'
  | 'other'

export interface SegmentBlock {
  label: string
  type: SegmentType
  start_s: number
  end_s: number
  duration_s: number
}

export interface MergedSession {
  id: string
  name: string
  cohort: string
  teams: number
  players: number
  session_start_display: string
  inferred: boolean
  scheduled_duration_min: number | null
  actual: SegmentBlock[]
}

export interface CaseData {
  expected: SegmentBlock[]
  sessions: MergedSession[]
}

export interface Dashboard {
  cases: Record<string, CaseData>
}
