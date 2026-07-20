import { readFileSync } from 'node:fs'

const env = {}
for (const line of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const m = line.trim().match(/^([A-Z_0-9]+)=(.*)$/)
  if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
}

const text = `اتنفّذ يا فندم ✅

فصلنا الإلكترونيات عن المعدات زي ما اقترحت بالظبط:

*إلكترونيات وموبايلات* دلوقتي فيه:
• لابتوب وكمبيوتر
• موبايلات وتابلت
• بلايستيشن وأكس بوكس
• أجهزة كهربائية منزلية
• إكسسوارات إلكترونية

و*معدات تكنولوجيا* بقى للتجاري بس — شاشات LED وATM وأنظمة POS وشبكات الإيفنتس.

اقتراح في محله، كان فعلاً خلط بين حاجتين مالهمش علاقة ببعض. شكرًا 🤝`

const res = await fetch('https://www.madmonacairo.com/api/internal/wa-send', {
  method: 'POST',
  headers: { 'content-type': 'application/json', 'x-internal-secret': env.EDGE_GATEWAY_SECRET },
  body: JSON.stringify({
    to: '145398115078244',
    jid: '145398115078244@lid',
    text,
    agentName: 'المارد',
  }),
})
console.log(JSON.stringify(await res.json()).slice(0, 300))
