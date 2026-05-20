'use client'

import { useState } from 'react'
import type { RunsheetSegment } from '@/lib/case-challenges'
import { segmentKind } from '@/lib/case-challenges'

const KIND_COLOR: Record<string, string> = {
  intro: 'bg-[#475569]',
  chapter: 'bg-[#7c3aed]',
  breakout: 'bg-[#a78bfa]',
  debrief: 'bg-[#0ea5e9]',
  break: 'bg-[#334155]',
  close: 'bg-[#475569]',
  buffer: 'bg-[#1e293b]',
  other: 'bg-[#64748b]',
}

function formatMin(m: number | null): string {
  if (m === null) return ''
  const totalSec = Math.round(m * 60)
  const mm = Math.floor(totalSec / 60)
  const ss = totalSec % 60
  return ss === 0 ? `${mm}m` : `${mm}m ${ss}s`
}

export default function RunsheetTimeline({ segments }: { segments: RunsheetSegment[] }) {
  const [open, setOpen] = useState(false)

  const total = segments.reduce((sum, s) => sum + s.length_min, 0)
  if (total === 0) return <div className="text-sm text-[#475569]">No runsheet segments parsed.</div>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs text-[#94a3b8]">
          Total planned: <span className="text-[#e2e8f0] font-medium">{formatMin(total)}</span>
          <span className="text-[#475569] mx-2">·</span>
          {segments.length} segments
        </div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="text-xs text-[#a78bfa] hover:text-[#c4b5fd]"
        >
          {open ? 'Hide details ▲' : 'Show details ▼'}
        </button>
      </div>

      <div className="flex h-10 rounded overflow-hidden border border-[#1e293b]">
        {segments.map((s, i) => {
          const kind = segmentKind(s.section)
          const pct = (s.length_min / total) * 100
          const label = s.section.length > 12 ? '' : s.section
          return (
            <div
              key={i}
              title={`${s.section} · ${formatMin(s.length_min)}${s.focus ? '\n' + s.focus : ''}`}
              className={`${KIND_COLOR[kind]} h-full flex items-center justify-center text-[10px] text-white/90 font-medium border-r border-[#0f172a] last:border-r-0 overflow-hidden`}
              style={{ width: `${pct}%`, minWidth: '4px' }}
            >
              {pct > 4 ? label : ''}
            </div>
          )
        })}
      </div>

      {open && (
        <div className="rounded-lg border border-[#1e293b] divide-y divide-[#1e293b] overflow-hidden">
          {segments.map((s, i) => {
            const kind = segmentKind(s.section)
            return (
              <div key={i} className="grid grid-cols-[140px_80px_1fr] gap-3 px-4 py-2.5 text-sm">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${KIND_COLOR[kind]}`} />
                  <span className="text-[#e2e8f0] font-medium uppercase text-xs">{s.section || '—'}</span>
                </div>
                <div className="text-[#94a3b8] tabular-nums">{formatMin(s.length_min)}</div>
                <div className="text-[#cbd5e1] whitespace-pre-line text-xs leading-relaxed">{s.focus || ''}</div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
