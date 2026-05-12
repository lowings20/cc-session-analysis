'use client'

import { useEffect, useRef, useState } from 'react'
import { Send, RefreshCw } from 'lucide-react'

interface Item {
  title: string
  detail: string
}

function parseItems(text: string): Item[] {
  const blocks = text.split(/\n---\n?/)
  return blocks.flatMap(block => {
    const titleMatch = block.match(/LEAN:\s*(.+)/)
    const detailMatch = block.match(/DETAIL:\s*([\s\S]+?)(?=\n[A-Z]+:|$)/)
    if (!titleMatch) return []
    return [{ title: titleMatch[1].trim(), detail: detailMatch?.[1]?.trim() ?? '' }]
  }).slice(0, 5)
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

function LeanCard({ item, index }: { item: Item; index: number }) {
  return (
    <div className="bg-[#0f172a] border border-green-900/30 rounded-lg p-4 space-y-2">
      <div className="flex items-start gap-2.5">
        <span className="text-xs font-bold mt-px shrink-0 w-4 text-green-400">{index + 1}</span>
        <h3 className="text-sm font-semibold text-[#e2e8f0] leading-snug">{item.title}</h3>
      </div>
      {item.detail && (
        <p className="text-xs text-[#94a3b8] leading-relaxed pl-6">{item.detail}</p>
      )}
    </div>
  )
}

const PRESETS = [
  { label: 'Give me 3 things to consider', question: 'Give me 3 honest things I should consider working on to keep developing as a facilitator.' },
  { label: 'Who should I learn from?', question: 'Tell me one facilitator I might learn something from based on the programme data. Who is it and what specific question should I ask them?' },
]

interface Props {
  apiRoute?: string
}

export default function CoachingPanel({ apiRoute = '/api/nick-coach' }: Props) {
  const [items, setItems] = useState<Item[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [question, setQuestion] = useState('')
  const [showInput, setShowInput] = useState(false)
  const [answer, setAnswer] = useState<string | null>(null)
  const [loadingAnswer, setLoadingAnswer] = useState(false)
  const [answerError, setAnswerError] = useState<string | null>(null)
  const [activePreset, setActivePreset] = useState<string | null>(null)

  const abortRef = useRef<AbortController | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const fetchSuggestions = async () => {
    abortRef.current?.abort()
    const ac = new AbortController()
    abortRef.current = ac
    setLoading(true)
    setError(null)
    setItems(null)
    try {
      const full = await streamRequest(apiRoute, { type: 'suggestions' }, () => {}, ac.signal)
      setItems(parseItems(full))
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

  const sendQuestion = async (q: string) => {
    const trimmed = q.trim()
    if (!trimmed || loadingAnswer) return
    setQuestion('')
    setAnswer('')
    setAnswerError(null)
    setLoadingAnswer(true)
    try {
      await streamRequest(apiRoute, { type: 'question', question: trimmed }, partial => setAnswer(partial))
    } catch (e) {
      setAnswerError((e as Error).message)
    } finally {
      setLoadingAnswer(false)
    }
  }

  const handlePreset = (preset: typeof PRESETS[number]) => {
    setActivePreset(preset.label)
    setShowInput(false)
    setAnswer(null)
    setAnswerError(null)
    sendQuestion(preset.question)
  }

  const handleCustomSubmit = () => {
    setActivePreset(null)
    sendQuestion(question)
  }

  return (
    <div className="space-y-8">

      {/* Things to lean into */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <p className="text-[11px] font-semibold text-green-400 uppercase tracking-wider">Things to lean into</p>
          {!loading && items && (
            <button
              onClick={fetchSuggestions}
              className="flex items-center gap-1 text-[10px] text-[#475569] hover:text-[#94a3b8] transition-colors"
            >
              <RefreshCw size={10} />
              Regenerate
            </button>
          )}
        </div>

        {error ? (
          <div className="text-xs text-amber-400 bg-amber-900/10 border border-amber-800/30 rounded-lg p-4">{error}</div>
        ) : loading ? (
          <Skeleton />
        ) : items && (
          <div className="space-y-3">
            {items.map((item, i) => (
              <LeanCard key={i} item={item} index={i} />
            ))}
          </div>
        )}
      </div>

      {/* Feedback Q&A */}
      <div className="border-t border-[#334155] pt-6 space-y-4">
        <p className="text-sm font-medium text-[#e2e8f0]">What are you working on and would like some feedback on?</p>

        <div className="flex flex-wrap gap-2">
          {PRESETS.map(preset => (
            <button
              key={preset.label}
              onClick={() => handlePreset(preset)}
              disabled={loadingAnswer}
              className={`px-3 py-1.5 rounded-lg text-xs border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                activePreset === preset.label
                  ? 'bg-[#a78bfa]/20 border-[#a78bfa]/50 text-[#a78bfa]'
                  : 'bg-transparent border-[#334155] text-[#94a3b8] hover:border-[#475569] hover:text-[#e2e8f0]'
              }`}
            >
              {preset.label}
            </button>
          ))}
          <button
            onClick={() => {
              setShowInput(true)
              setActivePreset(null)
              setTimeout(() => inputRef.current?.focus(), 50)
            }}
            disabled={loadingAnswer}
            className={`px-3 py-1.5 rounded-lg text-xs border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
              showInput && !activePreset
                ? 'bg-[#a78bfa]/20 border-[#a78bfa]/50 text-[#a78bfa]'
                : 'bg-transparent border-[#334155] text-[#94a3b8] hover:border-[#475569] hover:text-[#e2e8f0]'
            }`}
          >
            Enter yourself…
          </button>
        </div>

        {showInput && (
          <div className="flex gap-2">
            <input
              ref={inputRef}
              value={question}
              onChange={e => setQuestion(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleCustomSubmit() } }}
              placeholder="e.g. How can I get participants talking more?"
              disabled={loadingAnswer}
              className="flex-1 bg-[#0f172a] border border-[#334155] rounded-lg px-3 py-2 text-xs text-[#e2e8f0] placeholder:text-[#334155] focus:outline-none focus:border-[#475569] transition-colors disabled:opacity-50"
            />
            <button
              onClick={handleCustomSubmit}
              disabled={!question.trim() || loadingAnswer}
              className="px-3 py-2 bg-[#a78bfa]/10 border border-[#a78bfa]/30 rounded-lg text-[#a78bfa] hover:bg-[#a78bfa]/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Send size={13} />
            </button>
          </div>
        )}

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
