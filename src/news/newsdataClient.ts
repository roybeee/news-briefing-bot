import type { NewsdataArticle, NewsdataResponse, NewsArticle } from '../types/index.js'
import type { Logger } from '../config/index.js'
import { makeArticleId } from './articleUtils.js'

function toNewsArticle(item: NewsdataArticle, keyword: string): NewsArticle {
  return {
    id: makeArticleId(item.title, 'newsdata'),
    source: 'newsdata',
    title: item.title,
    description: item.description ?? item.title,
    url: item.link,
    publishedAt: new Date(item.pubDate),
    language: item.language,
    keyword,
    imageUrl: item.image_url ?? undefined,
  }
}

function isWithin24Hours(pubDate: string): boolean {
  const published = new Date(pubDate)
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000)
  return published >= cutoff
}

export async function fetchNewsdataNews(
  keyword: string,
  config: { apiKey: string },
  logger: Logger,
  maxArticles: number = 10,
): Promise<readonly NewsArticle[]> {
  const url = new URL('https://newsdata.io/api/1/news')
  url.searchParams.set('apikey', config.apiKey)
  url.searchParams.set('q', keyword)
  url.searchParams.set('language', 'en,ja')
  url.searchParams.set('size', String(maxArticles))

  logger.debug('fetch', `NewsData.io API request for "${keyword}"`)

  const response = await fetch(url.toString(), {
    signal: AbortSignal.timeout(30_000),
  })

  if (!response.ok) {
    throw new Error(`NewsData.io API error: ${response.status} ${response.statusText}`)
  }

  const data: NewsdataResponse = await response.json()

  if (data.status !== 'success') {
    throw new Error(`NewsData.io API returned status: ${data.status}`)
  }

  const articles = (data.results ?? [])
    .filter((item) => isWithin24Hours(item.pubDate))
    .map((item) => toNewsArticle(item, keyword))

  logger.info('fetch', `NewsData.io: ${articles.length} articles for "${keyword}"`, {
    total: data.totalResults,
    filtered: articles.length,
  })

  return articles
}
