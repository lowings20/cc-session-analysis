'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function RefreshButton({ snapshotLabel }: { snapshotLabel: string }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [info, setInfo] = useState(false)

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={() => {
          setBusy(true)
          router.refresh()
          setTimeout(() => setBusy(false), 400)
        }}
        disabled={busy}
        className="text-sm bg-[#1e293b] hover:bg-[#243044] text-[#e2e8f0] border border-[#334155] rounded px-3 py-1.5 disabled:opacity-50"
      >
        {busy ? 'Refreshing…' : 'Refresh'}
      </button>
      <button
        type="button"
        onClick={() => setInfo((v) => !v)}
        className="text-xs text-[#94a3b8] hover:text-[#e2e8f0] underline-offset-2 hover:underline"
      >
        Snapshot from {snapshotLabel}
      </button>
      {info && (
        <span className="text-xs text-[#475569] max-w-md">
          Data is a baked JSON snapshot. To pull fresh rows from Arrow, ask Claude in this project to re-run the bake.
        </span>
      )}
    </div>
  )
}
