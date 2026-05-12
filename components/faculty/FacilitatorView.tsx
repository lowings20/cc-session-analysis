'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import CoachingPanel from './CoachingPanel'
import MagicMomentCard from './MagicMomentCard'

// ── Types ────────────────────────────────────────────────────────────────────

type Speaker = { name: string; role: string; words: number; wordPct: number; turns: number }
type MagicMoment = { title: string; quote: string | null; context: string }
type ChapterScore = { avg: number; median: number; min: number; max: number; n: number }

export type SessionData = {
  id: string
  case: string
  caseShort: string
  date: string
  cohort: string
  talkTime?: { durationMin: number; speakers: Speaker[] } | null
  magicMoments: MagicMoment[]
  survey?: {
    q1_value: number
    q2_learning: number
    q4_facilitator: number
    responses: number
    q3_takeaways: string[]
    q6_liked_most: string[]
    q7_improve: string[]
  } | null
  simScores?: {
    chapter_scores: Record<string, ChapterScore>
    reflection_pct?: number
  } | null
  endDeltaMin?: number | null
  introDeltaMin?: number | null
}

// ── Constants ─────────────────────────────────────────────────────────────────

const FACILITATORS = [
  { name: 'Nick White', available: true },
  { name: 'Tamara Nolte', available: false },
  { name: 'Francois-Alexandre Leonard', available: false },
]

const CHAPTER_LABEL: Record<string, string> = {
  IWA_Ch4: 'Ch4 – Narrative outcome',
  MP_Ch1_Gelatoat: 'Ch1 – Gelat-oat',
  MP_Ch2_Demand: 'Ch2 – Demand',
  MP_Ch3_Recommendation: 'Ch3 – Recommendation',
}

const ROLE_COLORS: Record<string, string> = {
  faculty: '#60a5fa',
  producer: '#a78bfa',
  host: '#fb923c',
  participant: '#334155',
  participants: '#334155',
}

// ── Small helpers ──────────────────────────────────────────────────────────────

function surveyColor(v: number) {
  return v >= 4.6 ? '#4ade80' : v >= 4.2 ? '#facc15' : '#f87171'
}
function simColor(v: number) {
  return v >= 80 ? '#4ade80' : v >= 65 ? '#facc15' : '#f87171'
}

function Check({ present }: { present: boolean }) {
  return (
    <div className="flex justify-center">
      {present
        ? <span className="text-[#4ade80] text-xs font-semibold">✓</span>
        : <span className="text-[#334155] text-xs">–</span>
      }
    </div>
  )
}

function ScoreBar({ value }: { value: number }) {
  const pct = (value / 5) * 100
  const color = surveyColor(value)
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-[#0f172a] rounded-full h-1.5 overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-xs font-semibold tabular-nums w-8 text-right" style={{ color }}>
        {value.toFixed(2)}
      </span>
    </div>
  )
}

function TalkTimeBar({ speakers }: { speakers: Speaker[] }) {
  return (
    <div className="space-y-3">
      <div className="h-5 flex rounded overflow-hidden">
        {speakers.map(s => (
          <div
            key={s.name}
            style={{ width: `${s.wordPct}%`, background: ROLE_COLORS[s.role] ?? '#475569' }}
            title={`${s.name}: ${s.wordPct}%`}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {speakers.map(s => (
          <div key={s.name} className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-sm shrink-0" style={{ background: ROLE_COLORS[s.role] ?? '#475569' }} />
            <span className="text-[10px] text-[#94a3b8]">{s.name}</span>
            <span className="text-[10px] font-semibold text-[#e2e8f0]">{s.wordPct}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Session accordion ─────────────────────────────────────────────────────────

function SessionAccordion({ session }: { session: SessionData }) {
  const [open, setOpen] = useState(false)

  const hasMagic = session.magicMoments.length > 0
  const hasTalkTime = !!session.talkTime
  const hasSurvey = !!session.survey
  const hasSimScores = !!(session.simScores?.chapter_scores && Object.keys(session.simScores.chapter_scores).length > 0)

  const badges = [
    hasMagic && { label: 'magic', color: 'text-[#93c5fd] border-[#1e40af]/40 bg-[#1e3a5f]/40' },
    hasTalkTime && { label: 'transcript', color: 'text-[#475569] border-[#334155] bg-[#1e293b]' },
    hasSurvey && { label: 'survey', color: 'text-[#475569] border-[#334155] bg-[#1e293b]' },
    hasSimScores && { label: 'sim scores', color: 'text-[#475569] border-[#334155] bg-[#1e293b]' },
  ].filter(Boolean) as { label: string; color: string }[]

  return (
    <div className="border border-[#334155] rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 bg-[#1e293b] hover:bg-[#253348] transition-colors text-left gap-4"
      >
        <div className="flex items-center gap-3 min-w-0">
          {open
            ? <ChevronDown size={14} className="text-[#475569] shrink-0" />
            : <ChevronRight size={14} className="text-[#475569] shrink-0" />
          }
          <div className="min-w-0">
            <span className="text-sm font-medium text-[#e2e8f0]">{session.date.replace(', 2026', '')}</span>
            <span className="mx-2 text-[#334155]">·</span>
            <span className="text-xs text-[#94a3b8]">{session.caseShort} · {session.cohort}</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {badges.map(b => (
            <span key={b.label} className={`text-[10px] px-1.5 py-0.5 rounded border ${b.color}`}>
              {b.label}
            </span>
          ))}
        </div>
      </button>

      {open && (
        <div className="px-5 py-5 bg-[#0f172a] border-t border-[#334155] space-y-6">

          {/* Magic moments */}
          {hasMagic && (
            <div>
              <p className="text-[10px] font-semibold text-[#60a5fa] uppercase tracking-wider mb-3">Magic moments</p>
              <div className="space-y-3">
                {session.magicMoments.map((m, i) => (
                  <MagicMomentCard
                    key={i}
                    moment={m}
                    caseShort={session.caseShort}
                    date={session.date}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Talk time */}
          {hasTalkTime && (
            <div>
              <p className="text-[10px] font-semibold text-[#60a5fa] uppercase tracking-wider mb-3">
                Talk time · {session.talkTime!.durationMin} min session
              </p>
              <TalkTimeBar speakers={session.talkTime!.speakers} />
            </div>
          )}

          {/* Survey scores */}
          {hasSurvey && (
            <div className="space-y-4">
              <p className="text-[10px] font-semibold text-[#60a5fa] uppercase tracking-wider">
                Survey scores · n={session.survey!.responses}
              </p>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: 'Q4 Facilitator', value: session.survey!.q4_facilitator },
                  { label: 'Q1 Value', value: session.survey!.q1_value },
                  { label: 'Q2 Learning', value: session.survey!.q2_learning },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <div className="text-[10px] text-[#475569] mb-1">{label}</div>
                    <ScoreBar value={value} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sim scores */}
          {hasSimScores && (
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <p className="text-[10px] font-semibold text-[#60a5fa] uppercase tracking-wider">Sim scores</p>
                {session.simScores!.reflection_pct !== undefined && (
                  <span className="text-[10px] text-[#475569]">
                    {Math.round(session.simScores!.reflection_pct!)}% reflected
                  </span>
                )}
              </div>
              {Object.entries(session.simScores!.chapter_scores).map(([key, s]) => {
                const color = simColor(s.avg)
                return (
                  <div key={key} className="flex items-center gap-3">
                    <span className="text-[10px] text-[#475569] w-40 shrink-0">{CHAPTER_LABEL[key] ?? key}</span>
                    <div className="flex-1 bg-[#1e293b] rounded-full h-1.5 overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${s.avg}%`, background: color }} />
                    </div>
                    <span className="text-xs font-semibold tabular-nums w-8 text-right" style={{ color }}>
                      {Math.round(s.avg)}
                    </span>
                    <span className="text-[10px] text-[#334155] w-24 shrink-0">({s.min}–{s.max}, n={s.n})</span>
                  </div>
                )
              })}
            </div>
          )}

          {/* Open-text */}
          {hasSurvey && (() => {
            const takeaways = session.survey!.q3_takeaways.filter(r => !r.startsWith('The facilitator was'))
            const liked = session.survey!.q6_liked_most
            const improve = session.survey!.q7_improve ?? []
            if (!takeaways.length && !liked.length && !improve.length) return null
            return (
              <div className="border-t border-[#334155]/50 pt-4 space-y-3">
                {[
                  { label: 'Key takeaways', items: takeaways, labelColor: 'text-[#475569]' },
                  { label: 'Liked most', items: liked, labelColor: 'text-[#475569]' },
                  { label: 'How to improve', items: improve, labelColor: 'text-[#f59e0b]' },
                ].map(({ label, items, labelColor }) => items.length > 0 && (
                  <div key={label}>
                    <div className={`text-[10px] ${labelColor} mb-1.5 uppercase tracking-wide`}>{label}</div>
                    <ul className="space-y-1">
                      {items.map((r, i) => (
                        <li key={i} className="text-xs text-[#94a3b8] leading-relaxed flex gap-2">
                          <span className="text-[#334155] shrink-0">—</span>
                          <span>{r.replace(/^\d+\.\s*/, '')}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )
          })()}

          {!hasMagic && !hasTalkTime && !hasSurvey && !hasSimScores && (
            <p className="text-xs text-[#475569] italic">No detailed data available for this session.</p>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main view ─────────────────────────────────────────────────────────────────

interface Props {
  activeFacilitator: string
  sessions: SessionData[]
}

export default function FacilitatorView({ activeFacilitator, sessions }: Props) {
  return (
    <div className="px-6 py-8 space-y-10 max-w-4xl">

      {/* Facilitator selector */}
      <div className="space-y-2">
        <p className="text-[10px] text-[#475569] uppercase tracking-wider">Facilitator</p>
        <div className="flex flex-wrap gap-2">
          {FACILITATORS.map(f => (
            <button
              key={f.name}
              disabled={!f.available}
              className={`px-3 py-2 rounded-lg text-xs border transition-colors ${
                f.name === activeFacilitator
                  ? 'bg-[#1e3a5f]/60 border-[#1e40af]/60 text-[#93c5fd]'
                  : f.available
                  ? 'bg-transparent border-[#334155] text-[#94a3b8] hover:border-[#475569] hover:text-[#e2e8f0] cursor-pointer'
                  : 'bg-transparent border-[#1e293b] text-[#334155] cursor-not-allowed select-none'
              }`}
            >
              {f.name}
              {!f.available && <span className="ml-1.5 text-[9px]">coming soon</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Session summary */}
      <div className="bg-[#1e293b] border border-[#334155] rounded-lg p-5 space-y-4">
        <p className="text-xs font-semibold text-[#e2e8f0]">{sessions.length} sessions in this dataset</p>

        {/* Column headers */}
        <div className="grid grid-cols-[5rem_4rem_1fr_5rem_4rem_5rem_4rem] gap-x-3 items-center">
          <span className="text-[10px] text-[#334155] uppercase tracking-wide">Date</span>
          <span className="text-[10px] text-[#334155] uppercase tracking-wide">Case</span>
          <span className="text-[10px] text-[#334155] uppercase tracking-wide">Cohort</span>
          <span className="text-[10px] text-[#334155] uppercase tracking-wide text-center">Sim admin</span>
          <span className="text-[10px] text-[#334155] uppercase tracking-wide text-center">Survey</span>
          <span className="text-[10px] text-[#334155] uppercase tracking-wide text-center">Transcript</span>
          <span className="text-[10px] text-[#334155] uppercase tracking-wide text-center">Magic</span>
        </div>

        <div className="space-y-2.5 border-t border-[#334155]/50 pt-3">
          {sessions.map(s => {
            const hasSim = !!(s.simScores?.chapter_scores && Object.keys(s.simScores.chapter_scores).length > 0)
            const hasSurvey = !!s.survey
            const hasTranscript = !!s.talkTime
            const hasMagic = s.magicMoments.length > 0
            return (
              <div key={s.id} className="grid grid-cols-[5rem_4rem_1fr_5rem_4rem_5rem_4rem] gap-x-3 items-center">
                <span className="text-xs text-[#e2e8f0]">{s.date.replace(', 2026', '')}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#0f172a] border border-[#334155] text-[#475569] text-center">
                  {s.caseShort}
                </span>
                <span className="text-xs text-[#94a3b8] truncate">{s.cohort}</span>
                <Check present={hasSim} />
                <Check present={hasSurvey} />
                <Check present={hasTranscript} />
                <Check present={hasMagic} />
              </div>
            )
          })}
        </div>
      </div>

      {/* Coaching panel */}
      <div className="bg-[#1e293b] border border-[#334155] rounded-lg p-5">
        <div className="mb-5">
          <h2 className="text-base font-semibold text-[#e2e8f0]">Coaching overview</h2>
          <p className="text-xs text-[#94a3b8] mt-0.5">
            Auto-generated from session data. Regenerate for a fresh perspective.
          </p>
        </div>
        <CoachingPanel apiRoute="/api/nick-coach" />
      </div>

      {/* Session accordions */}
      <div>
        <h2 className="text-base font-semibold text-[#e2e8f0] mb-4">Sessions</h2>
        <div className="space-y-2">
          {sessions.map(session => (
            <SessionAccordion key={session.id} session={session} />
          ))}
        </div>
      </div>

    </div>
  )
}
