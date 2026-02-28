import type { NaverNewsItem, NaverNewsResponse, NewsArticle } from '../types/index.js'
import type { Logger } from '../config/index.js'
import { makeArticleId } from './articleUtils.js'

function stripHtml(text: string): string {
  return text
    .replace(/<[^>]*>/g, '')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&apos;/g, "'")
    .trim()
}

function toNewsArticle(item: NaverNewsItem, keyword: string): NewsArticle {
  return {
    id: makeArticleId(item.title, 'naver'),
    source: 'naver',
    title: stripHtml(item.title),
    description: stripHtml(item.description),
    url: item.originallink || item.link,
    publishedAt: new Date(item.pubDate),
    language: 'ko',
    keyword,
  }
}

function isWithin24Hours(pubDate: string): boolean {
  const published = new Date(pubDate)
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000)
  return published >= cutoff
}

export async function fetchNaverNews(
  keyword: string,
  config: { clientId: string; clientSecret: string },
  logger: Logger,
  maxArticles: number = 10,
): Promise<readonly NewsArticle[]> {
  const url = new URL('https://openapi.naver.com/v1/search/news.json')
  url.searchParams.set('query', keyword)
  url.searchParams.set('display', '100')
  url.searchParams.set('sort', 'date')

  logger.debug('fetch', `Naver API request for "${keyword}"`)

  const response = await fetch(url.toString(), {
    headers: {
      'X-Naver-Client-Id': config.clientId,
      'X-Naver-Client-Secret': config.clientSecret,
    },
    signal: AbortSignal.timeout(30_000),
  })

  if (!response.ok) {
    throw new Error(`Naver API error: ${response.status} ${response.statusText}`)
  }

  const data: NaverNewsResponse = await response.json()

  const recentArticles = data.items
    .filter((item) => isWithin24Hours(item.pubDate))
    .slice(0, maxArticles)
    .map((item) => toNewsArticle(item, keyword))

  logger.info('fetch', `Naver: ${recentArticles.length} articles for "${keyword}"`, {
    total: data.total,
    filtered: recentArticles.length,
  })

  return recentArticles
}
