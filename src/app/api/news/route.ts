import { NextResponse } from 'next/server'
import { serverLog } from '@/lib/server-logger'

/**
 * Finnhub Market News API
 * https://finnhub.io/docs/api/market-news
 *
 * Rate Limits: 30 calls/second max
 * Free plan: 60 calls/minute
 * Revalidate every 10 minutes to stay safe
 */
interface FinnhubNewsItem {
  category: string
  datetime: number // Unix timestamp
  headline: string
  id: number
  image: string
  related: string // Stock symbols
  source: string
  summary: string
  url: string
}

interface NextRequestInit extends RequestInit {
  next?: {
    revalidate?: number | false
    tags?: string[]
  }
}

async function fetchFinnhubNews(): Promise<
  { id: number; date: string; time: string; title: string; code: string; url: string }[]
> {
  const apiKey = process.env.FINNHUB_API_KEY

  if (!apiKey) {
    serverLog.warn('FINNHUB_API_KEY not configured', 'NEWS')
    return []
  }

  try {
    serverLog.info('Fetching market news from Finnhub...', 'NEWS')
    const response = await fetch(
      `https://finnhub.io/api/v1/news?category=general&token=${apiKey}`,
      { next: { revalidate: 60 } } as NextRequestInit // Cache for 1 minute (Fast refresh while staying safe)
    )

    if (!response.ok) {
      serverLog.error(`Finnhub API Error: ${response.status}`, 'NEWS')
      return []
    }

    const data: FinnhubNewsItem[] = await response.json()
    serverLog.success(`Loaded ${data.length} news articles`, 'NEWS')

    return data.slice(0, 50).map((item) => {
      const date = new Date(item.datetime * 1000)
      return {
        id: item.id,
        date: date.toISOString().slice(0, 10).replace(/-/g, ''),
        time: date.toTimeString().slice(0, 8).replace(/:/g, ''),
        title: item.headline,
        code: item.related?.split(',')[0] || '',
        url: item.url, // Include URL for click-through
      }
    })
  } catch (error) {
    serverLog.error(`Finnhub Fetch Error: ${error}`, 'NEWS')
    return []
  }
}

/**
 * GET /api/news
 * Finnhub 마켓 뉴스 조회 (10분 캐시)
 */
export async function GET() {
  const news = await fetchFinnhubNews()

  return NextResponse.json({
    success: true,
    data: news,
    source: news.length > 0 ? 'finnhub' : 'empty',
  })
}
