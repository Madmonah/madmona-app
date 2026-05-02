import { NextResponse } from 'next/server'

// ============================================================================
// GET /api/financial-data
//
// Returns live financial data:
//   - Exchange rates: USD, EUR, GBP, SAR vs EGP
//   - Gold prices: 24K, 21K, 18K per gram in EGP
//
// Cached for 5 minutes to avoid hammering free APIs.
// ============================================================================

export const revalidate = 300 // 5 minutes

interface CurrencyRate {
  code: string
  name_ar: string
  flag: string
  rate: number  // 1 unit of this currency = X EGP
}

interface GoldPrice {
  karat: number
  price_per_gram_egp: number
  label: string
}

interface FinancialData {
  currencies: CurrencyRate[]
  gold: GoldPrice[]
  updated_at: string
}

let cache: { data: FinancialData; timestamp: number } | null = null
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

// Fallback values (used if APIs fail) — updated periodically as defaults
const FALLBACK_RATES = {
  USD: 49.5,
  EUR: 53.0,
  GBP: 62.0,
  SAR: 13.2,
}
const FALLBACK_GOLD_USD_PER_OZ = 2700 // approx Oct 2025 levels

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

async function fetchExchangeRates(): Promise<Record<string, number>> {
  // Try primary: open.er-api.com (free, reliable, no key needed)
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/USD', {
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(6000),
    })
    if (res.ok) {
      const data = await res.json()
      if (data.result === 'success' && data.rates) {
        const usdToEgp = data.rates.EGP
        return {
          USD: usdToEgp,
          EUR: usdToEgp / data.rates.EUR,
          GBP: usdToEgp / data.rates.GBP,
          SAR: usdToEgp / data.rates.SAR,
        }
      }
    }
  } catch (e) {
    console.error('[financial-data] open.er-api.com failed:', e)
  }

  // Fallback: try exchangerate.host
  try {
    const res = await fetch('https://api.exchangerate-api.com/v4/latest/USD', {
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(6000),
    })
    if (res.ok) {
      const data = await res.json()
      if (data.rates) {
        const usdToEgp = data.rates.EGP
        return {
          USD: usdToEgp,
          EUR: usdToEgp / data.rates.EUR,
          GBP: usdToEgp / data.rates.GBP,
          SAR: usdToEgp / data.rates.SAR,
        }
      }
    }
  } catch (e) {
    console.error('[financial-data] exchangerate-api.com failed:', e)
  }

  // Final fallback — return default values
  return FALLBACK_RATES
}

async function fetchGoldSpotUSD(): Promise<number> {
  // Try gold-api.com (free public)
  try {
    const res = await fetch('https://api.gold-api.com/price/XAU', {
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(6000),
    })
    if (res.ok) {
      const data = await res.json()
      if (typeof data.price === 'number' && data.price > 0) {
        return data.price // USD per troy ounce
      }
    }
  } catch (e) {
    console.error('[financial-data] gold-api.com failed:', e)
  }

  // Fallback: try metals.live
  try {
    const res = await fetch('https://api.metals.live/v1/spot/gold', {
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(6000),
    })
    if (res.ok) {
      const data = await res.json()
      if (Array.isArray(data) && data[0]?.price) {
        return data[0].price
      }
    }
  } catch (e) {
    console.error('[financial-data] metals.live failed:', e)
  }

  return FALLBACK_GOLD_USD_PER_OZ
}

function calculateGoldPricesEGP(spotUsdPerOz: number, usdToEgp: number): GoldPrice[] {
  // 1 troy ounce = 31.1035 grams
  const pricePerGramUsd = spotUsdPerOz / 31.1035
  const pricePerGramEgp24K = pricePerGramUsd * usdToEgp
  // Egypt market premium ~5-8% on top of spot for retail
  const retailMultiplier = 1.06

  return [
    {
      karat: 24,
      label: 'عيار 24',
      price_per_gram_egp: Math.round(pricePerGramEgp24K * retailMultiplier),
    },
    {
      karat: 21,
      label: 'عيار 21',
      price_per_gram_egp: Math.round(pricePerGramEgp24K * (21 / 24) * retailMultiplier),
    },
    {
      karat: 18,
      label: 'عيار 18',
      price_per_gram_egp: Math.round(pricePerGramEgp24K * (18 / 24) * retailMultiplier),
    },
  ]
}

// ----------------------------------------------------------------------------
// Handler
// ----------------------------------------------------------------------------

export async function GET() {
  // Check cache
  if (cache && Date.now() - cache.timestamp < CACHE_TTL) {
    return NextResponse.json({
      ok: true,
      ...cache.data,
      cached: true,
    })
  }

  // Fetch in parallel
  const [rates, goldUsd] = await Promise.all([
    fetchExchangeRates(),
    fetchGoldSpotUSD(),
  ])

  const currencies: CurrencyRate[] = [
    { code: 'USD', name_ar: 'دولار', flag: '🇺🇸', rate: rates.USD },
    { code: 'EUR', name_ar: 'يورو', flag: '🇪🇺', rate: rates.EUR },
    { code: 'GBP', name_ar: 'استرليني', flag: '🇬🇧', rate: rates.GBP },
    { code: 'SAR', name_ar: 'ريال', flag: '🇸🇦', rate: rates.SAR },
  ]

  const gold = calculateGoldPricesEGP(goldUsd, rates.USD)

  const data: FinancialData = {
    currencies,
    gold,
    updated_at: new Date().toISOString(),
  }

  cache = { data, timestamp: Date.now() }

  return NextResponse.json({
    ok: true,
    ...data,
    cached: false,
  })
}
