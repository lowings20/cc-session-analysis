'use client'

import { useEffect, useRef, useState } from 'react'

interface Props {
  label: string
  options: string[]
  selected: string[]
  onChange: (next: string[]) => void
}

export default function MultiSelect({ label, options, selected, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const [filter, setFilter] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [open])

  const selectedSet = new Set(selected)
  const visible = filter.trim()
    ? options.filter((o) => o.toLowerCase().includes(filter.trim().toLowerCase()))
    : options

  function toggle(value: string) {
    const next = new Set(selectedSet)
    if (next.has(value)) next.delete(value)
    else next.add(value)
    onChange(Array.from(next))
  }

  function buttonLabel(): string {
    if (selected.length === 0) return `All (${options.length})`
    if (selected.length === 1) return selected[0]
    return `${selected[0]} +${selected.length - 1}`
  }

  return (
    <div className="relative" ref={ref}>
      <div className="flex flex-col gap-1">
        <label className="text-[10px] uppercase tracking-wider text-[#475569]">{label}</label>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="bg-[#0f172a] border border-[#1e293b] text-[#e2e8f0] text-sm rounded px-3 py-2 min-w-[180px] text-left flex items-center justify-between gap-2 hover:border-[#334155] focus:outline-none focus:border-[#475569]"
        >
          <span className="truncate">{buttonLabel()}</span>
          <span className="text-[#475569] text-[10px]">{open ? '▲' : '▼'}</span>
        </button>
      </div>

      {open && (
        <div className="absolute z-20 mt-1 w-[260px] bg-[#0f172a] border border-[#334155] rounded shadow-lg">
          <div className="p-2 border-b border-[#1e293b]">
            <input
              type="text"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filter…"
              className="w-full bg-[#0a121f] border border-[#1e293b] text-[#e2e8f0] text-xs rounded px-2 py-1 focus:outline-none focus:border-[#475569]"
            />
          </div>
          <div className="flex items-center justify-between px-3 py-1.5 text-[10px] text-[#475569] border-b border-[#1e293b]">
            <span>{selected.length} selected</span>
            <button
              type="button"
              onClick={() => onChange([])}
              className="hover:text-[#e2e8f0] disabled:opacity-40"
              disabled={selected.length === 0}
            >
              Clear
            </button>
          </div>
          <div className="max-h-64 overflow-y-auto py-1">
            {visible.map((opt) => {
              const checked = selectedSet.has(opt)
              return (
                <label
                  key={opt}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm text-[#cbd5e1] hover:bg-[#131e2e] cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(opt)}
                    className="accent-[#a78bfa]"
                  />
                  <span className="truncate">{opt}</span>
                </label>
              )
            })}
            {visible.length === 0 && (
              <div className="px-3 py-3 text-xs text-[#475569] text-center">No matches</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
