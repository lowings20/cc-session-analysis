'use client'

import { useState } from 'react'
import type { SessionRow } from './SessionsTable'

interface Props {
  facilitators: { name: string; sessions: SessionRow[] }[]
}

function formatDate(iso: string | null): string {
  if (!iso) return 'No date'
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function FacilitatorsList({ facilitators }: Props) {
  const [open, setOpen] = useState<Set<string>>(new Set())

  function toggle(name: string) {
    const next = new Set(open)
    if (next.has(name)) next.delete(name)
    else next.add(name)
    setOpen(next)
  }

  return (
    <div className="flex flex-col gap-2">
      {facilitators.map((f) => {
        const isOpen = open.has(f.name)
        return (
          <div key={f.name} className="rounded-lg border border-[#1e293b] bg-[#0f172a] overflow-hidden">
            <button
              type="button"
              onClick={() => toggle(f.name)}
              className="w-full flex items-center justify-between gap-4 px-5 py-4 hover:bg-[#131e2e] transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <span className="text-[#475569] text-xs">{isOpen ? '▼' : '▶'}</span>
                <span className="text-base font-medium text-[#e2e8f0]">{f.name}</span>
              </div>
              <span className="text-2xl font-semibold text-[#a78bfa] tabular-nums leading-none">{f.sessions.length}</span>
            </button>

            {isOpen && (
              <div className="border-t border-[#1e293b] divide-y divide-[#1e293b]">
                {f.sessions.map((s) => (
                  <div key={s.session_id} className="px-5 py-3 flex flex-wrap items-baseline gap-x-4 gap-y-1">
                    <div className="text-sm text-[#e2e8f0] min-w-[200px]">{s.case_challenge}</div>
                    <div className="text-sm text-[#cbd5e1] flex-1 min-w-[200px]">{s.session_name}</div>
                    <div className="text-xs text-[#94a3b8] whitespace-nowrap">{formatDate(s.start_date)}</div>
                    <a
                      href={`https://arrow.abilitie.com/programs/${s.program_uuid}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-[#a78bfa] hover:text-[#c4b5fd] hover:underline whitespace-nowrap"
                    >
                      {s.program_name}
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
