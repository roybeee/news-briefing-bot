import type { NewsArticle, Keyword } from '../types/index.js'
import type { AppConfig, Logger } from '../config/index.js'
import { fetchNaverNews } from './naverClient.js'
import { fetchNewsdataNews } from './newsdataClient.js'
import { deduplicateArticles } from './deduplicator.js'

interface FetchResult {
  readonly keyword: string
  readonly korean: readonly NewsArticle[]
  readonly foreign: readonly NewsArticle[]
}

async function fetchForKeyword(
  keyword: Keyword,
  config: AppConfig,
  logger: Logger,
): Promise<FetchResult> {
  const [naverResult, newsdataResult] = await Promise.allSettled([
    fetchNaverNews(
      keyword.term,
      { clientId: config.NAVER_CLIENT_ID, clientSecret: config.NAVER_CLIENT_SECRET },
      logger,
      config.MAX_ARTICLES_PER_KEYWORD,
    ),
    fetchNewsdataNews(
      keyword.term,
      { apiKey: config.NEWSDATA_API_KEY },
      logger,
      config.MAX_ARTICLES_PER_KEYWORD,
    ),
  ])

  const korean: NewsArticle[] = naverResult.status === 'fulfilled' ? [...naverResult.value] : []
  const foreign: NewsArticle[] = newsdataResult.status === 'fulfilled' ? [...newsdataResult.value] : []

  if (naverResult.status === 'rejected') {
    logger.warn('fetch', `Naver failed for "${keyword.term}": ${naverResult.reason}`)
  }
  if (newsdataResult.status === 'rejected') {
    logger.warn('fetch', `NewsData.io failed for "${keyword.term}": ${newsdataResult.reason}`)
  }

  return {
    keyword: keyword.term,
    korean: deduplicateArticles(korean),
    foreign: deduplicateArticles(foreign),
  }
}

export async function fetchAllNews(
  keywords: readonly Keyword[],
  config: AppConfig,
  logger: Logger,
): Promise<readonly FetchResult[]> {
  logger.info('fetch', `Fetching news for ${keywords.length} keywords`)

  const results = await Promise.allSettled(
    keywords.map((kw) => fetchForKeyword(kw, config, logger)),
  )

  const successful: FetchResult[] = []

  for (const result of results) {
    if (result.status === 'fulfilled') {
      successful.push(result.value)
    } else {
      logger.error('fetch', `Keyword fetch failed: ${result.reason}`)
    }
  }

  if (successful.length === 0) {
    throw new Error('All keyword fetches failed — no news collected')
  }

  const totalKorean = successful.reduce((sum, r) => sum + r.korean.length, 0)
  const totalForeign = successful.reduce((sum, r) => sum + r.foreign.length, 0)

  logger.info('fetch', `Total collected: ${totalKorean} Korean + ${totalForeign} foreign articles`)

  return successful
}

export type { FetchResult }
