'use client'

import { useRef, useState } from 'react'
import { MessageSquare, X, Send, ChevronDown } from 'lucide-react'

type Message = { role: 'user' | 'assistant'; content: string }

async function streamQuestion(question: string, onChunk: (text: string) => void, signal: AbortSignal) {
  const res = await fetch('/api/dashboard-coach', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'question', question, scope: { type: 'all' } }),
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

export default function DashboardChatbot() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const send = async () => {
    const q = input.trim()
    if (!q || loading) return
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: q }])
    setLoading(true)

    // Add placeholder assistant message
    setMessages(prev => [...prev, { role: 'assistant', content: '' }])

    abortRef.current?.abort()
    const ac = new AbortController()
    abortRef.current = ac

    try {
      await streamQuestion(q, text => {
        setMessages(prev => {
          const next = [...prev]
          next[next.length - 1] = { role: 'assistant', content: text }
          return next
        })
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
      }, ac.signal)
    } catch (e) {
      if ((e as Error).name === 'AbortError') return
      setMessages(prev => {
        const next = [...prev]
        next[next.length - 1] = { role: 'assistant', content: `Error: ${(e as Error).message}` }
        return next
      })
    } finally {
      setLoading(false)
    }
  }

  const handleOpen = () => {
    setOpen(true)
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">

      {/* Chat panel */}
      {open && (
        <div className="w-[360px] bg-[#1e293b] border border-[#334155] rounded-xl shadow-2xl flex flex-col overflow-hidden" style={{ height: '480px' }}>

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#334155] shrink-0">
            <div>
              <p className="text-xs font-semibold text-[#e2e8f0]">Session data Q&A</p>
              <p className="text-[10px] text-[#475569]">Ask anything about the programme data</p>
            </div>
            <div className="flex items-center gap-1">
              {messages.length > 0 && (
                <button
                  onClick={() => setMessages([])}
                  className="px-2 py-1 text-[10px] text-[#475569] hover:text-[#94a3b8] transition-colors rounded"
                >
                  Clear
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 text-[#475569] hover:text-[#94a3b8] transition-colors rounded"
              >
                <ChevronDown size={14} />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4 min-h-0">
            {messages.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center gap-3 text-center">
                <MessageSquare size={24} className="text-[#334155]" />
                <p className="text-xs text-[#475569] max-w-[220px] leading-relaxed">
                  Ask about pacing, scores, facilitators, participant feedback — anything in the data.
                </p>
                <div className="space-y-1.5 w-full mt-2">
                  {[
                    'Which case runs longest on average?',
                    "How does Nick's reflection rate compare?",
                    'What do participants ask for most in Q7?',
                  ].map(q => (
                    <button
                      key={q}
                      onClick={() => { setInput(q); inputRef.current?.focus() }}
                      className="w-full text-left px-3 py-2 rounded-lg text-[11px] text-[#94a3b8] border border-[#334155] hover:border-[#475569] hover:text-[#e2e8f0] transition-colors"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={m.role === 'user' ? 'flex justify-end' : ''}>
                {m.role === 'user' ? (
                  <div className="bg-[#334155] rounded-lg px-3 py-2 max-w-[80%]">
                    <p className="text-xs text-[#e2e8f0] leading-relaxed">{m.content}</p>
                  </div>
                ) : (
                  <div>
                    {m.content ? (
                      <p className="text-xs text-[#94a3b8] leading-relaxed whitespace-pre-wrap">
                        {m.content}
                        {loading && i === messages.length - 1 && (
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
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="px-4 py-3 border-t border-[#334155] shrink-0">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
                placeholder="Ask a question…"
                disabled={loading}
                className="flex-1 bg-[#0f172a] border border-[#334155] rounded-lg px-3 py-2 text-xs text-[#e2e8f0] placeholder:text-[#334155] focus:outline-none focus:border-[#475569] transition-colors disabled:opacity-50"
              />
              <button
                onClick={send}
                disabled={!input.trim() || loading}
                className="px-3 py-2 bg-[#a78bfa]/10 border border-[#a78bfa]/30 rounded-lg text-[#a78bfa] hover:bg-[#a78bfa]/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <Send size={13} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toggle button */}
      <button
        onClick={open ? () => setOpen(false) : handleOpen}
        className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-colors ${
          open
            ? 'bg-[#334155] text-[#94a3b8] hover:bg-[#475569]'
            : 'bg-[#a78bfa] text-white hover:bg-[#9333ea]'
        }`}
      >
        {open ? <X size={18} /> : <MessageSquare size={18} />}
      </button>
    </div>
  )
}
