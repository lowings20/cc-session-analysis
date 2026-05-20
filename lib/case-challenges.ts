import data from '@/app/data/case-challenges.json'

export interface RunsheetSegment {
  section: string
  length_min: number
  start_min: number | null
  end_min: number | null
  focus: string
  notes: string
}

export interface CaseChallenge {
  case_challenge: string
  slug: string | null
  url_key: string
  name: string
  description: string | null
  pillar: string | null
  level: string | null
  duration: string | null
  imageUrl: string | null
  runsheet_folder: string | null
  runsheet_version: string | null
  runsheet_segments: RunsheetSegment[]
  session_count: number
}

interface File {
  generated_at: string
  source: string
  cases: CaseChallenge[]
}

export function getCaseChallenges(): File {
  return data as unknown as File
}

export function findCase(urlKey: string): CaseChallenge | undefined {
  return getCaseChallenges().cases.find((c) => c.url_key === urlKey)
}

export function segmentKind(section: string): 'intro' | 'chapter' | 'breakout' | 'debrief' | 'break' | 'close' | 'buffer' | 'other' {
  const s = section.toUpperCase()
  if (s.includes('INTRO')) return 'intro'
  if (s.includes('CHAPTER')) return 'chapter'
  if (s.includes('BREAK') && !s.includes('OUT')) return 'break'
  if (s.includes('FINAL') || s.includes('REFLECT')) return 'debrief'
  if (s.includes('CLOSE') || s.includes('CLOSING')) return 'close'
  if (s.includes('BUFFER')) return 'buffer'
  return 'other'
}
