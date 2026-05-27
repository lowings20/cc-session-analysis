'use client'

import Link from 'next/link'

export default function CaseChallengeError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="max-w-md text-center">
        <div className="text-[#f59e0b] text-3xl mb-3">⚠</div>
        <h1 className="text-lg font-semibold text-[#e2e8f0]">Something broke rendering this case challenge</h1>
        <p className="text-sm text-[#94a3b8] mt-2">
          One of the session sections hit unexpected data. The rest of the app is fine.
        </p>
        {error?.message && (
          <pre className="text-[10px] text-[#475569] mt-3 bg-[#0f172a] border border-[#1e293b] rounded p-2 overflow-x-auto text-left">
            {error.message}
          </pre>
        )}
        <div className="flex gap-3 justify-center mt-5">
          <button
            type="button"
            onClick={reset}
            className="text-sm bg-[#1e293b] hover:bg-[#243044] text-[#e2e8f0] border border-[#334155] rounded px-4 py-2"
          >
            Try again
          </button>
          <Link
            href="/case-challenges"
            className="text-sm text-[#a78bfa] hover:underline self-center"
          >
            All case challenges
          </Link>
        </div>
      </div>
    </div>
  )
}
