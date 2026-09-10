const fs = require('fs')
// 1) SW register: /start flow = busy (never reload mid-onboarding)
let f = 'E:/madmona-app/src/components/ServiceWorkerRegister.tsx'; let s = fs.readFileSync(f, 'utf8'); const nl = s.includes('\r\n') ? '\r\n' : '\n'
const a = '    const isUserBusy = () => {' + nl + '      const el = document.activeElement as HTMLElement | null'
const b = '    const isUserBusy = () => {' + nl + '      // 🔗 (١٠/٩/٢٠٢٦) /start (التسجيل الذاتي): الـreload بتاع أول تركيب للـSW كان بيقطع فلو توثيق الواتساب' + nl + '      //    (الكود متبعوت والصفحة بتعمل poll) — الصفحة دي مابتتعملش reload تلقائي أبدًا.' + nl + "      if (window.location.pathname === '/start') return true" + nl + '      const el = document.activeElement as HTMLElement | null'
if (!s.includes(a)) throw new Error('sw anchor'); s = s.replace(a, b); fs.writeFileSync(f, s); console.log('sw ok')

// 2) /start: persist pending WA code + resume polling on mount
f = 'E:/madmona-app/src/app/start/page.tsx'; s = fs.readFileSync(f, 'utf8')
const rep = (x, y, l) => { if (!s.includes(x)) throw new Error('start anchor ' + l); s = s.replace(x, y) }
rep("const DRAFT_KEY = 'madmona_start_draft'", "const DRAFT_KEY = 'madmona_start_draft'\nconst WA_KEY = 'madmona_start_wa'   // الكود المعلّق — لو الصفحة اتعملت reload وسط التوثيق نكمّل الـpoll", 'key')
rep(`    setWa({ code: r.code, number: r.wa_number, url: r.wa_url })
    setStage('verify')
    if (pollRef.current) clearInterval(pollRef.current)
    pollRef.current = setInterval(async () => {
      const st = await fetch(\`/api/auth/wa?code=\${encodeURIComponent(r.code)}\`).then((x) => x.json()).catch(() => null)
      if (!st?.verified) return
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
      const fin = await fetch('/api/auth/wa', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'finish', code: r.code, full_name: form.contact_name.trim() || undefined }) })
        .then((x) => x.json()).catch(() => null)
      if (!fin?.token_hash) { setErr('التوثيق ماكملش — جرّب تاني'); setStage('form'); return }
      if (fin.madmona_token) safeStorage.set('madmona_token', fin.madmona_token)
      let access: string | null = null
      try {
        const { data } = await supabaseBrowser.auth.verifyOtp({ type: 'email', token_hash: fin.token_hash })
        access = data?.session?.access_token || null
        void syncModuleSession()
      } catch { /* هنكمّل بالتوكن */ }
      void createBusiness({ ...form, contact_phone: fin.phone || form.contact_phone }, access)
    }, 2500)
  }`,
`    const pending = { code: r.code, number: r.wa_number, url: r.wa_url, at: Date.now() }
    safeStorage.set(WA_KEY, JSON.stringify(pending))
    setWa(pending)
    setStage('verify')
    startPolling(pending.code, form)
  }

  function startPolling(code: string, f: Form) {
    if (pollRef.current) clearInterval(pollRef.current)
    pollRef.current = setInterval(async () => {
      const st = await fetch(\`/api/auth/wa?code=\${encodeURIComponent(code)}\`).then((x) => x.json()).catch(() => null)
      if (st?.expired) { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null } safeStorage.remove(WA_KEY); setErr('الكود انتهى — اضغط تاني'); setStage('form'); return }
      if (!st?.verified) return
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
      const fin = await fetch('/api/auth/wa', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'finish', code, full_name: f.contact_name.trim() || undefined }) })
        .then((x) => x.json()).catch(() => null)
      if (!fin?.token_hash) { setErr('التوثيق ماكملش — جرّب تاني'); safeStorage.remove(WA_KEY); setStage('form'); return }
      safeStorage.remove(WA_KEY)
      if (fin.madmona_token) safeStorage.set('madmona_token', fin.madmona_token)
      let access: string | null = null
      try {
        const { data } = await supabaseBrowser.auth.verifyOtp({ type: 'email', token_hash: fin.token_hash })
        access = data?.session?.access_token || null
        void syncModuleSession()
      } catch { /* هنكمّل بالتوكن */ }
      void createBusiness({ ...f, contact_phone: fin.phone || f.contact_phone }, access)
    }, 2500)
  }`, 'poll')
rep(`      if (s?.user && draft && (resume || draft.business_name.trim().length >= 2)) { void createBusiness(draft, s.access_token); return }
      setStage('form')`,
`      if (s?.user && draft && (resume || draft.business_name.trim().length >= 2)) { void createBusiness(draft, s.access_token); return }
      // كود واتساب معلّق (الصفحة اتعملت reload وسط التوثيق) → نرجع لشاشة الكود ونكمّل الـpoll
      try {
        const rawWa = safeStorage.get(WA_KEY)
        const pend = rawWa ? JSON.parse(rawWa) as { code: string; number: string; url: string; at: number } : null
        if (pend?.code && draft && Date.now() - (pend.at || 0) < 14 * 60 * 1000) { setWa(pend); setStage('verify'); startPolling(pend.code, draft); return }
        if (pend) safeStorage.remove(WA_KEY)
      } catch { /* لا كود معلّق */ }
      setStage('form')`, 'resume')
rep(`            <button onClick={() => { if (pollRef.current) clearInterval(pollRef.current); setStage('form') }} className="text-xs text-gray-500 underline">ارجع للبيانات</button>`,
`            <button onClick={() => { if (pollRef.current) clearInterval(pollRef.current); safeStorage.remove(WA_KEY); setStage('form') }} className="text-xs text-gray-500 underline">ارجع للبيانات</button>`, 'back')
rep("      safeStorage.remove(DRAFT_KEY)\n      setSupplierId(r.supplier_id); setStage('done')", "      safeStorage.remove(DRAFT_KEY); safeStorage.remove(WA_KEY)\n      setSupplierId(r.supplier_id); setStage('done')", 'done')
fs.writeFileSync(f, s); console.log('start ok')
