'use client'

import { useState, useRef } from 'react'
import {
  Shield, Zap, Lock, Server, Users, Code2, ChevronDown,
  Check, X, ArrowRight, Cpu, Globe, Database, FileText,
  Mic, Volume2, Key, AlertCircle, Brain, Terminal, Sparkles
} from 'lucide-react'

// ─── Recommendation engine ────────────────────────────────────────────────────

// All models — VRAM is Q4_K_M quantized (roughly half of FP16)
// e.g. Llama 70B FP16 = ~140 GB → Q4_K_M = ~40 GB, fits on A40
const ALL_MODELS = {
  // LLMs
  llama_3b:    { name: 'Llama 3.2 3B',          quant: 'Q4_K_M', type: 'llm', vram: 2,  tier: 'Starter',      costPerReq: 0.00018, ctx: '128k', provider: 'Meta' },
  llama_8b:    { name: 'Llama 3.1 8B Instruct',  quant: 'Q4_K_M', type: 'llm', vram: 5,  tier: 'Standard',     costPerReq: 0.00042, ctx: '128k', provider: 'Meta' },
  mistral_7b:  { name: 'Mistral 7B v0.3',        quant: 'Q4_K_M', type: 'llm', vram: 4,  tier: 'Standard',     costPerReq: 0.00038, ctx: '32k',  provider: 'Mistral AI' },
  qwen_14b:    { name: 'Qwen 2.5 14B',           quant: 'Q4_K_M', type: 'llm', vram: 9,  tier: 'Standard',     costPerReq: 0.00075, ctx: '128k', provider: 'Alibaba' },
  mistral_22b: { name: 'Mistral Small 22B',      quant: 'Q4_K_M', type: 'llm', vram: 13, tier: 'Standard',     costPerReq: 0.00110, ctx: '32k',  provider: 'Mistral AI' },
  llama_70b:   { name: 'Llama 3.3 70B Instruct', quant: 'Q4_K_M', type: 'llm', vram: 40, tier: 'Professional', costPerReq: 0.00320, ctx: '128k', provider: 'Meta' },
  // STT — not quantized (encoder models, already small)
  whisper_s:   { name: 'Whisper Small',           quant: 'FP16', type: 'stt', vram: 1,  tier: 'Starter',  costPerReq: 0.00020, provider: 'OpenAI (OSS)' },
  distil_w:    { name: 'Distil-Whisper Large v3', quant: 'FP16', type: 'stt', vram: 3,  tier: 'Standard', costPerReq: 0.00035, provider: 'HuggingFace' },
  whisper_l:   { name: 'Whisper Large v3',        quant: 'FP16', type: 'stt', vram: 5,  tier: 'Standard', costPerReq: 0.00045, provider: 'OpenAI (OSS)' },
  // TTS
  kokoro:      { name: 'Kokoro 82M', quant: 'FP16', type: 'tts', vram: 1, tier: 'Starter',  costPerReq: 0.00012, provider: 'Kokoro TTS' },
  xtts:        { name: 'XTTS v2',    quant: 'FP16', type: 'tts', vram: 3, tier: 'Standard', costPerReq: 0.00025, provider: 'Coqui' },
}

// GPU options — RunPod base price + 65% Neuramine markup
const ALL_GPUS = {
  a4000: { name: 'NVIDIA RTX A4000', vram: 16, hourly: 0.48, provider: 'RunPod', tier: 'Starter'      },
  a5000: { name: 'NVIDIA RTX A5000', vram: 24, hourly: 0.74, provider: 'RunPod', tier: 'Standard'     },
  a40:   { name: 'NVIDIA A40',       vram: 48, hourly: 1.30, provider: 'RunPod', tier: 'Professional' },
  a100:  { name: 'NVIDIA A100 80GB', vram: 80, hourly: 3.65, provider: 'RunPod', tier: 'Enterprise'   },
}

// Estimated daily request volume midpoints
const REQ_MIDPOINTS = { '<20': 12, '50-200': 120, '200-1k': 580, '1k-5k': 2800, '5k+': 7500 }
// User count scores (0–2)
const USER_SCORE   = { '1': 0, '2-10': 0, '11-50': 1, '51-200': 2, '200+': 3 }
// Req/day scores
const REQ_SCORE    = { '<20': 0, '50-200': 0, '200-1k': 1, '1k-5k': 2, '5k+': 3 }
// Reasoning scores
const REASON_SCORE = { simple: 0, moderate: 1, deep: 2 }

function computeRecommendation({ useCases, reasoning, userCount, reqPerDay, industry }) {
  const needsLLM = useCases.some(u => ['doc_qa','chat','data','code','reasoning'].includes(u))
  const needsSTT = useCases.includes('stt')
  const needsTTS = useCases.includes('tts')
  const needsCode = useCases.includes('code')
  const regulated = ['healthcare','legal','finance'].includes(industry)

  // ── LLM selection ──────────────────────────────────────────────────────────
  let llm = null
  let llmWhy = ''
  if (needsLLM) {
    const score =
      REASON_SCORE[reasoning] * 2 +
      USER_SCORE[userCount] +
      REQ_SCORE[reqPerDay] +
      (regulated ? 1 : 0)

    if (score <= 1 && !needsCode) {
      llm = ALL_MODELS.llama_3b
      llmWhy = 'Low complexity + small scale — 3B is fast and cost-efficient.'
    } else if (score <= 3 && !needsCode) {
      llm = ALL_MODELS.llama_8b
      llmWhy = 'Good balance of capability and cost for your scale.'
    } else if (score <= 4 || needsCode) {
      llm = ALL_MODELS.qwen_14b
      llmWhy = needsCode
        ? 'Qwen 2.5 14B has strong code generation and long context.'
        : 'Moderate complexity + growing usage — 14B gives better output quality.'
    } else if (score <= 6) {
      llm = ALL_MODELS.mistral_22b
      llmWhy = regulated
        ? `${industry.charAt(0).toUpperCase() + industry.slice(1)} use cases benefit from Mistral 22B's accuracy.`
        : 'Higher complexity and scale call for a 22B-class model.'
    } else {
      llm = ALL_MODELS.llama_70b
      llmWhy = 'High concurrency + deep reasoning requires a 70B model for reliable output quality.'
    }
  }

  // ── STT selection ──────────────────────────────────────────────────────────
  let stt = null
  let sttWhy = ''
  if (needsSTT) {
    if (reasoning === 'deep' || USER_SCORE[userCount] >= 2) {
      stt = ALL_MODELS.whisper_l
      sttWhy = 'Whisper Large v3 for highest accuracy at scale.'
    } else if (reasoning === 'moderate') {
      stt = ALL_MODELS.distil_w
      sttWhy = 'Distil-Whisper — near-Large accuracy at half the VRAM.'
    } else {
      stt = ALL_MODELS.whisper_s
      sttWhy = 'Whisper Small is sufficient for low-volume transcription.'
    }
  }

  // ── TTS selection ──────────────────────────────────────────────────────────
  let tts = null
  let ttsWhy = ''
  if (needsTTS) {
    if (reasoning !== 'simple') {
      tts = ALL_MODELS.xtts
      ttsWhy = 'XTTS v2 for higher voice quality and multilingual support.'
    } else {
      tts = ALL_MODELS.kokoro
      ttsWhy = 'Kokoro 82M is lightweight and fast for basic voice synthesis.'
    }
  }

  // ── GPU selection ──────────────────────────────────────────────────────────
  const usedVram = (llm?.vram || 0) + (stt?.vram || 0) + (tts?.vram || 0)
  // 20% headroom for KV-cache growth, OS overhead, batching buffers
  const requiredVram = Math.ceil(usedVram * 1.20)
  // High concurrency → step up one tier to handle parallel requests
  const needsExtra = USER_SCORE[userCount] >= 2 || REQ_SCORE[reqPerDay] >= 2

  // With Q4_K_M: 22B = 13 GB → fits A4000 (16 GB); 70B = 40 GB → fits A40 (48 GB)
  let gpu
  if      (requiredVram <= 13 && !needsExtra) gpu = ALL_GPUS.a4000  // up to ~11 GB models (22B Q4 just fits)
  else if (requiredVram <= 16 && !needsExtra) gpu = ALL_GPUS.a4000
  else if (requiredVram <= 16 &&  needsExtra) gpu = ALL_GPUS.a5000
  else if (requiredVram <= 24 && !needsExtra) gpu = ALL_GPUS.a5000
  else if (requiredVram <= 24 &&  needsExtra) gpu = ALL_GPUS.a40
  else if (requiredVram <= 48)                gpu = ALL_GPUS.a40    // 70B Q4_K_M (40 GB) fits here
  else                                        gpu = ALL_GPUS.a100

  // ── Cost estimates ─────────────────────────────────────────────────────────
  const totalCostPerReq = (llm?.costPerReq || 0) + (stt?.costPerReq || 0) + (tts?.costPerReq || 0)
  const dailyReqs = REQ_MIDPOINTS[reqPerDay] || 50
  const serverlessMonthly = totalCostPerReq * dailyReqs * 30
  const dedicatedMonthly  = gpu.hourly * 720
  // Break-even: requests/month at which dedicated becomes cheaper
  const breakEvenMonthly = totalCostPerReq > 0 ? Math.round(dedicatedMonthly / totalCostPerReq) : null

  const models = [llm, stt, tts].filter(Boolean)

  return {
    models,
    llmWhy, sttWhy, ttsWhy,
    gpu,
    usedVram,
    requiredVram,
    totalCostPerReq,
    serverlessMonthly,
    dedicatedMonthly,
    breakEvenMonthly,
    regulated,
  }
}

// ─── Question + Result form ───────────────────────────────────────────────────

const Q1_OPTIONS = [
  { id: 'doc_qa',    label: 'Document Q&A' },
  { id: 'chat',      label: 'Chat / conversation' },
  { id: 'data',      label: 'Data analysis' },
  { id: 'code',      label: 'Code generation' },
  { id: 'reasoning', label: 'Complex reasoning' },
  { id: 'stt',       label: 'Transcription (STT)' },
  { id: 'tts',       label: 'Voice synthesis (TTS)' },
]
const Q2_OPTIONS = [
  { id: 'simple',   label: 'Simple',   sub: 'Retrieval and summaries' },
  { id: 'moderate', label: 'Moderate', sub: 'Analysis and drafting' },
  { id: 'deep',     label: 'Deep',     sub: 'Multi-step, legal, medical' },
]
const Q3_OPTIONS = [
  { id: '1',      label: '1 user' },
  { id: '2-10',   label: '2–10 users' },
  { id: '11-50',  label: '11–50 users' },
  { id: '51-200', label: '51–200 users' },
  { id: '200+',   label: '200+ users' },
]
const Q4_OPTIONS = [
  { id: '<20',    label: 'Less than 20' },
  { id: '50-200', label: '50–200' },
  { id: '200-1k', label: '200–1,000' },
  { id: '1k-5k',  label: '1,000–5,000' },
  { id: '5k+',    label: '5,000+' },
]
const Q5_OPTIONS = [
  { id: 'healthcare', label: 'Healthcare' },
  { id: 'finance',    label: 'Finance' },
  { id: 'legal',      label: 'Legal' },
  { id: 'general',    label: 'General' },
  { id: 'other',      label: 'Other' },
]

const TIER_COLORS = {
  Starter:      'text-green-400  bg-green-400/10',
  Standard:     'text-blue-400   bg-blue-400/10',
  Professional: 'text-purple-400 bg-purple-400/10',
  Enterprise:   'text-orange-400 bg-orange-400/10',
}
const TYPE_LABELS = { llm: 'LLM', stt: 'STT', tts: 'TTS' }

function fmt(n) {
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}k`
  if (n >= 10)   return `$${Math.round(n)}`
  if (n >= 1)    return `$${n.toFixed(2)}`
  if (n >= 0.01) return `$${n.toFixed(3)}`
  return `$${n.toFixed(4)}`
}

// ─── Quick join (email only, no questions required) ───────────────────────────
function QuickJoin({ source = 'quick' }) {
  const [email, setEmail]   = useState('')
  const [status, setStatus] = useState('idle')
  const [err, setErr]       = useState('')

  const submit = async (e) => {
    e.preventDefault()
    setStatus('loading')
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source }),
      })
      const data = await res.json()
      if (res.ok) { setStatus('success') }
      else { setStatus('error'); setErr(data.error || 'Something went wrong.') }
    } catch {
      setStatus('error'); setErr('Network error.')
    }
  }

  if (status === 'success') return (
    <div className="flex items-center gap-2 text-green-400 text-xs">
      <Check size={13} className="shrink-0" />
      <span>You're on the list — we'll email you at launch.</span>
    </div>
  )

  return (
    <form onSubmit={submit} className="flex gap-2">
      <input
        type="email" value={email} onChange={e => setEmail(e.target.value)}
        placeholder="your@email.com" required
        className="flex-1 h-11 bg-white/5 border border-white/15 rounded-xl px-4 text-white text-sm placeholder-white/30 focus:outline-none focus:border-brand transition-all"
      />
      <button type="submit" disabled={status === 'loading'}
        className="shrink-0 h-11 px-5 bg-brand hover:bg-brand-dark text-white text-sm font-semibold rounded-xl transition-all disabled:opacity-50">
        {status === 'loading' ? '...' : 'Join waitlist'}
      </button>
      {status === 'error' && <p className="text-red-400 text-xs mt-1">{err}</p>}
    </form>
  )
}

function WaitlistForm({ size = 'lg', source = 'hero' }) {
  const [step, setStep]           = useState(1) // 1-5 = questions, 'result' = recommendation
  const [useCases, setUseCases]   = useState([])
  const [reasoning, setReasoning] = useState('')
  const [userCount, setUserCount] = useState('')
  const [reqPerDay, setReqPerDay] = useState('')
  const [industry, setIndustry]   = useState('')
  const [email, setEmail]         = useState('')
  const [submitStatus, setSubmitStatus] = useState('idle')
  const [errMsg, setErrMsg]       = useState('')

  const toggleUseCase = id =>
    setUseCases(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])

  const goToResult = (ind) => {
    setIndustry(ind)
    setStep('result')
  }

  const submit = async (e) => {
    e.preventDefault()
    setSubmitStatus('loading')
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email, source,
          use_cases:   useCases.join(','),
          reasoning,
          user_count:  userCount,
          req_per_day: reqPerDay,
          industry,
        }),
      })
      const data = await res.json()
      if (res.ok) { setSubmitStatus('success') }
      else { setSubmitStatus('error'); setErrMsg(data.error || 'Something went wrong.') }
    } catch {
      setSubmitStatus('error'); setErrMsg('Network error. Please try again.')
    }
  }

  // ── Progress bar (questions only) ──────────────────────────────────────────
  const QProgress = ({ current }) => (
    <div className="flex items-center gap-1.5 mb-4">
      {[1,2,3,4,5].map(n => (
        <div key={n} className={`h-1 flex-1 rounded-full transition-all ${n <= current ? 'bg-brand' : 'bg-white/10'}`} />
      ))}
      <span className="text-xs text-white/30 ml-1 shrink-0">{current}/5</span>
    </div>
  )

  const Back = ({ to }) => (
    <button type="button" onClick={() => setStep(to)}
      className="text-xs text-white/25 hover:text-white/50 transition-colors mt-3 block">← Back</button>
  )

  // ── Shared quick-join footer shown on every question step ─────────────────
  const QuickJoinFooter = () => (
    <div className="mt-6 pt-5 border-t border-white/10">
      <div className="flex items-center gap-2 mb-3">
        <div className="flex-1 h-px bg-white/8" />
        <span className="text-xs text-white/35 font-medium px-2">or</span>
        <div className="flex-1 h-px bg-white/8" />
      </div>
      <p className="text-base font-semibold text-white mb-1">Just join the waitlist</p>
      <p className="text-xs text-white/45 mb-3">Skip the quiz — get early access + $20 credits at launch.</p>
      <QuickJoin source={`${source}_skip`} />
    </div>
  )

  // ── Q1: Use cases (multi-select) ───────────────────────────────────────────
  if (step === 1) return (
    <div className="w-full">
      <QProgress current={1} />
      <p className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-1">Question 1 of 5</p>
      <p className="text-sm font-semibold text-white mb-1">What will this AI do?</p>
      <p className="text-xs text-white/35 mb-3">Select all that apply — we'll recommend the right model</p>
      <div className="grid grid-cols-2 gap-2 mb-4">
        {Q1_OPTIONS.map(o => {
          const on = useCases.includes(o.id)
          return (
            <button key={o.id} type="button" onClick={() => toggleUseCase(o.id)}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-left text-sm transition-all ${
                on ? 'border-brand bg-brand/10 text-white' : 'border-white/10 bg-white/[0.03] text-white/60 hover:border-white/20 hover:text-white/80'
              }`}>
              <div className={`w-4 h-4 rounded shrink-0 border flex items-center justify-center transition-all ${on ? 'bg-brand border-brand' : 'border-white/20'}`}>
                {on && <Check size={10} className="text-white" />}
              </div>
              {o.label}
            </button>
          )
        })}
      </div>
      <button type="button" onClick={() => setStep(2)} disabled={useCases.length === 0}
        className="w-full h-10 bg-brand hover:bg-brand-dark text-white text-sm font-semibold rounded-xl transition-all disabled:opacity-30">
        Continue →
      </button>
      <QuickJoinFooter />
    </div>
  )

  // ── Q2: Reasoning depth ────────────────────────────────────────────────────
  if (step === 2) return (
    <div className="w-full">
      <QProgress current={2} />
      <p className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-1">Question 2 of 5</p>
      <p className="text-sm font-semibold text-white mb-3">How deep does the reasoning need to be?</p>
      <div className="space-y-2 mb-2">
        {Q2_OPTIONS.map(o => (
          <button key={o.id} type="button" onClick={() => { setReasoning(o.id); setStep(3) }}
            className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-white/10 bg-white/[0.03] hover:border-brand hover:bg-brand/5 text-left transition-all group">
            <span className="text-sm font-medium text-white/80 group-hover:text-white">{o.label}</span>
            <span className="text-xs text-white/35">{o.sub}</span>
          </button>
        ))}
      </div>
      <Back to={1} />
      <QuickJoinFooter />
    </div>
  )

  // ── Q3: User count ─────────────────────────────────────────────────────────
  if (step === 3) return (
    <div className="w-full">
      <QProgress current={3} />
      <p className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-1">Question 3 of 5</p>
      <p className="text-sm font-semibold text-white mb-3">How many users will use this workspace?</p>
      <div className="space-y-2 mb-2">
        {Q3_OPTIONS.map(o => (
          <button key={o.id} type="button" onClick={() => { setUserCount(o.id); setStep(4) }}
            className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/[0.03] hover:border-brand hover:bg-brand/5 text-left text-sm font-medium text-white/80 hover:text-white transition-all">
            {o.label}
          </button>
        ))}
      </div>
      <Back to={2} />
      <QuickJoinFooter />
    </div>
  )

  // ── Q4: Requests/day ───────────────────────────────────────────────────────
  if (step === 4) return (
    <div className="w-full">
      <QProgress current={4} />
      <p className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-1">Question 4 of 5</p>
      <p className="text-sm font-semibold text-white mb-3">How many requests per day?</p>
      <div className="space-y-2 mb-2">
        {Q4_OPTIONS.map(o => (
          <button key={o.id} type="button" onClick={() => { setReqPerDay(o.id); setStep(5) }}
            className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/[0.03] hover:border-brand hover:bg-brand/5 text-left text-sm font-medium text-white/80 hover:text-white transition-all">
            {o.label}
          </button>
        ))}
      </div>
      <Back to={3} />
      <QuickJoinFooter />
    </div>
  )

  // ── Q5: Industry ───────────────────────────────────────────────────────────
  if (step === 5) return (
    <div className="w-full">
      <QProgress current={5} />
      <p className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-1">Question 5 of 5</p>
      <p className="text-sm font-semibold text-white mb-3">What industry is this for?</p>
      <div className="space-y-2 mb-2">
        {Q5_OPTIONS.map(o => (
          <button key={o.id} type="button" onClick={() => goToResult(o.id)}
            className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/[0.03] hover:border-brand hover:bg-brand/5 text-left text-sm font-medium text-white/80 hover:text-white transition-all">
            {o.label}
          </button>
        ))}
      </div>
      <Back to={4} />
      <QuickJoinFooter />
    </div>
  )

  // ── Result: recommendation + email ─────────────────────────────────────────
  if (step === 'result') {
    const rec = computeRecommendation({ useCases, reasoning, userCount, reqPerDay, industry })
    const whyMap = { llm: rec.llmWhy, stt: rec.sttWhy, tts: rec.ttsWhy }
    const vramPct = Math.min(100, Math.round((rec.usedVram / rec.gpu.vram) * 100))

    if (submitStatus === 'success') return (
      <div className="flex items-start gap-3 text-green-400 bg-green-400/10 border border-green-400/20 rounded-xl px-5 py-5">
        <Check size={20} className="shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold mb-1">You're on the list!</p>
          <p className="text-sm text-green-400/80 leading-relaxed">
            We'll email you early access + $20 in credits at launch.
            {rec.regulated && ` Your ${industry} workspace will have compliance mode enabled on day one.`}
          </p>
        </div>
      </div>
    )

    return (
      <div className="w-full">
        {/* Header */}
        <div className="flex items-center gap-2 mb-4">
          <Sparkles size={14} className="text-brand" />
          <p className="text-sm font-semibold text-white">Your recommended configuration</p>
          <button type="button" onClick={() => setStep(1)}
            className="ml-auto text-xs text-white/25 hover:text-white/50 transition-colors">
            ← Redo
          </button>
        </div>

        {/* Models */}
        <div className="space-y-2 mb-4">
          {rec.models.map(m => (
            <div key={m.name} className="bg-white/[0.04] border border-white/8 rounded-xl px-4 py-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-semibold text-white">{m.name}</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-white/40 bg-white/5 px-2 py-0.5 rounded-full">{TYPE_LABELS[m.type]}</span>
                  <span className="text-xs text-white/35 bg-white/5 px-2 py-0.5 rounded-full font-mono">{m.quant}</span>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${TIER_COLORS[m.tier]}`}>{m.tier}</span>
                </div>
              </div>
              <div className="flex items-center gap-3 text-xs text-white/35 mb-1.5">
                <span>{m.provider}</span>
                <span>·</span>
                <span>{m.vram} GB VRAM</span>
                {m.ctx && <><span>·</span><span>{m.ctx} ctx</span></>}
                <span>·</span>
                <span className="text-white/50">{fmt(m.costPerReq)}/req</span>
              </div>
              <p className="text-xs text-white/45 leading-relaxed">{whyMap[m.type]}</p>
            </div>
          ))}
        </div>

        {/* GPU */}
        <div className="bg-white/[0.04] border border-white/8 rounded-xl px-4 py-3 mb-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Cpu size={13} className="text-white/50" />
              <span className="text-sm font-semibold text-white">{rec.gpu.name}</span>
            </div>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${TIER_COLORS[rec.gpu.tier]}`}>{rec.gpu.tier}</span>
          </div>
          <div className="flex items-center justify-between text-xs text-white/40 mb-2">
            <span>{rec.gpu.vram} GB VRAM · {rec.gpu.provider}</span>
            <span>{rec.usedVram} GB used of {rec.gpu.vram} GB ({vramPct}%)</span>
          </div>
          {/* VRAM bar */}
          <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-brand rounded-full transition-all" style={{ width: `${vramPct}%` }} />
          </div>
        </div>

        {/* Cost comparison */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          {/* Serverless */}
          <div className="bg-white/[0.04] border border-white/8 rounded-xl p-3">
            <p className="text-xs font-semibold text-white/50 mb-2 flex items-center gap-1.5">
              <Zap size={11} className="text-yellow-400" /> Serverless
            </p>
            <p className="text-lg font-bold text-white">{fmt(rec.totalCostPerReq)}</p>
            <p className="text-xs text-white/35 mb-2">per request</p>
            <div className="border-t border-white/5 pt-2 space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-white/40">Est. / month</span>
                <span className="text-white/70 font-medium">{fmt(rec.serverlessMonthly)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-white/40">Idle cost</span>
                <span className="text-green-400 font-medium">$0</span>
              </div>
            </div>
            <p className="text-xs text-white/25 mt-2 leading-tight">Scales to zero. Cold start ~5s.</p>
          </div>

          {/* Dedicated */}
          <div className="bg-white/[0.04] border border-white/8 rounded-xl p-3">
            <p className="text-xs font-semibold text-white/50 mb-2 flex items-center gap-1.5">
              <Server size={11} className="text-blue-400" /> Dedicated 24/7
            </p>
            <p className="text-lg font-bold text-white">{fmt(rec.gpu.hourly)}</p>
            <p className="text-xs text-white/35 mb-2">per hour</p>
            <div className="border-t border-white/5 pt-2 space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-white/40">Per month</span>
                <span className="text-white/70 font-medium">{fmt(rec.dedicatedMonthly)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-white/40">Cold starts</span>
                <span className="text-white font-medium">None</span>
              </div>
            </div>
            <p className="text-xs text-white/25 mt-2 leading-tight">Always warm. Best for production.</p>
          </div>
        </div>

        {/* Break-even note */}
        {rec.breakEvenMonthly && (
          <p className="text-xs text-white/30 text-center mb-3">
            Dedicated becomes cheaper above{' '}
            <span className="text-white/55">{rec.breakEvenMonthly.toLocaleString()} requests/month</span>
            {' '}(~{Math.round(rec.breakEvenMonthly / 30).toLocaleString()}/day).
          </p>
        )}

        {/* BYOG callout */}
        <div className="bg-brand/5 border border-brand/15 rounded-xl px-4 py-3 mb-4 flex items-start gap-3">
          <Lock size={14} className="text-brand shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-white/70">Have your own GPU? It's free forever.</p>
            <p className="text-xs text-white/35 mt-0.5">Run Neuramine on your own server — $0 GPU cost, data never leaves your building. Platform fee waived.</p>
          </div>
        </div>

        {/* Compliance note */}
        {rec.regulated && (
          <div className="bg-green-400/5 border border-green-400/15 rounded-xl px-4 py-3 mb-4">
            <p className="text-xs text-green-400/80">
              <span className="font-semibold capitalize">{industry}</span> compliance mode will be enabled —
              HIPAA audit logs, AES-256 encryption per workspace, BAA available.
            </p>
          </div>
        )}

        {/* Email capture */}
        <div className="border-t border-white/8 pt-4">
          <p className="text-xs text-white/50 mb-3">
            Save this configuration — get notified when we launch + <span className="text-brand font-medium">$20 in free credits</span>.
          </p>
          <form onSubmit={submit}>
            <div className="flex gap-2">
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@company.com" required
                className="flex-1 h-11 bg-white/5 border border-white/10 rounded-xl px-4 text-white text-sm placeholder-white/30 focus:outline-none focus:border-brand transition-all" />
              <button type="submit" disabled={submitStatus === 'loading'}
                className="shrink-0 h-11 px-5 bg-brand hover:bg-brand-dark text-white text-sm font-semibold rounded-xl transition-all disabled:opacity-50">
                {submitStatus === 'loading' ? '...' : 'Reserve →'}
              </button>
            </div>
            {submitStatus === 'error' && (
              <p className="text-red-400 text-xs flex items-center gap-1.5 mt-1.5">
                <AlertCircle size={11} /> {errMsg}
              </p>
            )}
          </form>
        </div>
      </div>
    )
  }

  return null
}

// ─── Nav ──────────────────────────────────────────────────────────────────────
function Nav({ onWaitlistClick }) {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-black/80 backdrop-blur-xl">
      <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-brand rounded-lg flex items-center justify-center">
            <Brain size={16} className="text-white" />
          </div>
          <span className="font-semibold text-white text-lg tracking-tight">Neuramine</span>
          <span className="text-white/30 text-xs ml-1 border border-white/10 rounded px-1.5 py-0.5">Private Beta</span>
        </div>
        <div className="flex items-center gap-6">
          <a href="#how-it-works" className="text-white/50 hover:text-white text-sm transition-colors hidden sm:block">How it works</a>
          <a href="#pricing" className="text-white/50 hover:text-white text-sm transition-colors hidden sm:block">Pricing</a>
          <button
            onClick={onWaitlistClick}
            className="bg-brand hover:bg-brand-dark text-white text-sm font-semibold px-4 h-9 rounded-lg transition-colors"
          >
            Join waitlist
          </button>
        </div>
      </div>
    </nav>
  )
}

// ─── Hero ─────────────────────────────────────────────────────────────────────
function Hero() {
  return (
    <section className="relative pt-32 pb-24 grid-bg overflow-hidden">
      {/* Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-brand/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative max-w-5xl mx-auto px-5 text-center">
        <div className="inline-flex items-center gap-2 text-brand text-sm font-medium bg-brand/10 border border-brand/20 rounded-full px-4 py-1.5 mb-8 animate-fade-in-up">
          <span className="w-1.5 h-1.5 bg-brand rounded-full animate-pulse" />
          Now in private beta — waitlist open
        </div>

        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.05] mb-6 animate-fade-in-up delay-100">
          Deploy a private AI<br />
          <span className="gradient-text">in 3 minutes.</span>
        </h1>

        <p className="text-xl text-white/60 max-w-2xl mx-auto mb-10 leading-relaxed animate-fade-in-up delay-200">
          OpenAI-compatible API. ChatGPT-style interface. Your data <strong className="text-white/80 font-medium">never leaves your infrastructure</strong>.
          Zero ML expertise required. HIPAA-compliant on day one.
        </p>

        <div className="max-w-xl mx-auto mb-10 animate-fade-in-up delay-300">
          <WaitlistForm size="lg" source="hero" />
        </div>

        {/* Social proof seeds */}
        <div className="flex items-center justify-center gap-6 text-white/35 text-sm animate-fade-in-up delay-400">
          <div className="flex items-center gap-1.5"><Check size={14} className="text-green-400" /> No credit card for trial</div>
          <div className="hidden sm:flex items-center gap-1.5"><Check size={14} className="text-green-400" /> HIPAA-compliant</div>
          <div className="hidden sm:flex items-center gap-1.5"><Check size={14} className="text-green-400" /> Cancel anytime</div>
        </div>
      </div>

      {/* Code snippet preview */}
      <div className="max-w-2xl mx-auto px-5 mt-16 animate-fade-in-up delay-400">
        <div className="bg-[#0a0a0a] border border-white/8 rounded-2xl overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5">
            <div className="w-3 h-3 rounded-full bg-red-500/60" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
            <div className="w-3 h-3 rounded-full bg-green-500/60" />
            <span className="text-white/25 text-xs ml-2">One-line migration from OpenAI</span>
          </div>
          <pre className="!border-0 !rounded-none !bg-transparent text-[0.82rem]"><code>
<span className="text-white/30"># Before — data sent to OpenAI's servers</span>{'\n'}
<span className="text-white/50">client = OpenAI(</span><span className="text-red-400/80">api_key="sk-..."</span><span className="text-white/50">)</span>{'\n\n'}
<span className="text-white/30"># After — your data stays on your infrastructure</span>{'\n'}
<span className="text-white/50">client = OpenAI(</span>{'\n'}
<span className="text-white/50">    </span><span className="text-brand/80">base_url</span><span className="text-white/50">="https://</span><span className="text-green-400/80">api.neuramine.io/v1</span><span className="text-white/50">",</span>{'\n'}
<span className="text-white/50">    </span><span className="text-brand/80">api_key</span><span className="text-white/50">="</span><span className="text-green-400/80">nrm_sk_...</span><span className="text-white/50">",</span>{'\n'}
<span className="text-white/50">)</span>{'\n\n'}
<span className="text-white/30"># Everything else stays exactly the same</span>{'\n'}
<span className="text-white/50">response = client.chat.completions.create(</span>{'\n'}
<span className="text-white/50">    model="</span><span className="text-green-400/80">llama-3.1-8b</span><span className="text-white/50">", messages=[...]</span>{'\n'}
<span className="text-white/50">)</span>
          </code></pre>
        </div>
      </div>
    </section>
  )
}

// ─── Problem ──────────────────────────────────────────────────────────────────
function Problem() {
  return (
    <section className="py-24 border-t border-white/5">
      <div className="max-w-6xl mx-auto px-5">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">The privacy gap is real</h2>
          <p className="text-white/50 text-lg max-w-2xl mx-auto">
            Every powerful AI tool — ChatGPT, Claude, Gemini — requires sending your data to a third-party cloud.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-16">
          {[
            { stat: '59%', label: 'of employees use unapproved AI tools at work' },
            { stat: '75%', label: 'share sensitive business data with public AI tools' },
            { stat: '$150k+', label: 'annual cost of a single ML engineer to self-host' },
          ].map(({ stat, label }) => (
            <div key={stat} className="text-center p-8 bg-white/[0.02] border border-white/6 rounded-2xl">
              <div className="text-5xl font-bold gradient-text mb-3">{stat}</div>
              <div className="text-white/50 text-sm leading-relaxed">{label}</div>
            </div>
          ))}
        </div>

        {/* Comparison table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/8">
                <th className="text-left py-4 px-4 text-white/40 font-normal w-[40%]">Capability</th>
                <th className="text-center py-4 px-4 text-white/40 font-normal">Public AI APIs</th>
                <th className="text-center py-4 px-4 text-brand font-semibold">Neuramine</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['Data sent to third parties', 'yes', 'no'],
                ['Model trains on your data', 'yes (without enterprise plan)', 'no'],
                ['HIPAA / PIPEDA compliant', 'enterprise plans only ($$$)', 'yes'],
                ['LLM + STT + TTS unified', 'split across multiple vendors', 'yes'],
                ['OpenAI-compatible API', 'yes (their own)', 'yes — drop-in replacement'],
                ['On-premise / BYOG option', 'no', 'yes'],
                ['Requires ML engineers', 'no', 'no'],
              ].map(([cap, pub, nrm]) => (
                <tr key={cap} className="border-b border-white/5 hover:bg-white/[0.01]">
                  <td className="py-4 px-4 text-white/70">{cap}</td>
                  <td className="py-4 px-4 text-center">
                    {pub === 'yes' ? (
                      <span className="inline-flex items-center gap-1 text-red-400/70"><X size={14} /> yes</span>
                    ) : pub === 'no' ? (
                      <span className="inline-flex items-center gap-1 text-green-400/70"><Check size={14} /> no</span>
                    ) : (
                      <span className="text-white/30 text-xs">{pub}</span>
                    )}
                  </td>
                  <td className="py-4 px-4 text-center">
                    {nrm === 'yes' || nrm === 'no' || nrm.startsWith('yes') ? (
                      <span className="inline-flex items-center gap-1 text-green-400 font-medium">
                        <Check size={14} /> {nrm}
                      </span>
                    ) : (
                      <span className="text-white/30 text-xs">{nrm}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}

// ─── How it works ─────────────────────────────────────────────────────────────
function HowItWorks() {
  const steps = [
    {
      num: '01',
      icon: <Key size={20} />,
      title: 'Sign up in 30 seconds',
      body: 'Google OAuth or magic link — no password stored ever. $10 in free credits applied instantly. No credit card required.',
    },
    {
      num: '02',
      icon: <Cpu size={20} />,
      title: 'Deploy your model',
      body: 'Answer 5 questions. Neuramine recommends the right model and GPU. Click Deploy. Your private endpoint is live in under 2 minutes.',
    },
    {
      num: '03',
      icon: <Terminal size={20} />,
      title: 'Get your API key and go',
      body: 'One API key. Drop-in OpenAI replacement. Works with LangChain, n8n, any SDK. Change one line of code — everything else stays the same.',
    },
  ]

  return (
    <section id="how-it-works" className="py-24 border-t border-white/5">
      <div className="max-w-6xl mx-auto px-5">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">From signup to inference in 3 minutes</h2>
          <p className="text-white/50 text-lg">No DevOps. No ML expertise. No infrastructure management.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {steps.map(({ num, icon, title, body }) => (
            <div key={num} className="relative p-8 bg-white/[0.02] border border-white/6 rounded-2xl">
              <div className="absolute top-6 right-6 text-5xl font-bold text-white/5 select-none">{num}</div>
              <div className="w-10 h-10 bg-brand/10 border border-brand/20 rounded-xl flex items-center justify-center text-brand mb-5">
                {icon}
              </div>
              <h3 className="text-lg font-semibold mb-2">{title}</h3>
              <p className="text-white/50 text-sm leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Who is it for ────────────────────────────────────────────────────────────
function Personas() {
  const personas = [
    {
      icon: <Code2 size={22} />,
      title: 'Developers & indie hackers',
      trigger: 'Need a private API URL or have a client with compliance requirements',
      pain: 'OpenAI API is cheap but sends everything externally. No private alternative with the same developer experience.',
      wins: [
        'One-line migration from OpenAI',
        'Private endpoint accessible from any server',
        'STT + TTS + LLM — all in one',
        'Stream responses, full OpenAI SDK support',
      ],
    },
    {
      icon: <Users size={22} />,
      title: 'Teams & companies',
      trigger: 'Compliance incident, HIPAA audit, or exec mandate to stop using public AI',
      pain: 'Staff use ChatGPT unofficially with sensitive patient, client, or financial data. No compliant alternative that doesn\'t require an IT team.',
      wins: [
        'ChatGPT-style interface for your whole team',
        'HIPAA & PIPEDA compliant from day one',
        'Member access with no billing/settings visibility',
        'Upload documents — AI knows your business',
      ],
    },
    {
      icon: <Server size={22} />,
      title: 'Enterprises with own GPUs',
      trigger: 'Board-level data sovereignty mandate or specific regulated use case',
      pain: 'Cloud AI is legally or policy-unacceptable. Building in-house requires ML engineers you can\'t hire fast enough.',
      wins: [
        'BYOG — run on your own hardware, free forever',
        'Data never leaves your building',
        'Outbound-only, no firewall changes needed',
        'SSO/SAML, dedicated GPU, custom SLA',
      ],
    },
  ]

  return (
    <section className="py-24 border-t border-white/5">
      <div className="max-w-6xl mx-auto px-5">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">Built for teams who can't use public AI</h2>
          <p className="text-white/50 text-lg">Healthcare. Finance. Legal. Any company with proprietary data.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {personas.map(({ icon, title, trigger, pain, wins }) => (
            <div key={title} className="p-8 bg-white/[0.02] border border-white/6 rounded-2xl flex flex-col">
              <div className="w-11 h-11 bg-brand/10 border border-brand/20 rounded-xl flex items-center justify-center text-brand mb-5">
                {icon}
              </div>
              <h3 className="text-lg font-bold mb-1">{title}</h3>
              <p className="text-brand/80 text-xs mb-3 font-medium">Converts when: {trigger}</p>
              <p className="text-white/40 text-sm leading-relaxed mb-5 border-b border-white/5 pb-5">{pain}</p>
              <ul className="space-y-2 mt-auto">
                {wins.map(w => (
                  <li key={w} className="flex items-start gap-2 text-sm text-white/70">
                    <Check size={14} className="text-green-400 mt-0.5 shrink-0" />
                    {w}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── GPU Sources ──────────────────────────────────────────────────────────────
function GPUSources() {
  const sources = [
    {
      icon: <Zap size={20} />,
      title: 'Serverless cloud GPU',
      subtitle: 'Scale to zero. Pay per second.',
      desc: 'On-demand workers from RunPod, Lambda Labs, and Vast.ai. Scales automatically under load. No idle cost when not in use.',
      tag: 'Most popular',
      cost: 'From $0.94 / 1k requests',
    },
    {
      icon: <Server size={20} />,
      title: 'Dedicated GPU',
      subtitle: 'Always warm. Zero cold starts.',
      desc: 'Reserved GPU instance running 24/7. Lowest latency, highest throughput. Best for production workloads with consistent usage.',
      tag: 'Best latency',
      cost: 'Hourly reserved rate',
    },
    {
      icon: <Lock size={20} />,
      title: 'Bring Your Own GPU (BYOG)',
      subtitle: 'Your hardware. Free forever.',
      desc: 'Run the Neuramine Agent on your own server. Data never leaves your building. Outbound-only — no firewall changes needed.',
      tag: 'Free forever',
      cost: '$0 GPU cost',
      highlight: true,
    },
  ]

  return (
    <section className="py-24 border-t border-white/5">
      <div className="max-w-6xl mx-auto px-5">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">Your GPU, our cloud, or both</h2>
          <p className="text-white/50 text-lg max-w-2xl mx-auto">
            Three GPU sources. Switch between them at any time with zero data loss. ~60 second migration.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {sources.map(({ icon, title, subtitle, desc, tag, cost, highlight }) => (
            <div
              key={title}
              className={`p-8 rounded-2xl border flex flex-col ${
                highlight
                  ? 'bg-brand/5 border-brand/30'
                  : 'bg-white/[0.02] border-white/6'
              }`}
            >
              <div className="flex items-start justify-between mb-5">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${highlight ? 'bg-brand/20 text-brand' : 'bg-white/5 text-white/60'}`}>
                  {icon}
                </div>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${highlight ? 'bg-brand/20 text-brand' : 'bg-white/5 text-white/40'}`}>
                  {tag}
                </span>
              </div>
              <h3 className="text-lg font-bold mb-1">{title}</h3>
              <p className={`text-sm mb-3 font-medium ${highlight ? 'text-brand/80' : 'text-white/40'}`}>{subtitle}</p>
              <p className="text-white/50 text-sm leading-relaxed mb-5 flex-1">{desc}</p>
              <div className={`text-sm font-semibold ${highlight ? 'text-brand' : 'text-white/60'}`}>{cost}</div>
            </div>
          ))}
        </div>

        {/* BYOG callout */}
        <div className="mt-8 p-8 bg-brand/5 border border-brand/20 rounded-2xl flex flex-col sm:flex-row items-center gap-6">
          <div className="flex-1">
            <h3 className="text-xl font-bold mb-2">Have your own GPU server? Neuramine is free forever.</h3>
            <p className="text-white/50 text-sm leading-relaxed">
              Two Docker commands. Your device appears in the dashboard in 30 seconds. No inbound ports, no firewall changes — the same architecture as GitHub Actions self-hosted runners and Cloudflare Tunnel.
            </p>
          </div>
          <div className="shrink-0 bg-[#0a0a0a] border border-white/8 rounded-xl overflow-hidden text-[0.78rem] min-w-[280px]">
            <div className="px-4 py-2 border-b border-white/5 text-white/25 text-xs">2 commands to get started</div>
            <pre className="!border-0 !rounded-none !bg-transparent !text-[0.78rem] !p-4"><code>
<span className="text-white/30"># Install NVIDIA Container Toolkit</span>{'\n'}
<span className="text-white/50">sudo apt-get install nvidia-container-toolkit</span>{'\n\n'}
<span className="text-white/30"># Start the Neuramine Agent</span>{'\n'}
<span className="text-white/50">docker run -d --gpus all \</span>{'\n'}
<span className="text-white/50">  -e NEURAMINE_TOKEN=</span><span className="text-green-400/80">your_token</span>{'\n'}
<span className="text-white/50">  neuramine/agent:latest</span>
            </code></pre>
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── Model Catalogue ──────────────────────────────────────────────────────────
function Models() {
  const categories = [
    {
      icon: <Brain size={18} />,
      title: 'Large Language Models',
      sub: 'Text generation, reasoning, code',
      models: [
        { name: 'Llama 3.2 3B', provider: 'Meta', tier: 'Starter', vram: '8GB' },
        { name: 'Llama 3.1 8B', provider: 'Meta', tier: 'Standard', vram: '16GB' },
        { name: 'Mistral 7B v0.3', provider: 'Mistral AI', tier: 'Standard', vram: '16GB' },
        { name: 'Gemma 2 9B', provider: 'Google', tier: 'Standard', vram: '16GB' },
        { name: 'Qwen 2.5 14B', provider: 'Alibaba', tier: 'Standard', vram: '24GB' },
        { name: 'Mistral Small 22B', provider: 'Mistral AI', tier: 'Professional', vram: '32GB' },
        { name: 'Llama 3.3 70B', provider: 'Meta', tier: 'Enterprise', vram: '48GB' },
      ],
    },
    {
      icon: <Mic size={18} />,
      title: 'Speech-to-Text',
      sub: 'Transcription in 99 languages',
      models: [
        { name: 'Whisper Small', provider: 'OpenAI (OSS)', tier: 'Starter', vram: '2GB' },
        { name: 'Distil-Whisper Large v3', provider: 'HuggingFace', tier: 'Standard', vram: '4GB' },
        { name: 'Whisper Large v3', provider: 'OpenAI (OSS)', tier: 'Standard', vram: '6GB' },
      ],
    },
    {
      icon: <Volume2 size={18} />,
      title: 'Text-to-Speech',
      sub: 'Real-time voice synthesis',
      models: [
        { name: 'Kokoro 82M', provider: 'Kokoro TTS', tier: 'Starter', vram: '2GB' },
        { name: 'XTTS v2', provider: 'Coqui', tier: 'Standard', vram: '4GB' },
      ],
    },
  ]

  const tierColors = {
    Starter: 'text-green-400 bg-green-400/10',
    Standard: 'text-blue-400 bg-blue-400/10',
    Professional: 'text-purple-400 bg-purple-400/10',
    Enterprise: 'text-orange-400 bg-orange-400/10',
  }

  return (
    <section className="py-24 border-t border-white/5">
      <div className="max-w-6xl mx-auto px-5">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">Open-source models, unified API</h2>
          <p className="text-white/50 text-lg max-w-2xl mx-auto">
            The models below are popular starting points — Neuramine supports the full open-source ecosystem. If it runs on a GPU and ships as open weights, you can deploy it.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {categories.map(({ icon, title, sub, models }) => (
            <div key={title} className="bg-white/[0.02] border border-white/6 rounded-2xl overflow-hidden">
              <div className="p-6 border-b border-white/5">
                <div className="flex items-center gap-3 mb-1">
                  <div className="text-brand">{icon}</div>
                  <h3 className="font-semibold">{title}</h3>
                </div>
                <p className="text-white/40 text-xs ml-7">{sub}</p>
              </div>
              <div className="divide-y divide-white/5">
                {models.map(({ name, provider, tier, vram }) => (
                  <div key={name} className="flex items-center justify-between px-6 py-3">
                    <div>
                      <div className="text-sm font-medium text-white/80">{name}</div>
                      <div className="text-xs text-white/30">{provider} · {vram} VRAM</div>
                    </div>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${tierColors[tier]}`}>{tier}</span>
                  </div>
                ))}
                <div className="px-6 py-3 flex items-center gap-2 text-xs text-white/30">
                  <Sparkles size={11} className="text-brand shrink-0" />
                  <span>+ many more open-source models available on request</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Compliance ───────────────────────────────────────────────────────────────
function Compliance() {
  const items = [
    {
      icon: <Shield size={20} />,
      title: 'HIPAA-ready',
      body: 'AES-256 encryption per workspace via AWS KMS. BAA available for healthcare accounts. Audit logs retained 6 years. All connections TLS 1.3.',
    },
    {
      icon: <Lock size={20} />,
      title: 'Data isolation',
      body: 'Per-workspace schemas in PostgreSQL. Per-workspace collections in Qdrant. Per-workspace encryption keys. No cross-contamination by design.',
    },
    {
      icon: <FileText size={20} />,
      title: 'Append-only audit log',
      body: 'Every request and response is encrypted, timestamped, and logged synchronously before the response is returned. Never async — never a gap.',
    },
    {
      icon: <Globe size={20} />,
      title: 'PIPEDA compliant',
      body: 'Canadian federal privacy law compliance. Multi-region deployment with data residency controls. Enterprise customers can specify their region.',
    },
    {
      icon: <Database size={20} />,
      title: 'System prompt protection',
      body: 'Three-layer prompt architecture. Compliance guardrails for healthcare/finance/legal are server-enforced — no API caller can override them.',
    },
    {
      icon: <Key size={20} />,
      title: 'Zero credential storage',
      body: 'Passwordless auth only. Google OAuth or magic link. No credential database to breach. Minimal attack surface.',
    },
  ]

  return (
    <section className="py-24 border-t border-white/5">
      <div className="max-w-6xl mx-auto px-5">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">Compliance built in from day one</h2>
          <p className="text-white/50 text-lg max-w-2xl mx-auto">
            Not an enterprise add-on. Not a checkbox. Neuramine was designed for regulated industries from the ground up.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {items.map(({ icon, title, body }) => (
            <div key={title} className="p-6 bg-white/[0.02] border border-white/6 rounded-2xl">
              <div className="w-10 h-10 bg-brand/10 border border-brand/20 rounded-xl flex items-center justify-center text-brand mb-4">
                {icon}
              </div>
              <h3 className="font-semibold mb-2">{title}</h3>
              <p className="text-white/45 text-sm leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Pricing ──────────────────────────────────────────────────────────────────
function Pricing() {
  const tiers = [
    {
      name: 'Free Trial',
      price: '$0',
      sub: '14 days',
      features: [
        '$10 GPU credits included',
        '1 workspace',
        '3B models only',
        '100 requests / day',
        'Google OAuth or magic link',
      ],
      cta: 'Start free trial',
      highlight: false,
    },
    {
      name: 'BYOG Free',
      price: '$0',
      sub: 'forever',
      features: [
        'Unlimited workspaces',
        'All models',
        'Your hardware = $0 GPU cost',
        'Full platform features',
        'Google OAuth required',
      ],
      cta: 'Join waitlist',
      highlight: false,
    },
    {
      name: 'Starter',
      price: '$19',
      sub: '/ month',
      features: [
        '3 workspaces (BYOG + cloud)',
        'All models',
        'Pay-per-request GPU billing',
        'Unlimited team members',
        'Credits or monthly billing',
      ],
      cta: 'Join waitlist',
      highlight: true,
    },
    {
      name: 'Enterprise',
      price: 'Custom',
      sub: 'pricing',
      features: [
        'Unlimited workspaces',
        'Dedicated GPU',
        'SSO / SAML',
        'BAA + DPA signed',
        'Custom SLA + support',
      ],
      cta: 'Contact us',
      highlight: false,
    },
  ]

  return (
    <section id="pricing" className="py-24 border-t border-white/5">
      <div className="max-w-6xl mx-auto px-5">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">Simple, transparent pricing</h2>
          <p className="text-white/50 text-lg">Start free. Scale when you need to.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {tiers.map(({ name, price, sub, features, cta, highlight }) => (
            <div
              key={name}
              className={`p-7 rounded-2xl border flex flex-col ${
                highlight
                  ? 'bg-brand/5 border-brand/40 relative'
                  : 'bg-white/[0.02] border-white/6'
              }`}
            >
              {highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand text-white text-xs font-semibold px-3 py-1 rounded-full">
                  Most popular
                </div>
              )}
              <div className="mb-6">
                <div className="text-white/50 text-sm mb-3 font-medium">{name}</div>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold">{price}</span>
                  <span className="text-white/40 text-sm">{sub}</span>
                </div>
              </div>
              <ul className="space-y-2.5 mb-8 flex-1">
                {features.map(f => (
                  <li key={f} className="flex items-start gap-2 text-sm text-white/65">
                    <Check size={14} className="text-green-400 mt-0.5 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <button
                className={`w-full h-10 rounded-xl text-sm font-semibold transition-colors ${
                  highlight
                    ? 'bg-brand hover:bg-brand-dark text-white'
                    : 'bg-white/5 hover:bg-white/8 text-white/70'
                }`}
              >
                {cta}
              </button>
            </div>
          ))}
        </div>
        <p className="text-center text-white/30 text-sm mt-6">
          GPU billing at cost + 65% markup. Volume bonuses on credit purchases. No hidden fees.
        </p>
      </div>
    </section>
  )
}

// ─── FAQ ─────────────────────────────────────────────────────────────────────
function FAQ() {
  const [open, setOpen] = useState(null)

  const items = [
    {
      q: "Why not just use Ollama?",
      a: "Ollama is a local model runner — it serves one person on one machine. The moment you need a teammate to access the same model, a real API URL, cloud GPU, compliance features, or long-term memory, Ollama has no answer. Neuramine is infrastructure. Ollama is a developer tool. The comparison is SQLite vs PostgreSQL — different jobs, not different price points for the same job.",
    },
    {
      q: "Where does my data actually go?",
      a: "On cloud GPU workspaces, inference runs on the GPU provider you select (RunPod, Lambda Labs, etc.) — your data is processed there and nowhere else. On BYOG workspaces, inference runs on your own machine. Neuramine's control plane handles authentication and routing, but never stores your prompt or response content.",
    },
    {
      q: "Is Neuramine really HIPAA-compliant?",
      a: "Yes. AES-256 encryption per workspace (AWS KMS), append-only audit logs retained 6 years, TLS 1.3 on all connections, BAA available for healthcare accounts. The compliance layer is not an add-on — it was built in from day one.",
    },
    {
      q: "What does BYOG Free mean exactly?",
      a: "If you run the Neuramine Agent on your own GPU machine (any NVIDIA GPU with CUDA), the platform fee is waived entirely and GPU cost is $0 — you're using your own hardware. You only pay the $19/month Starter fee if you also want cloud GPU workspaces.",
    },
    {
      q: "How does the API compare to OpenAI's?",
      a: "It's a drop-in replacement. Same endpoint format (/v1/chat/completions, /v1/audio/transcriptions, /v1/audio/speech), same request/response structure. Change your base_url and api_key — nothing else. Works with LangChain, LlamaIndex, n8n, and any OpenAI SDK.",
    },
    {
      q: "What happens if my cloud GPU provider goes down?",
      a: "Neuramine has a multi-provider abstraction layer. RunPod is primary, Lambda Labs is secondary, Vast.ai for cost optimisation. If your primary provider has availability issues, deployment automatically routes to the next available provider. You never see a 'no GPU available' error.",
    },
    {
      q: "Can my whole team use the same AI?",
      a: "Yes — that's what workspaces are for. You invite teammates by email. They get a magic link, click it, and land directly in the chat interface with no access to billing or settings. All conversations in a workspace are shared among the team. You control who has access.",
    },
    {
      q: "Do you only support the models listed on the page?",
      a: "No — the listed models are a curated starting point to show the range of what's available. Neuramine supports the full open-source model ecosystem. Any open-weight LLM (Llama, Mistral, Qwen, Falcon, Phi, DeepSeek, Gemma, and more), STT model (Whisper variants, Wav2Vec2, MMS, SeamlessM4T), or TTS model (XTTS, Kokoro, StyleTTS2, Bark, Tortoise, and more) that runs on a GPU can be deployed through Neuramine. If you need a specific model not shown, reach out — we'll add it.",
    },
    {
      q: "Can I bring my own fine-tuned or custom model?",
      a: "Yes. You can load any HuggingFace-compatible checkpoint or GGUF file into a BYOG workspace. Upload the weights to your GPU machine, point the Neuramine Agent at the path, and it appears as a selectable model in your workspace — same API, same compliance layer, same chat interface.",
    },
    {
      q: "When is the public launch?",
      a: "We're currently in private beta, building toward a public launch in the next few months. Joining the waitlist gets you $20 in credits at launch (double the standard trial) and early access before public availability.",
    },
  ]

  return (
    <section className="py-24 border-t border-white/5">
      <div className="max-w-2xl mx-auto px-5">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">Frequently asked</h2>
        </div>
        <div className="space-y-3">
          {items.map(({ q, a }, i) => (
            <div
              key={i}
              className="bg-white/[0.02] border border-white/6 rounded-xl overflow-hidden"
            >
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="w-full flex items-center justify-between px-6 py-5 text-left"
              >
                <span className="font-medium text-white/90 pr-4">{q}</span>
                <ChevronDown
                  size={18}
                  className={`shrink-0 text-white/40 transition-transform ${open === i ? 'rotate-180' : ''}`}
                />
              </button>
              {open === i && (
                <div className="px-6 pb-5">
                  <p className="text-white/55 text-sm leading-relaxed">{a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Bottom CTA ───────────────────────────────────────────────────────────────
function BottomCTA() {
  return (
    <section className="py-24 border-t border-white/5 relative overflow-hidden">
      <div className="absolute inset-0 grid-bg opacity-50" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-brand/8 rounded-full blur-[100px] pointer-events-none" />
      <div className="relative max-w-2xl mx-auto px-5 text-center">
        <h2 className="text-4xl sm:text-5xl font-bold mb-4 leading-tight">
          Your models.<br />Your data.<br />
          <span className="gradient-text">Your infrastructure.</span>
        </h2>
        <p className="text-white/50 text-lg mb-10">
          Join the waitlist. Get <strong className="text-white/80">$20 in free credits</strong> at launch — double the standard trial.
        </p>
        <div className="max-w-md mx-auto">
          <WaitlistForm size="lg" source="bottom_cta" />
        </div>
      </div>
    </section>
  )
}

// ─── Footer ───────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer className="border-t border-white/5 py-10">
      <div className="max-w-6xl mx-auto px-5 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-brand rounded-md flex items-center justify-center">
            <Brain size={12} className="text-white" />
          </div>
          <span className="text-white/40 text-sm">Neuramine Systems Inc., Moncton, NB, Canada</span>
        </div>
        <div className="flex items-center gap-5 text-white/30 text-sm">
          <a href="/privacy" className="hover:text-white/60 transition-colors">Privacy</a>
          <a href="/terms" className="hover:text-white/60 transition-colors">Terms</a>
          <a href="mailto:hello@neuramine.io" className="hover:text-white/60 transition-colors">Contact</a>
        </div>
      </div>
    </footer>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function LandingPage() {
  const waitlistRef = useRef(null)

  const scrollToWaitlist = () => {
    waitlistRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <Nav onWaitlistClick={scrollToWaitlist} />
      <Hero />
      <Problem />
      <HowItWorks />
      <Personas />
      <GPUSources />
      <Models />
      <Compliance />
      <Pricing />
      <FAQ />
      <div ref={waitlistRef}>
        <BottomCTA />
      </div>
      <Footer />
    </div>
  )
}
