'use client'

import { useEffect, useRef, useState } from 'react'
import { Send, RefreshCw } from 'lucide-react'

interface Item {
  title: string
  detail: string
}

interface Suggestions {
  strong: Item[]
  consider: Item[]
}

function parseItems(text: string, prefix: string): Item[] {
  // Split on --- separators, find blocks with the given prefix
  const blocks = text.split(/\n---\n?/)
  return blocks.flatMap(block => {
    const titleMatch = block.match(new RegExp(`${prefix}:\\s*(.+)`))
    const detailMatch = block.match(/DETAIL:\s*([\s\S]+?)(?=\n[A-Z]+:|$)/)
    if (!titleMatch) return []
    return [{ title: titleMatch[1].trim(), detail: detailMatch?.[1]?.trim() ?? '' }]
  }).slice(0, 3)
}

function parseSuggestions(text: string): Suggestions {
  return {
    strong: parseItems(text, 'STRONG'),
    consider: parseItems(text, 'CONSIDER'),
  }
}

async function streamRequest(
  url: string,
  body: object,
  onChunk: (accumulated: string) => void,
  signal?: AbortSignal,
): Promise<string> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  })
  if (!res.ok) throw new Error(await res.text() || `HTTP ${res.status}`)
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

function Skeleton() {
  return (
    <div className="space-y-3">
      {[0, 1, 2].map(i => (
        <div key={i} className="rounded-lg p-4 animate-pulse space-y-2.5 bg-[#0f172a]">
          <div className="h-3.5 rounded w-2/5 bg-[#1e293b]" />
          <div className="h-2.5 rounded w-4/5 bg-[#1e293b]" />
          <div className="h-2.5 rounded w-full bg-[#1e293b]" />
        </div>
      ))}
    </div>
  )
}

interface CardProps {
  item: Item
  index: number
  variant: 'strong' | 'consider'
}

function Card({ item, index, variant }: CardProps) {
  const accent = variant === 'strong' ? '#4ade80' : '#fb923c'
  const bg = variant === 'strong' ? 'border-green-900/40' : 'border-orange-900/40'
  return (
    <div className={`bg-[#0f172a] border ${bg} rounded-lg p-4 space-y-2`}>
      <div className="flex items-start gap-2.5">
        <span className="text-xs font-bold mt-px shrink-0 w-4" style={{ color: accent }}>{index + 1}</span>
        <h3 className="text-sm font-semibold text-[#e2e8f0] leading-snug">{item.title}</h3>
      </div>
      {item.detail && (
        <p className="text-xs text-[#94a3b8] leading-relaxed pl-6">{item.detail}</p>
      )}
    </div>
  )
}

interface Props {
  apiRoute?: string
}

export default function CoachingPanel({ apiRoute = '/api/nick-coach' }: Props) {
  const [suggestions, setSuggestions] = useState<Suggestions | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState<string | null>(null)
  const [loadingAnswer, setLoadingAnswer] = useState(false)
  const [answerError, setAnswerError] = useState<string | null>(null)

  const abortRef = useRef<AbortController | null>(null)

  const fetchSuggestions = async () => {
    abortRef.current?.abort()
    const ac = new AbortController()
    abortRef.current = ac
    setLoading(true)
    setError(null)
    setSuggestions(null)
    try {
      const full = await streamRequest(apiRoute, { type: 'suggestions' }, () => {}, ac.signal)
      setSuggestions(parseSuggestions(full))
    } catch (e) {
      if ((e as Error).name === 'AbortError') return
      const msg = (e as Error).message
      setError(
        msg.includes('API_KEY') || msg.includes('not set')
          ? 'Add ANTHROPIC_API_KEY to .env.local to enable AI coaching.'
          : msg,
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSuggestions()
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
      await streamRequest(apiRoute, { type: 'question', question: q }, partial => setAnswer(partial))
    } catch (e) {
      setAnswerError((e as Error).message)
    } finally {
      setLoadingAnswer(false)
    }
  }

  return (
    <div className="space-y-8">
      {/* Outstanding + Consider side by side on wide, stacked on narrow */}
      {error ? (
        <div className="text-xs text-amber-400 bg-amber-900/10 border border-amber-800/30 rounded-lg p-4">{error}</div>
      ) : loading ? (
        <div className="grid sm:grid-cols-2 gap-6">
          <div>
            <p className="text-[11px] font-semibold text-green-400 uppercase tracking-wider mb-3">Outstanding</p>
            <Skeleton />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-orange-400 uppercase tracking-wider mb-3">To consider</p>
            <Skeleton />
          </div>
        </div>
      ) : suggestions && (
        <div className="grid sm:grid-cols-2 gap-6">
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-[11px] font-semibold text-green-400 uppercase tracking-wider">Outstanding</p>
            </div>
            <div className="space-y-3">
              {suggestions.strong.map((item, i) => (
                <Card key={i} item={item} index={i} variant="strong" />
              ))}
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-[11px] font-semibold text-orange-400 uppercase tracking-wider">To consider</p>
              <button
                onClick={fetchSuggestions}
                className="flex items-center gap-1 text-[10px] text-[#475569] hover:text-[#94a3b8] transition-colors"
              >
                <RefreshCw size={10} />
                Regenerate
              </button>
            </div>
            <div className="space-y-3">
              {suggestions.consider.map((item, i) => (
                <Card key={i} item={item} index={i} variant="consider" />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Q&A */}
      <div className="border-t border-[#334155] pt-6 space-y-3">
        <p className="text-[10px] text-[#475569]">Ask a question about the data — specific patterns, facilitation style, or anything you want to dig into.</p>
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
          <div className="bg-[#0f172a] border border-[#334155] rounded-lg p-4 min-h-[56px]">
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
        {answerError && <p className="text-[10px] text-red-400">{answerError}</p>}
      </div>
    </div>
  )
}
