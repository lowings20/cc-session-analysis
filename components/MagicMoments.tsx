'use client'

import { useState } from 'react'
import type { MagicMoment } from '@/lib/magic-moments'

export default function MagicMoments({ moments }: { moments: MagicMoment[] }) {
  const [active, setActive] = useState(0)

  if (moments.length === 0) {
    return (
      <div className="text-sm text-[#94a3b8]">
        No transcripts processed for this case challenge yet. Drop Zoom .vtt files into <code className="text-[#cbd5e1] bg-[#1e293b] px-1 rounded">0_Sessions/&lt;case&gt;</code> and re-curate.
      </div>
    )
  }

  const m = moments[Math.min(active, moments.length - 1)]

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-[#7c3aed] bg-gradient-to-br from-[#1a0d3f] to-[#0f172a] p-5">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[10px] uppercase tracking-wider text-[#a78bfa] font-medium">Magic moment</span>
          <span className="text-[#475569]">·</span>
          <span className="text-[11px] text-[#cbd5e1]">{m.facilitator}</span>
          <span className="text-[#475569]">·</span>
          <span className="text-[11px] text-[#94a3b8]">{m.session_label}</span>
          <span className="text-[#475569]">·</span>
          <span className="text-[10px] text-[#475569] tabular-nums">{m.timestamp}</span>
        </div>

        <blockquote className="text-[15px] text-[#e2e8f0] leading-relaxed italic border-l-2 border-[#7c3aed] pl-4 mb-4">
          &ldquo;{m.quote}&rdquo;
        </blockquote>

        <div className="text-xs text-[#cbd5e1]">
          <span className="text-[10px] uppercase tracking-wider text-[#a78bfa] mr-2">Why it's magic</span>
          {m.why_magic}
        </div>

        {m.context && (
          <div className="mt-3 text-[10px] text-[#475569]">{m.context}</div>
        )}
      </div>

      {moments.length > 1 && (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActive((i) => (i - 1 + moments.length) % moments.length)}
            className="text-xs text-[#94a3b8] hover:text-[#e2e8f0] px-2 py-1"
            aria-label="Previous moment"
          >
            ←
          </button>
          <div className="flex-1 flex items-center justify-center gap-1.5">
            {moments.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setActive(i)}
                className={`w-2 h-2 rounded-full transition-colors ${i === active ? 'bg-[#a78bfa]' : 'bg-[#1e293b] hover:bg-[#334155]'}`}
                aria-label={`Moment ${i + 1}`}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={() => setActive((i) => (i + 1) % moments.length)}
            className="text-xs text-[#94a3b8] hover:text-[#e2e8f0] px-2 py-1"
            aria-label="Next moment"
          >
            →
          </button>
          <span className="text-[10px] text-[#475569] ml-2 tabular-nums">{active + 1} / {moments.length}</span>
        </div>
      )}
    </div>
  )
}
