'use client'

import { useRef, useState } from 'react'
import { Send, RefreshCw, Sparkles } from 'lucide-react'

type Scope =
  | { type: 'all' }
  | { type: 'case'; value: string }
  | { type: 'faculty'; value: string }

interface Item { title: string; detail: string }
interface Suggestions { aware: Item[]; improve: Item[] }

interface CaseOption { title: string; count: number }
interface FacultyOption { name: string; count: number }

interface Props {
  cases: CaseOption[]
  faculty: FacultyOption[]
  totalSessions: number
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

async function streamRequest(body: object, onChunk: (t: string) => void, signal?: AbortSignal): Promise<string> {
  const res = await fetch('/api/dashboard-coach', {
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

const CASE_SHORT: Record<string, string> = {
  'Creating Strategic Alignment': 'CSA',
  'Enabling Peak Performance': 'EPP',
  'Influencing Without Authority': 'IWA',
  'Kickoff: Get the Message?': 'Kickoff: GTM',
  'Kickoff: Shelf Awareness': 'Kickoff: SA',
  'Leading in Times of Change': 'LiToC',
  'Leading Through Vision': 'LTV',
  'Managing Profitability': 'MP',
  'Navigating Critical Conversations': 'NCC',
  'Shifting Mindsets and Behaviors': 'Shifting Mindsets',
}

function short(title: string) { return CASE_SHORT[title] ?? title }

function ScopeChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-2.5 py-1 rounded text-xs border transition-colors cursor-pointer whitespace-nowrap ${
        active
          ? 'bg-[#a78bfa]/20 border-[#a78bfa]/50 text-[#a78bfa]'
          : 'bg-transparent border-[#334155] text-[#94a3b8] hover:border-[#475569] hover:text-[#e2e8f0]'
      }`}
    >
      {label}
    </button>
  )
}

function Skeleton() {
  return (
    <div className="space-y-3">
      {[0, 1, 2].map(i => (
        <div key={i} className="rounded-lg p-4 animate-pulse space-y-2.5 bg-[#1e293b]">
          <div className="h-3.5 rounded w-2/5 bg-[#334155]" />
          <div className="h-2.5 rounded w-4/5 bg-[#334155]" />
          <div className="h-2.5 rounded w-3/4 bg-[#334155]" />
        </div>
      ))}
    </div>
  )
}

function Card({ item, index, accent, border }: { item: Item; index: number; accent: string; border: string }) {
  return (
    <div className={`bg-[#1e293b] border ${border} rounded-lg p-4 space-y-2`}>
      <div className="flex items-start gap-2.5">
        <span className="text-xs font-bold mt-px shrink-0 w-4" style={{ color: accent }}>{index + 1}</span>
        <h3 className="text-sm font-semibold text-[#e2e8f0] leading-snug">{item.title}</h3>
      </div>
      {item.detail && <p className="text-xs text-[#94a3b8] leading-relaxed pl-6">{item.detail}</p>}
    </div>
  )
}

export default function InsightsTab({ cases, faculty, totalSessions }: Props) {
  const [scope, setScope] = useState<Scope>({ type: 'all' })
  const [suggestions, setSuggestions] = useState<Suggestions | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState<string | null>(null)
  const [loadingAnswer, setLoadingAnswer] = useState(false)
  const [answerError, setAnswerError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const scopeLabel =
    scope.type === 'all' ? `all ${totalSessions} sessions` :
    scope.type === 'case' ? `${short(scope.value)} sessions` :
    scope.value

  const generate = async () => {
    abortRef.current?.abort()
    const ac = new AbortController()
    abortRef.current = ac
    setLoading(true)
    setError(null)
    setSuggestions(null)
    setAnswer(null)
    try {
      const full = await streamRequest({ type: 'suggestions', scope }, () => {}, ac.signal)
      setSuggestions({
        aware: parseItems(full, 'AWARE'),
        improve: parseItems(full, 'IMPROVE'),
      })
    } catch (e) {
      if ((e as Error).name === 'AbortError') return
      const msg = (e as Error).message
      setError(msg.includes('API_KEY') || msg.includes('not set') ? 'Add ANTHROPIC_API_KEY to .env.local.' : msg)
    } finally {
      setLoading(false)
    }
  }

  const askQuestion = async () => {
    const q = question.trim()
    if (!q || loadingAnswer) return
    setQuestion('')
    setAnswer('')
    setAnswerError(null)
    setLoadingAnswer(true)
    try {
      await streamRequest({ type: 'question', question: q, scope }, partial => setAnswer(partial))
    } catch (e) {
      setAnswerError((e as Error).message)
    } finally {
      setLoadingAnswer(false)
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">

      {/* Scope selector */}
      <div className="bg-[#1e293b] border border-[#334155] rounded-lg p-5 space-y-4">
        <p className="text-xs text-[#94a3b8] font-medium">Generate insights for:</p>

        <div className="space-y-3">
          <div>
            <ScopeChip
              label={`All sessions · ${totalSessions}`}
              active={scope.type === 'all'}
              onClick={() => setScope({ type: 'all' })}
            />
          </div>

          <div className="flex items-start gap-3">
            <span className="text-[10px] text-[#475569] pt-1.5 w-14 shrink-0">By case</span>
            <div className="flex flex-wrap gap-1.5">
              {cases.map(c => (
                <ScopeChip
                  key={c.title}
                  label={`${short(c.title)} · ${c.count}`}
                  active={scope.type === 'case' && scope.value === c.title}
                  onClick={() => setScope({ type: 'case', value: c.title })}
                />
              ))}
            </div>
          </div>

          <div className="flex items-start gap-3">
            <span className="text-[10px] text-[#475569] pt-1.5 w-14 shrink-0">By faculty</span>
            <div className="flex flex-wrap gap-1.5">
              {faculty.map(f => (
                <ScopeChip
                  key={f.name}
                  label={`${f.name} · ${f.count}`}
                  active={scope.type === 'faculty' && scope.value === f.name}
                  onClick={() => setScope({ type: 'faculty', value: f.name })}
                />
              ))}
            </div>
          </div>
        </div>

        <button
          onClick={generate}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#a78bfa]/15 border border-[#a78bfa]/40 rounded-lg text-xs font-medium text-[#a78bfa] hover:bg-[#a78bfa]/25 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Sparkles size={12} />
          {loading ? 'Generating…' : `Generate — ${scopeLabel}`}
        </button>
      </div>

      {/* Results */}
      {(loading || suggestions || error) && (
        <div className="space-y-6">
          {error ? (
            <div className="text-xs text-amber-400 bg-amber-900/10 border border-amber-800/30 rounded-lg p-4">{error}</div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-6">
              <div>
                <p className="text-[11px] font-semibold text-[#60a5fa] uppercase tracking-wider mb-3">Be aware of</p>
                {loading ? <Skeleton /> : (
                  <div className="space-y-3">
                    {suggestions!.aware.map((item, i) => (
                      <Card key={i} item={item} index={i} accent="#60a5fa" border="border-blue-900/40" />
                    ))}
                  </div>
                )}
              </div>
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[11px] font-semibold text-[#a78bfa] uppercase tracking-wider">Product improvements</p>
                  {!loading && suggestions && (
                    <button onClick={generate} className="flex items-center gap-1 text-[10px] text-[#475569] hover:text-[#94a3b8] transition-colors">
                      <RefreshCw size={10} /> Regenerate
                    </button>
                  )}
                </div>
                {loading ? <Skeleton /> : (
                  <div className="space-y-3">
                    {suggestions!.improve.map((item, i) => (
                      <Card key={i} item={item} index={i} accent="#a78bfa" border="border-purple-900/40" />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {!loading && !error && suggestions && (
            <div className="border-t border-[#334155] pt-5 space-y-3">
              <p className="text-[10px] text-[#475569]">
                Ask a follow-up question about {scopeLabel}.
              </p>
              <div className="flex gap-2">
                <input
                  value={question}
                  onChange={e => setQuestion(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); askQuestion() } }}
                  placeholder={scope.type === 'case' ? `e.g. Which chapter in ${short((scope as { type: 'case'; value: string }).value)} is causing the overrun?` : 'e.g. What pattern stands out most?'}
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
                <div className="bg-[#0f172a] border border-[#334155] rounded-lg p-4 min-h-[52px]">
                  {answer ? (
                    <p className="text-xs text-[#94a3b8] leading-relaxed whitespace-pre-wrap">
                      {answer}
                      {loadingAnswer && <span className="inline-block w-0.5 h-3.5 ml-0.5 bg-[#a78bfa] animate-pulse rounded-sm align-middle" />}
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
          )}
        </div>
      )}
    </div>
  )
}
