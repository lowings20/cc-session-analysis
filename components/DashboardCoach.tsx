'use client'

import { useEffect, useRef, useState } from 'react'
import { Send, RefreshCw } from 'lucide-react'

interface Item {
  title: string
  detail: string
}

interface Suggestions {
  aware: Item[]
  improve: Item[]
}

function parseItems(text: string, prefix: string): Item[] {
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
    aware: parseItems(text, 'AWARE'),
    improve: parseItems(text, 'IMPROVE'),
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
          <div className="h-2.5 rounded w-3/4 bg-[#1e293b]" />
        </div>
      ))}
    </div>
  )
}

function Card({ item, index, accent, borderClass }: {
  item: Item; index: number; accent: string; borderClass: string
}) {
  return (
    <div className={`bg-[#0f172a] border ${borderClass} rounded-lg p-4 space-y-2`}>
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

export default function DashboardCoach() {
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
      const full = await streamRequest('/api/dashboard-coach', { type: 'suggestions' }, () => {}, ac.signal)
      setSuggestions(parseSuggestions(full))
    } catch (e) {
      if ((e as Error).name === 'AbortError') return
      const msg = (e as Error).message
      setError(
        msg.includes('API_KEY') || msg.includes('not set')
          ? 'Add ANTHROPIC_API_KEY to .env.local to enable AI analysis.'
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
      await streamRequest('/api/dashboard-coach', { type: 'question', question: q }, partial => setAnswer(partial))
    } catch (e) {
      setAnswerError((e as Error).message)
    } finally {
      setLoadingAnswer(false)
    }
  }

  return (
    <div className="border-b border-[#334155] bg-[#0f172a]">
      <div className="max-w-5xl mx-auto px-6 py-6 space-y-6">

        {error ? (
          <div className="text-xs text-amber-400 bg-amber-900/10 border border-amber-800/30 rounded-lg p-4">{error}</div>
        ) : loading ? (
          <div className="grid sm:grid-cols-2 gap-6">
            <div>
              <p className="text-[11px] font-semibold text-[#60a5fa] uppercase tracking-wider mb-3">Be aware of</p>
              <Skeleton />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-[#a78bfa] uppercase tracking-wider mb-3">Product improvements</p>
              <Skeleton />
            </div>
          </div>
        ) : suggestions && (
          <div className="grid sm:grid-cols-2 gap-6">
            <div>
              <p className="text-[11px] font-semibold text-[#60a5fa] uppercase tracking-wider mb-3">Be aware of</p>
              <div className="space-y-3">
                {suggestions.aware.map((item, i) => (
                  <Card key={i} item={item} index={i} accent="#60a5fa" borderClass="border-blue-900/40" />
                ))}
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-[11px] font-semibold text-[#a78bfa] uppercase tracking-wider">Product improvements</p>
                <button
                  onClick={fetchSuggestions}
                  className="flex items-center gap-1 text-[10px] text-[#475569] hover:text-[#94a3b8] transition-colors"
                >
                  <RefreshCw size={10} />
                  Regenerate
                </button>
              </div>
              <div className="space-y-3">
                {suggestions.improve.map((item, i) => (
                  <Card key={i} item={item} index={i} accent="#a78bfa" borderClass="border-purple-900/40" />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Q&A */}
        <div className="border-t border-[#1e293b] pt-4 space-y-3">
          <div className="flex gap-2">
            <input
              value={question}
              onChange={e => setQuestion(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); askQuestion() } }}
              placeholder="Ask about any pattern in the data…"
              disabled={loadingAnswer}
              className="flex-1 bg-[#1e293b] border border-[#334155] rounded-lg px-3 py-2 text-xs text-[#e2e8f0] placeholder:text-[#334155] focus:outline-none focus:border-[#475569] transition-colors disabled:opacity-50"
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
            <div className="bg-[#1e293b] border border-[#334155] rounded-lg p-4 min-h-[52px]">
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
    </div>
  )
}
