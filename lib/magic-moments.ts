import data from '@/app/data/magic-moments.json'

export interface MagicMoment {
  id: string
  facilitator: string
  session_label: string
  timestamp: string
  transcript_path: string
  context: string
  quote: string
  why_magic: string
}

interface MagicMomentsFile {
  generated_at: string
  source: string
  by_case_challenge: Record<string, MagicMoment[]>
}

export function getMagicMomentsFor(caseChallenge: string): MagicMoment[] {
  const f = data as unknown as MagicMomentsFile
  return f.by_case_challenge[caseChallenge] ?? []
}

export function getAllMagicMoments(): MagicMomentsFile {
  return data as unknown as MagicMomentsFile
}
