'use client'

import { useState } from 'react'
import type { SegmentBlock, SegmentType } from '@/app/data/types'
import { fmtMinutes, fmtOffset } from '@/lib/utils'

const SEGMENT_COLORS: Record<SegmentType, string> = {
  intro: '#fce8b2',
  chapter: '#34a853',
  chapter_breakout: '#2a9943',
  debrief: '#fbbc04',
  break: '#9aa0a6',
  reflect: '#f6a821',
  close: '#f6a821',
  buffer: '#ed8936',
  other: '#64748b',
}

const SEGMENT_TEXT: Record<SegmentType, string> = {
  intro: '#1a1000',
  chapter: '#ffffff',
  chapter_breakout: '#ffffff',
  debrief: '#1a1000',
  break: '#1a1a1a',
  reflect: '#1a0500',
  close: '#1a0500',
  buffer: '#1a0500',
  other: '#e2e8f0',
}

interface SegmentProps {
  block: SegmentBlock
  maxSeconds: number
  showLabel?: boolean
}

function Segment({ block, maxSeconds, showLabel = true }: SegmentProps) {
  const [tooltip, setTooltip] = useState(false)
  const left = (block.start_s / maxSeconds) * 100
  const width = (block.duration_s / maxSeconds) * 100

  return (
    <div
      data-segment
      role="button"
      tabIndex={0}
      onMouseEnter={() => setTooltip(true)}
      onMouseLeave={() => setTooltip(false)}
      onFocus={() => setTooltip(true)}
      onBlur={() => setTooltip(false)}
      aria-label={`${block.label}: ${fmtMinutes(block.duration_s)}, ${fmtOffset(block.start_s)}–${fmtOffset(block.end_s)}`}
      style={{
        position: 'absolute',
        left: `${left}%`,
        width: `${Math.max(width, 0.3)}%`,
        top: 0,
        bottom: 0,
        backgroundColor: SEGMENT_COLORS[block.type],
        color: SEGMENT_TEXT[block.type],
        overflow: 'hidden',
      }}
      className="cursor-default"
    >
      {showLabel && width > 4 && (
        <span
          className="absolute inset-0 flex items-center px-1 text-[9px] font-medium leading-none truncate"
          style={{ color: SEGMENT_TEXT[block.type] }}
        >
          {block.label}
        </span>
      )}
      {tooltip && (
        <div className="segment-tooltip">
          <div className="font-medium">{block.label}</div>
          <div className="text-[#94a3b8]">
            {fmtMinutes(block.duration_s)} · {fmtOffset(block.start_s)}–{fmtOffset(block.end_s)}
          </div>
        </div>
      )}
    </div>
  )
}

interface TimelineBarProps {
  segments: SegmentBlock[]
  maxSeconds: number
  variant: 'expected' | 'actual'
  scheduledDurationMin?: number | null
  expectedChapterStarts?: number[]
  ariaLabel: string
}

function TimelineBar({
  segments,
  maxSeconds,
  variant,
  scheduledDurationMin,
  expectedChapterStarts,
  ariaLabel,
}: TimelineBarProps) {
  const scheduledPct =
    scheduledDurationMin ? (scheduledDurationMin * 60 / maxSeconds) * 100 : null

  return (
    <div className="flex items-center gap-2">
      <span
        className="text-[10px] text-[#475569] w-10 shrink-0 text-right"
        aria-hidden="true"
      >
        {variant === 'expected' ? 'Plan' : 'Actual'}
      </span>
      <div
        role="img"
        aria-label={ariaLabel}
        className="relative flex-1 h-5 rounded overflow-visible"
        style={{
          backgroundColor: variant === 'expected' ? '#1e3a2e' : '#1e293b',
          border: variant === 'expected' ? '1px dashed #334155' : '1px solid #334155',
        }}
      >
        {/* Gap background */}
        <div
          className="absolute inset-0 rounded"
          style={{ backgroundColor: variant === 'expected' ? '#1e3a2e' : '#243447' }}
        />

        {/* Segments */}
        {segments.map((block, i) => (
          <Segment key={i} block={block} maxSeconds={maxSeconds} />
        ))}

        {/* Tick marks at expected chapter starts (actual bar only) */}
        {variant === 'actual' &&
          expectedChapterStarts?.map((s, i) => {
            const pct = (s / maxSeconds) * 100
            if (pct <= 0 || pct >= 100) return null
            return (
              <div
                key={i}
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  left: `${pct}%`,
                  top: 0,
                  bottom: 0,
                  width: 1,
                  backgroundColor: 'rgba(255,255,255,0.35)',
                  pointerEvents: 'none',
                  zIndex: 5,
                }}
              />
            )
          })}

        {/* Scheduled end line */}
        {scheduledPct !== null && scheduledPct <= 100 && (
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              left: `${scheduledPct}%`,
              top: -2,
              bottom: -2,
              width: 2,
              borderLeft: '2px dashed #ef4444',
              pointerEvents: 'none',
              zIndex: 10,
            }}
          />
        )}
      </div>
    </div>
  )
}

interface TimelineProps {
  expected: SegmentBlock[]
  actual: SegmentBlock[]
  maxSeconds: number
  scheduledDurationMin: number | null
  sessionId: string
  sessionLabel: string
}

export default function Timeline({
  expected,
  actual,
  maxSeconds,
  scheduledDurationMin,
  sessionId,
  sessionLabel,
}: TimelineProps) {
  // Chapter start times from the expected runsheet (for tick marks on actual bar)
  const expectedChapterStarts = expected
    .filter(b => b.type === 'chapter' || b.type === 'chapter_breakout')
    .map(b => b.start_s)

  // Minute axis ticks
  const tickIntervalMin = maxSeconds / 60 > 90 ? 30 : 20
  const ticks: number[] = []
  for (let m = tickIntervalMin; m < maxSeconds / 60; m += tickIntervalMin) {
    ticks.push(m)
  }

  return (
    <div className="space-y-1">
      <TimelineBar
        segments={expected}
        maxSeconds={maxSeconds}
        variant="expected"
        ariaLabel={`Expected runsheet for ${sessionLabel}`}
      />
      <TimelineBar
        segments={actual}
        maxSeconds={maxSeconds}
        variant="actual"
        scheduledDurationMin={scheduledDurationMin}
        expectedChapterStarts={expectedChapterStarts}
        ariaLabel={`Actual timing for ${sessionLabel} (session ${sessionId})`}
      />

      {/* Time axis */}
      <div className="flex items-center gap-2">
        <span className="w-10 shrink-0" />
        <div className="relative flex-1 h-3">
          {ticks.map(m => (
            <span
              key={m}
              aria-hidden="true"
              style={{ left: `${(m / (maxSeconds / 60)) * 100}%` }}
              className="absolute top-0 text-[9px] text-[#475569] -translate-x-1/2"
            >
              {m}m
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
