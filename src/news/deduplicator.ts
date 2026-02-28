import type { NewsArticle } from '../types/index.js'

function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url)
    parsed.search = ''
    parsed.hash = ''
    return parsed.toString()
  } catch {
    return url
  }
}

function normalizeTitle(title: string): string {
  return title.toLowerCase().replace(/\s+/g, ' ').trim()
}

export function deduplicateArticles(articles: readonly NewsArticle[]): readonly NewsArticle[] {
  const seenUrls = new Set<string>()
  const seenTitles = new Set<string>()
  const result: NewsArticle[] = []

  const sorted = [...articles].sort((a, b) => {
    if (a.source === 'naver' && b.source !== 'naver') return -1
    if (a.source !== 'naver' && b.source === 'naver') return 1
    return b.publishedAt.getTime() - a.publishedAt.getTime()
  })

  for (const article of sorted) {
    const normalizedUrl = normalizeUrl(article.url)
    const normalizedTitle = normalizeTitle(article.title)

    if (seenUrls.has(normalizedUrl) || seenTitles.has(normalizedTitle)) {
      continue
    }

    seenUrls.add(normalizedUrl)
    seenTitles.add(normalizedTitle)
    result.push(article)
  }

  return result
}
