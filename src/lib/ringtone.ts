// ── نغمة الرنين للمكالمات ──────────────────────────────────────
// Web Audio بدل ملف صوت: مفيش أصل يتحمّل، وبيشتغل فوراً.
// نمطين: ringback (للمتصل — نغمة واحدة كل 3 ثواني) و ring (للمستقبل — أعلى وأسرع).
// ملحوظة: المتصفح بيمنع الصوت قبل أول لمسة من المستخدم — فبنبدأ بعد جيستشر.

type Ring = { stop: () => void }

export function playRing(kind: 'ringback' | 'incoming' = 'ringback'): Ring {
  let ctx: AudioContext | null = null
  let timer: ReturnType<typeof setInterval> | null = null
  let stopped = false

  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    ctx = new AC()
  } catch { return { stop: () => {} } }

  const cfg = kind === 'incoming'
    ? { freqs: [440, 480], beep: 0.4, gap: 0.2, reps: 2, every: 2400, vol: 0.22 }
    : { freqs: [420], beep: 0.9, gap: 0, reps: 1, every: 3200, vol: 0.12 }

  function burst() {
    if (!ctx || stopped) return
    let t = ctx.currentTime
    for (let r = 0; r < cfg.reps; r++) {
      for (const f of cfg.freqs) {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'sine'
        osc.frequency.value = f
        gain.gain.setValueAtTime(0, t)
        gain.gain.linearRampToValueAtTime(cfg.vol, t + 0.04)
        gain.gain.setValueAtTime(cfg.vol, t + cfg.beep - 0.05)
        gain.gain.linearRampToValueAtTime(0, t + cfg.beep)
        osc.connect(gain); gain.connect(ctx.destination)
        osc.start(t); osc.stop(t + cfg.beep + 0.02)
      }
      t += cfg.beep + cfg.gap
    }
  }

  // اهتزاز مع الرنة الواردة
  function buzz() {
    if (kind !== 'incoming') return
    try { navigator.vibrate?.([300, 200, 300]) } catch { /* مش مدعوم */ }
  }

  const kick = () => { if (ctx?.state === 'suspended') void ctx.resume(); burst(); buzz() }
  kick()
  timer = setInterval(kick, cfg.every)

  return {
    stop: () => {
      stopped = true
      if (timer) { clearInterval(timer); timer = null }
      try { navigator.vibrate?.(0) } catch { /* ignore */ }
      try { void ctx?.close() } catch { /* ignore */ }
      ctx = null
    },
  }
}
