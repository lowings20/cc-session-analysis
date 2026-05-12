'use client'

import { useState } from 'react'
import type { ChapterSlot } from '@/lib/insights'

const EPP = 'Enabling Peak Performance'

function sortedCases(slots: ChapterSlot[]): string[] {
  const cases = [...new Set(slots.map(s => s.caseTitle))]
  const epp = cases.filter(c => c === EPP)
  const rest = cases.filter(c => c !== EPP).sort()
  return [...epp, ...rest]
}

interface RowProps {
  slot: ChapterSlot
  globalMax: number
}

function Row({ slot, globalMax }: RowProps) {
  const [hovered, setHovered] = useState(false)
  const BAR_W = 280

  const toX = (v: number) => (v / globalMax) * BAR_W

  return (
    <tr
      className="border-b border-[#334155]/40 hover:bg-[#334155]/20 transition-colors"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <td className="px-4 py-2.5 text-xs text-[#94a3b8] whitespace-nowrap w-32">{slot.chapterLabel}</td>
      <td className="px-2 py-2.5">
        <div className="relative" style={{ width: BAR_W, height: 20 }}>
          {/* Min-max range bar */}
          <div
            className="absolute top-1/2 -translate-y-1/2 rounded-full"
            style={{
              left: toX(slot.min),
              width: Math.max(toX(slot.max) - toX(slot.min), 2),
              height: 6,
              backgroundColor: '#34a853',
              opacity: 0.35,
            }}
          />
          {/* IQR bar */}
          <div
            className="absolute top-1/2 -translate-y-1/2 rounded"
            style={{
              left: toX(slot.p25),
              width: Math.max(toX(slot.p75) - toX(slot.p25), 2),
              height: 10,
              backgroundColor: '#34a853',
              opacity: 0.7,
            }}
          />
          {/* Median line */}
          <div
            className="absolute top-1/2 -translate-y-1/2"
            style={{
              left: toX(slot.median) - 1,
              width: 2,
              height: 16,
              backgroundColor: '#34a853',
            }}
          />
          {/* Planned line */}
          <div
            className="absolute top-1/2 -translate-y-1/2"
            style={{
              left: toX(slot.plannedMin) - 1,
              width: 2,
              height: 18,
              backgroundColor: '#fbbc04',
            }}
          />

          {hovered && (
            <div
              className="absolute bottom-full mb-1.5 bg-[#1e293b] border border-[#475569] rounded px-2.5 py-1.5 text-[10px] text-[#e2e8f0] z-50 whitespace-nowrap shadow-lg pointer-events-none"
              style={{ left: toX(slot.median) - 60 }}
            >
              <div>min {Math.round(slot.min)}m · med {Math.round(slot.median)}m · max {Math.round(slot.max)}m</div>
              <div className="text-[#94a3b8]">planned {Math.round(slot.plannedMin)}m · n={slot.n}</div>
            </div>
          )}
        </div>
      </td>
      <td className="px-3 py-2.5 text-xs text-right text-[#94a3b8] tabular-nums">
        {Math.round(slot.min)}m
      </td>
      <td className="px-3 py-2.5 text-xs text-right text-[#e2e8f0] tabular-nums font-medium">
        {Math.round(slot.median)}m
      </td>
      <td className="px-3 py-2.5 text-xs text-right text-[#94a3b8] tabular-nums">
        {Math.round(slot.max)}m
      </td>
      <td className="px-4 py-2.5 text-xs text-right tabular-nums">
        <span className="text-[#fbbc04]">{Math.round(slot.plannedMin)}m</span>
      </td>
      <td className="px-4 py-2.5 text-xs text-right text-[#475569] tabular-nums">{slot.n}</td>
    </tr>
  )
}

export default function ChapterVariance({ slots }: { slots: ChapterSlot[] }) {
  const cases = sortedCases(slots)
  const globalMax = Math.max(...slots.map(s => s.max)) * 1.1

  return (
    <div className="space-y-6">
      {/* Legend */}
      <div className="flex items-center gap-4 text-[10px] text-[#94a3b8]">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-10 h-1.5 rounded-full bg-[#34a853] opacity-35" />
          min–max range
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-6 h-2.5 rounded bg-[#34a853] opacity-70" />
          IQR (25–75%)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-0.5 h-4 bg-[#34a853]" />
          median
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-0.5 h-4 bg-[#fbbc04]" />
          planned
        </span>
      </div>

      {cases.map(caseTitle => {
        const caseSlots = slots.filter(s => s.caseTitle === caseTitle)
        const isEPP = caseTitle === EPP
        return (
          <div
            key={caseTitle}
            className="rounded-lg bg-[#1e293b] overflow-hidden"
            style={isEPP ? { borderLeft: '3px solid #a78bfa' } : { borderLeft: '3px solid transparent' }}
          >
            <div className="px-4 py-2.5 border-b border-[#334155]">
              <span className="text-xs font-semibold text-[#e2e8f0]">{caseTitle}</span>
              <span className="ml-2 text-[10px] text-[#475569]">{caseSlots[0]?.n ?? 0} sessions</span>
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#334155]">
                  <th className="px-4 py-2 text-left text-[10px] text-[#475569] font-medium">Chapter</th>
                  <th className="px-2 py-2 text-left text-[10px] text-[#475569] font-medium">Distribution</th>
                  <th className="px-3 py-2 text-right text-[10px] text-[#475569] font-medium">Min</th>
                  <th className="px-3 py-2 text-right text-[10px] text-[#475569] font-medium">Median</th>
                  <th className="px-3 py-2 text-right text-[10px] text-[#475569] font-medium">Max</th>
                  <th className="px-4 py-2 text-right text-[10px] text-[#475569] font-medium">Planned</th>
                  <th className="px-4 py-2 text-right text-[10px] text-[#475569] font-medium">n</th>
                </tr>
              </thead>
              <tbody>
                {caseSlots.map((slot, i) => (
                  <Row key={i} slot={slot} globalMax={globalMax} />
                ))}
              </tbody>
            </table>
          </div>
        )
      })}
    </div>
  )
}
