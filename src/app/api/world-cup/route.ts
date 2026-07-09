import { NextResponse } from 'next/server'

// ============================================================
// /api/world-cup — FIFA World Cup 2026 live scores (cached 45s)
//
// Provider chain:
//   1) football-data.org  (if FOOTBALL_DATA_API_KEY env is set — free tier
//      includes the World Cup: https://www.football-data.org)
//   2) fotmob public endpoint (keyless fallback)
// Normalized shape → the /world-cup page renders one format only.
// ============================================================

export const dynamic = 'force-dynamic'

type WcTeam = { name: string; name_ar: string; crest: string | null; score: number | null; penalties?: number | null }
export type WcMatch = {
  id: string
  stage: string | null
  group: string | null
  status: 'live' | 'finished' | 'scheduled'
  minute: string | null
  utc_date: string
  home: WcTeam
  away: WcTeam
}

const AR_TEAMS: Record<string, string> = {
  Egypt: 'مصر', Morocco: 'المغرب', Tunisia: 'تونس', Algeria: 'الجزائر',
  'Saudi Arabia': 'السعودية', Qatar: 'قطر', Jordan: 'الأردن', Iraq: 'العراق',
  Argentina: 'الأرجنتين', Brazil: 'البرازيل', France: 'فرنسا', Germany: 'ألمانيا',
  Spain: 'إسبانيا', England: 'إنجلترا', Portugal: 'البرتغال', Netherlands: 'هولندا',
  Italy: 'إيطاليا', Belgium: 'بلجيكا', Croatia: 'كرواتيا', Uruguay: 'أوروجواي',
  Colombia: 'كولومبيا', Mexico: 'المكسيك', Canada: 'كندا', USA: 'أمريكا',
  'United States': 'أمريكا', Japan: 'اليابان', 'South Korea': 'كوريا الجنوبية',
  'Korea Republic': 'كوريا الجنوبية', Senegal: 'السنغال', Ghana: 'غانا',
  Nigeria: 'نيجيريا', Cameroon: 'الكاميرون', 'Ivory Coast': 'كوت ديفوار',
  Australia: 'أستراليا', Switzerland: 'سويسرا', Poland: 'بولندا', Austria: 'النمسا',
  Denmark: 'الدنمارك', Sweden: 'السويد', Norway: 'النرويج', Ecuador: 'الإكوادور',
  Paraguay: 'باراجواي', Panama: 'بنما', 'Costa Rica': 'كوستاريكا', Iran: 'إيران',
  Uzbekistan: 'أوزبكستان', 'New Zealand': 'نيوزيلندا', Scotland: 'اسكتلندا',
  Turkey: 'تركيا', Türkiye: 'تركيا', Ukraine: 'أوكرانيا', Greece: 'اليونان',
  'South Africa': 'جنوب أفريقيا', 'Cape Verde': 'الرأس الأخضر', 'Cabo Verde': 'الرأس الأخضر',
  Curacao: 'كوراساو', Curaçao: 'كوراساو', Haiti: 'هايتي', Honduras: 'هندوراس',
  Jamaica: 'جامايكا', Bolivia: 'بوليفيا', Venezuela: 'فنزويلا', Chile: 'تشيلي', Peru: 'بيرو',
}

const STAGE_AR: Record<string, string> = {
  GROUP_STAGE: 'دور المجموعات',
  LAST_32: 'دور الـ32',
  ROUND_OF_32: 'دور الـ32',
  LAST_16: 'دور الـ16',
  ROUND_OF_16: 'دور الـ16',
  QUARTER_FINALS: 'ربع النهائي',
  SEMI_FINALS: 'نصف النهائي',
  THIRD_PLACE: 'المركز الثالث',
  FINAL: 'النهائي',
}

const ar = (name: string) => AR_TEAMS[name] || name

// ---------- in-memory cache ----------
let cache: { ts: number; payload: unknown } | null = null
const TTL_MS = 45_000

function dstr(d: Date) {
  return d.toISOString().slice(0, 10)
}

// ---------- provider 1: football-data.org ----------
async function fromFootballData(): Promise<WcMatch[] | null> {
  const key = process.env.FOOTBALL_DATA_API_KEY
  if (!key) return null
  try {
    const now = new Date()
    const from = new Date(now.getTime() - 36 * 3600_000)
    const to = new Date(now.getTime() + 72 * 3600_000)
    const res = await fetch(
      `https://api.football-data.org/v4/competitions/WC/matches?dateFrom=${dstr(from)}&dateTo=${dstr(to)}`,
      { headers: { 'X-Auth-Token': key }, cache: 'no-store' },
    )
    if (!res.ok) return null
    const j = (await res.json()) as {
      matches?: {
        id: number
        utcDate: string
        status: string
        minute?: number | null
        stage?: string
        group?: string | null
        homeTeam: { name: string; crest?: string | null }
        awayTeam: { name: string; crest?: string | null }
        score: {
          fullTime: { home: number | null; away: number | null }
          penalties?: { home: number | null; away: number | null } | null
        }
      }[]
    }
    if (!j.matches) return null
    return j.matches.map((m) => {
      const live = m.status === 'IN_PLAY' || m.status === 'PAUSED'
      const done = m.status === 'FINISHED'
      return {
        id: `fd-${m.id}`,
        stage: m.stage ? (STAGE_AR[m.stage] || m.stage) : null,
        group: m.group ? m.group.replace('GROUP_', 'مجموعة ') : null,
        status: live ? 'live' : done ? 'finished' : 'scheduled',
        minute: live && m.minute != null ? `${m.minute}'` : live ? 'لايف' : null,
        utc_date: m.utcDate,
        home: {
          name: m.homeTeam.name, name_ar: ar(m.homeTeam.name),
          crest: m.homeTeam.crest || null,
          score: m.score.fullTime.home, penalties: m.score.penalties?.home ?? null,
        },
        away: {
          name: m.awayTeam.name, name_ar: ar(m.awayTeam.name),
          crest: m.awayTeam.crest || null,
          score: m.score.fullTime.away, penalties: m.score.penalties?.away ?? null,
        },
      } as WcMatch
    })
  } catch {
    return null
  }
}

// ---------- provider 2: ESPN public scoreboard (keyless, datacenter-friendly) ----------
function stageFromNote(note: string | null | undefined): string | null {
  if (!note) return null
  const n = note.toLowerCase()
  if (n.includes('round of 32')) return 'دور الـ32'
  if (n.includes('round of 16')) return 'دور الـ16'
  if (n.includes('quarter')) return 'ربع النهائي'
  if (n.includes('semi')) return 'نصف النهائي'
  if (n.includes('third place')) return 'المركز الثالث'
  if (n.includes('final')) return 'النهائي'
  if (n.includes('group')) return 'دور المجموعات'
  return null
}

async function fromESPN(): Promise<WcMatch[] | null> {
  try {
    const now = new Date()
    const from = new Date(now.getTime() - 36 * 3600_000)
    const to = new Date(now.getTime() + 72 * 3600_000)
    const range = `${dstr(from).replace(/-/g, '')}-${dstr(to).replace(/-/g, '')}`
    const res = await fetch(
      `https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=${range}`,
      { cache: 'no-store' },
    )
    if (!res.ok) return null
    const j = (await res.json()) as {
      events?: {
        id: string
        date: string
        status?: {
          displayClock?: string
          type?: { state?: string }
        }
        competitions?: {
          notes?: { headline?: string }[]
          competitors?: {
            homeAway?: string
            score?: string | null
            shootoutScore?: number | null
            team?: { displayName?: string; logo?: string | null }
          }[]
        }[]
      }[]
    }
    if (!j.events || j.events.length === 0) return null

    const out: WcMatch[] = []
    for (const ev of j.events) {
      const comp = ev.competitions?.[0]
      const comps = comp?.competitors || []
      const h = comps.find((c) => c.homeAway === 'home')
      const a = comps.find((c) => c.homeAway === 'away')
      if (!h?.team?.displayName || !a?.team?.displayName) continue
      const state = ev.status?.type?.state || 'pre'
      const live = state === 'in'
      const done = state === 'post'
      const mk = (c: typeof h): WcTeam => ({
        name: c!.team!.displayName!,
        name_ar: ar(c!.team!.displayName!),
        crest: c!.team!.logo || null,
        score: state === 'pre' ? null : (c!.score != null && c!.score !== '' ? Number(c!.score) : null),
        penalties: c!.shootoutScore ?? null,
      })
      out.push({
        id: `espn-${ev.id}`,
        stage: stageFromNote(comp?.notes?.[0]?.headline),
        group: null,
        status: live ? 'live' : done ? 'finished' : 'scheduled',
        minute: live ? (ev.status?.displayClock || 'لايف') : null,
        utc_date: ev.date,
        home: mk(h),
        away: mk(a),
      })
    }
    return out.length > 0 ? out : null
  } catch {
    return null
  }
}

// ---------- provider 3: fotmob (keyless fallback) ----------
async function fromFotmob(): Promise<WcMatch[] | null> {
  try {
    const days = [-1, 0, 1]
    const all: WcMatch[] = []
    for (const off of days) {
      const d = new Date(Date.now() + off * 86400_000)
      const ymd = d.toISOString().slice(0, 10).replace(/-/g, '')
      const res = await fetch(`https://www.fotmob.com/api/matches?date=${ymd}`, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; MadmonaBot/1.0)' },
        cache: 'no-store',
      })
      if (!res.ok) continue
      const j = (await res.json()) as {
        leagues?: {
          id: number
          name: string
          ccode?: string
          matches: {
            id: number
            home: { id: number; name: string; score?: number | null }
            away: { id: number; name: string; score?: number | null }
            status: {
              utcTime: string
              started?: boolean
              finished?: boolean
              cancelled?: boolean
              liveTime?: { short?: string } | null
              reason?: { short?: string } | null
            }
          }[]
        }[]
      }
      const wc = (j.leagues || []).filter(
        (l) => /world cup/i.test(l.name) && !/qualif|women|u-?2|u-?1|club/i.test(l.name),
      )
      for (const lg of wc) {
        for (const m of lg.matches || []) {
          const live = !!m.status.started && !m.status.finished && !m.status.cancelled
          const done = !!m.status.finished
          all.push({
            id: `fm-${m.id}`,
            stage: null,
            group: null,
            status: live ? 'live' : done ? 'finished' : 'scheduled',
            minute: live ? (m.status.liveTime?.short || 'لايف') : null,
            utc_date: m.status.utcTime,
            home: {
              name: m.home.name, name_ar: ar(m.home.name),
              crest: `https://images.fotmob.com/image_resources/logo/teamlogo/${m.home.id}_small.png`,
              score: m.home.score ?? null,
            },
            away: {
              name: m.away.name, name_ar: ar(m.away.name),
              crest: `https://images.fotmob.com/image_resources/logo/teamlogo/${m.away.id}_small.png`,
              score: m.away.score ?? null,
            },
          })
        }
      }
    }
    // de-dupe by id
    const seen = new Set<string>()
    const unique = all.filter((m) => (seen.has(m.id) ? false : (seen.add(m.id), true)))
    return unique.length > 0 ? unique : null
  } catch {
    return null
  }
}

export async function GET() {
  if (cache && Date.now() - cache.ts < TTL_MS) {
    return NextResponse.json(cache.payload, {
      headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' },
    })
  }

  let matches = await fromFootballData()
  let source = 'football-data.org'
  if (!matches || matches.length === 0) {
    matches = await fromESPN()
    source = 'espn'
  }
  if (!matches || matches.length === 0) {
    matches = await fromFotmob()
    source = 'fotmob'
  }

  const payload = {
    ok: !!(matches && matches.length > 0),
    source: matches && matches.length > 0 ? source : null,
    updated_at: new Date().toISOString(),
    matches: (matches || []).sort((a, b) => a.utc_date.localeCompare(b.utc_date)),
  }

  cache = { ts: Date.now(), payload }
  return NextResponse.json(payload, {
    headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' },
  })
}
