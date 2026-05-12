'use client'

import { useEffect, useRef, useState } from 'react'
import { Send, RefreshCw, Sparkles } from 'lucide-react'

interface Idea {
  title: string
  why: string
  tryText: string
}

function parseIdeas(text: string): Idea[] {
  // Split on the --- separator
  const blocks = text.split(/\n---\n?/).filter(b => b.trim())
  return blocks.flatMap(block => {
    const title = block.match(/IDEA:\s*(.+)/)?.[1]?.trim()
    const why = block.match(/WHY:\s*(.+)/)?.[1]?.trim()
    const tryMatch = block.match(/TRY:\s*([\s\S]+?)(?=\n[A-Z]+:|$)/)
    const tryText = tryMatch?.[1]?.trim()
    if (!title) return []
    return [{ title, why: why ?? '', tryText: tryText ?? '' }]
  }).slice(0, 3)
}

async function streamRequest(
  body: object,
  onChunk: (accumulated: string) => void,
  signal?: AbortSignal,
): Promise<string> {
  const res = await fetch('/api/nick-coach', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  })
  if (!res.ok) {
    const msg = await res.text()
    throw new Error(msg || `HTTP ${res.status}`)
  }
  const reader = res.body!.getReader()
  const decoder = new TextDecoder()
  let full = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    full += decoder.decode(value, { stream: true })
    onChunk(full)
  }
  return full
}

export default function CoachingPanel() {
  const [ideas, setIdeas] = useState<Idea[]>([])
  const [loadingIdeas, setLoadingIdeas] = useState(true)
  const [ideasError, setIdeasError] = useState<string | null>(null)

  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState<string | null>(null)
  const [loadingAnswer, setLoadingAnswer] = useState(false)
  const [answerError, setAnswerError] = useState<string | null>(null)

  const abortRef = useRef<AbortController | null>(null)

  const fetchIdeas = async () => {
    abortRef.current?.abort()
    const ac = new AbortController()
    abortRef.current = ac
    setLoadingIdeas(true)
    setIdeasError(null)
    setIdeas([])
    try {
      const full = await streamRequest({ type: 'suggestions' }, () => {}, ac.signal)
      setIdeas(parseIdeas(full))
    } catch (e) {
      if ((e as Error).name === 'AbortError') return
      const msg = (e as Error).message
      setIdeasError(
        msg.includes('API_KEY') || msg.includes('not set')
          ? 'Add ANTHROPIC_API_KEY to .env.local to enable AI coaching.'
          : msg,
      )
    } finally {
      setLoadingIdeas(false)
    }
  }

  useEffect(() => {
    fetchIdeas()
    return () => abortRef.current?.abort()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const askQuestion = async () => {
    const q = question.trim()
    if (!q || loadingAnswer) return
    setQuestion('')
    setAnswer('')
    setAnswerError(null)
    setLoadingAnswer(true)
    try {
      await streamRequest(
        { type: 'question', question: q },
        (partial) => setAnswer(partial),
      )
    } catch (e) {
      setAnswerError((e as Error).message)
    } finally {
      setLoadingAnswer(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* 3 ideas */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-1.5 text-xs text-[#94a3b8]">
            <Sparkles size={13} className="text-[#a78bfa]" />
            Based on Nick&apos;s session data
          </div>
          {!loadingIdeas && !ideasError && (
            <button
              onClick={fetchIdeas}
              className="flex items-center gap-1 text-[10px] text-[#475569] hover:text-[#94a3b8] transition-colors"
            >
              <RefreshCw size={10} />
              Regenerate
            </button>
          )}
        </div>

        {loadingIdeas ? (
          <div className="space-y-3">
            {[0, 1, 2].map(i => (
              <div key={i} className="bg-[#0f172a] rounded-lg p-4 animate-pulse space-y-2.5">
                <div className="h-3.5 bg-[#1e293b] rounded w-2/5" />
                <div className="h-2.5 bg-[#1e293b] rounded w-4/5" />
                <div className="h-2.5 bg-[#1e293b] rounded w-full" />
                <div className="h-2.5 bg-[#1e293b] rounded w-3/5" />
              </div>
            ))}
            <p className="text-[10px] text-[#334155] text-center pt-1">Analysing session data…</p>
          </div>
        ) : ideasError ? (
          <div className="text-xs text-amber-400 bg-amber-900/10 border border-amber-800/30 rounded-lg p-4">
            {ideasError}
          </div>
        ) : (
          <div className="space-y-3">
            {ideas.map((idea, i) => (
              <div key={i} className="bg-[#0f172a] border border-[#334155] rounded-lg p-4 space-y-2">
                <div className="flex items-start gap-2.5">
                  <span className="text-xs font-bold text-[#a78bfa] mt-px shrink-0 w-4">{i + 1}</span>
                  <h3 className="text-sm font-semibold text-[#e2e8f0] leading-snug">{idea.title}</h3>
                </div>
                {idea.why && (
                  <div className="pl-6 space-y-0.5">
                    <span className="text-[9px] font-semibold text-[#334155] uppercase tracking-wider">Why</span>
                    <p className="text-xs text-[#475569] leading-relaxed">{idea.why}</p>
                  </div>
                )}
                {idea.tryText && (
                  <div className="pl-6 space-y-0.5">
                    <span className="text-[9px] font-semibold text-[#475569] uppercase tracking-wider">Try</span>
                    <p className="text-xs text-[#94a3b8] leading-relaxed">{idea.tryText}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Q&A */}
      <div className="border-t border-[#334155] pt-5 space-y-3">
        <p className="text-[10px] text-[#475569]">
          Ask a question about Nick&apos;s sessions, pacing patterns, or facilitation style.
        </p>
        <div className="flex gap-2">
          <input
            value={question}
            onChange={e => setQuestion(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); askQuestion() } }}
            placeholder="e.g. Why might learning scores be lower than facilitator scores?"
            disabled={loadingAnswer}
            className="flex-1 bg-[#0f172a] border border-[#334155] rounded-lg px-3 py-2 text-xs text-[#e2e8f0] placeholder:text-[#334155] focus:outline-none focus:border-[#475569] transition-colors disabled:opacity-50"
          />
          <button
            onClick={askQuestion}
            disabled={!question.trim() || loadingAnswer}
            className="px-3 py-2 bg-[#a78bfa]/10 border border-[#a78bfa]/30 rounded-lg text-[#a78bfa] hover:bg-[#a78bfa]/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Send size={13} />
          </button>
        </div>

        {(answer !== null || loadingAnswer) && (
          <div className="bg-[#0f172a] border border-[#334155] rounded-lg p-4 min-h-[60px]">
            {answer ? (
              <p className="text-xs text-[#94a3b8] leading-relaxed whitespace-pre-wrap">
                {answer}
                {loadingAnswer && (
                  <span className="inline-block w-0.5 h-3.5 ml-0.5 bg-[#a78bfa] animate-pulse rounded-sm align-middle" />
                )}
              </p>
            ) : (
              <div className="flex items-center gap-2 text-[10px] text-[#475569]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#a78bfa] animate-pulse" />
                Thinking…
              </div>
            )}
          </div>
        )}

        {answerError && (
          <p className="text-[10px] text-red-400">{answerError}</p>
        )}
      </div>
    </div>
  )
}
