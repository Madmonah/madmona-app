'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import {
  Send, Bot, User, Loader2, CheckCircle2, XCircle, Clock,
  ChevronLeft, Sparkles, AlertTriangle, Activity,
} from 'lucide-react'

interface Chat {
  id: string
  role: 'user' | 'assistant'
  content: string
  status: string
  agent_runs_created: string[] | null
  workflow_id: string | null
  created_at: string
  parsed_intent: {
    agents?: Array<{ agent_name: string; step: number; rationale: string }>
    estimated_minutes?: number
    warnings?: string[]
  } | null
}

interface RunStatus {
  id: string
  agent_name: string
  status: string
  output_summary: unknown
  error_message: string | null
}

const SUGGESTED_PROMPTS = [
  'ابعت welcome message لكل الـ leads الجدد',
  'صمم banner موحد للـ social media بـ brand colors',
  'اعمل research عن المنافسين في rental marketplace',
  'اكتب 10 posts للـ Instagram عن مضمونة',
  'حلل أداء الـ social media الأسبوع ده',
  'فعّل الـ suppliers اللي ما عملوش listings',
]

export default function AIAssistantPage() {
  const [messages, setMessages] = useState<Chat[]>([])
  const [runStatuses, setRunStatuses] = useState<Record<string, RunStatus>>({})
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [historyLoading, setHistoryLoading] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const loadHistory = async () => {
    try {
      const res = await fetch('/api/admin/ai-assistant?limit=30')
      const data = await res.json()
      setMessages(data.chats ?? [])
      setRunStatuses(data.run_statuses ?? {})
    } catch (e) {
      console.error('history load failed', e)
    } finally {
      setHistoryLoading(false)
    }
  }

  useEffect(() => {
    loadHistory()
  }, [])

  // Poll runs every 5s if any are pending/started
  useEffect(() => {
    const hasPending = Object.values(runStatuses).some(
      (r) => r.status === 'pending' || r.status === 'started'
    )
    if (!hasPending && messages.length > 0) return

    const interval = setInterval(loadHistory, 5000)
    return () => clearInterval(interval)
  }, [runStatuses, messages.length])

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = async (text?: string) => {
    const message = (text ?? input).trim()
    if (!message || loading) return

    setInput('')
    setLoading(true)

    // Optimistic: add user message
    const optimisticUser: Chat = {
      id: 'temp-' + Date.now(),
      role: 'user',
      content: message,
      status: 'parsing',
      agent_runs_created: null,
      workflow_id: null,
      created_at: new Date().toISOString(),
      parsed_intent: null,
    }
    setMessages((prev) => [...prev, optimisticUser])

    try {
      const res = await fetch('/api/admin/ai-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      })
      await res.json()
      // Reload history to get real IDs and assistant reply
      await loadHistory()
    } catch (e) {
      console.error('send failed', e)
      setMessages((prev) => [
        ...prev,
        {
          id: 'err-' + Date.now(),
          role: 'assistant',
          content: 'في مشكلة في الاتصال. جرب تاني.',
          status: 'failed',
          agent_runs_created: null,
          workflow_id: null,
          created_at: new Date().toISOString(),
          parsed_intent: null,
        },
      ])
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  const formatTime = (iso: string) => {
    const d = new Date(iso)
    return d.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
  }
  void formatTime

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-50 to-stone-100 flex flex-col" dir="rtl">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-stone-200">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/admin/dashboard" className="flex items-center gap-2 text-stone-600 hover:text-stone-900">
            <ChevronLeft className="w-5 h-5" />
            <span className="text-sm">الـ Dashboard</span>
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-700 to-emerald-900 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="font-semibold text-stone-900">المساعد الذكي</div>
              <div className="text-xs text-stone-500">مدير الـ 46 agent بالعامية</div>
            </div>
          </div>
          <Link
            href="/admin/agents"
            className="text-xs text-stone-500 hover:text-stone-700 flex items-center gap-1"
          >
            <Activity className="w-4 h-4" />
            <span className="hidden sm:inline">الـ Agents</span>
          </Link>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
          {historyLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-stone-400" />
            </div>
          ) : messages.length === 0 ? (
            <EmptyState onPick={send} />
          ) : (
            <>
              {messages.map((m) => (
                <Message key={m.id} chat={m} runStatuses={runStatuses} />
              ))}
              {loading && (
                <div className="flex items-center gap-2 text-stone-500">
                  <Bot className="w-5 h-5" />
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">المساعد بيفكر...</span>
                </div>
              )}
            </>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="sticky bottom-0 bg-white border-t border-stone-200">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex gap-2 items-end">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="اكتب أمر للـ agents... (مثال: ابعت welcome للـ leads الجدد)"
              className="flex-1 resize-none border border-stone-300 rounded-2xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-700 focus:border-transparent text-stone-900 placeholder-stone-400"
              rows={1}
              dir="rtl"
              disabled={loading}
            />
            <button
              onClick={() => send()}
              disabled={loading || !input.trim()}
              className="bg-emerald-800 hover:bg-emerald-900 disabled:bg-stone-300 text-white rounded-full p-3 transition shrink-0"
              aria-label="ابعت"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </div>
          <div className="flex items-center gap-2 mt-2 text-xs text-stone-400">
            <span>اضغط Enter للإرسال • Shift+Enter لسطر جديد</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// Empty state with suggested prompts
// ============================================================================

function EmptyState({ onPick }: { onPick: (text: string) => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-700 to-emerald-900 flex items-center justify-center mb-6">
        <Sparkles className="w-8 h-8 text-white" />
      </div>
      <h1 className="text-2xl font-bold text-stone-900 mb-2">إزيك يا محمد 👋</h1>
      <p className="text-stone-600 mb-8 max-w-md">
        قولي اللي عاوزه وأنا أدّيه للـ agents المناسبين. اقدر أدير الـ 46 agent
        كلهم بكلمة منك.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-2xl">
        {SUGGESTED_PROMPTS.map((p) => (
          <button
            key={p}
            onClick={() => onPick(p)}
            className="text-right p-4 bg-white border border-stone-200 rounded-xl hover:border-emerald-700 hover:shadow-md transition text-stone-700 text-sm"
          >
            {p}
          </button>
        ))}
      </div>
    </div>
  )
}

// ============================================================================
// Single message bubble
// ============================================================================

function Message({
  chat,
  runStatuses,
}: {
  chat: Chat
  runStatuses: Record<string, RunStatus>
}) {
  const isUser = chat.role === 'user'
  const runs = (chat.agent_runs_created ?? [])
    .map((id) => runStatuses[id])
    .filter(Boolean)

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div
        className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center ${
          isUser
            ? 'bg-stone-900 text-white'
            : 'bg-gradient-to-br from-emerald-700 to-emerald-900 text-white'
        }`}
      >
        {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
      </div>
      <div className={`flex-1 max-w-[85%] ${isUser ? 'text-left' : ''}`}>
        <div
          className={`inline-block px-4 py-3 rounded-2xl whitespace-pre-wrap ${
            isUser
              ? 'bg-emerald-800 text-white rounded-tr-sm'
              : 'bg-white border border-stone-200 text-stone-900 rounded-tl-sm'
          }`}
        >
          {chat.content}
        </div>

        {/* Status badges for assistant messages */}
        {!isUser && runs.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {runs.map((r) => (
              <RunBadge key={r.id} run={r} />
            ))}
          </div>
        )}

        {/* Estimated time */}
        {!isUser &&
          chat.parsed_intent?.estimated_minutes &&
          chat.status === 'dispatched' && (
            <div className="mt-2 text-xs text-stone-500 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>متوقع يخلص في {chat.parsed_intent.estimated_minutes} دقيقة</span>
            </div>
          )}

        {/* Warnings */}
        {!isUser &&
          chat.parsed_intent?.warnings &&
          chat.parsed_intent.warnings.length > 0 && (
            <div className="mt-2 flex items-start gap-1 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>{chat.parsed_intent.warnings.join('، ')}</span>
            </div>
          )}

        <div className={`text-xs text-stone-400 mt-1 ${isUser ? 'text-left' : ''}`}>
          {new Date(chat.created_at).toLocaleTimeString('ar-EG', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// Agent run status badge
// ============================================================================

function RunBadge({ run }: { run: RunStatus }) {
  const config = {
    pending: {
      icon: Clock,
      cls: 'bg-stone-100 text-stone-700 border-stone-300',
      label: 'في الـ queue',
    },
    started: {
      icon: Loader2,
      cls: 'bg-blue-50 text-blue-700 border-blue-200',
      label: 'شغال',
      spin: true,
    },
    success: {
      icon: CheckCircle2,
      cls: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      label: 'خلص',
    },
    error: {
      icon: XCircle,
      cls: 'bg-rose-50 text-rose-700 border-rose-200',
      label: 'فشل',
    },
  }
  const c = config[run.status as keyof typeof config] ?? config.pending
  const Icon = c.icon
  return (
    <Link
      href={`/admin/agents?run=${run.id}`}
      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs border ${c.cls} hover:opacity-80 transition`}
      title={run.error_message ?? run.agent_name}
    >
      <Icon className={`w-3 h-3 ${('spin' in c && c.spin) ? 'animate-spin' : ''}`} />
      <span className="font-medium">{run.agent_name}</span>
      <span className="opacity-70">·</span>
      <span>{c.label}</span>
    </Link>
  )
}
