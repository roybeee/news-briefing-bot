export type NewsSource = 'naver' | 'newsdata'

export interface NewsArticle {
  readonly id: string
  readonly source: NewsSource
  readonly title: string
  readonly description: string
  readonly url: string
  readonly publishedAt: Date
  readonly language: string
  readonly keyword: string
  readonly imageUrl?: string
}

export interface NaverNewsItem {
  readonly title: string
  readonly originallink: string
  readonly link: string
  readonly description: string
  readonly pubDate: string
}

export interface NaverNewsResponse {
  readonly lastBuildDate: string
  readonly total: number
  readonly start: number
  readonly display: number
  readonly items: readonly NaverNewsItem[]
}

export interface NewsdataArticle {
  readonly article_id: string
  readonly title: string
  readonly link: string
  readonly description: string | null
  readonly pubDate: string
  readonly language: string
  readonly image_url: string | null
  readonly source_name: string
}

export interface NewsdataResponse {
  readonly status: string
  readonly totalResults: number
  readonly results: readonly NewsdataArticle[]
  readonly nextPage?: string
}

export interface ArticleSummary {
  readonly articleId: string
  readonly originalTitle: string
  readonly koreanTitle: string
  readonly summary: string
  readonly keyPoints: readonly string[]
  readonly sentiment: 'positive' | 'neutral' | 'negative'
  readonly source: NewsSource
  readonly url: string
}

export interface KeywordBriefing {
  readonly keyword: string
  readonly koreanArticles: readonly ArticleSummary[]
  readonly foreignArticles: readonly ArticleSummary[]
}

export interface BriefingResult {
  readonly date: string
  readonly keywords: readonly KeywordBriefing[]
  readonly totalArticleCount: number
  readonly imageUrl: string
}

export interface Keyword {
  readonly id: string
  readonly term: string
  readonly category: string
}

export interface KeywordsData {
  readonly keywords: readonly Keyword[]
}

export interface KakaoTokenCache {
  readonly accessToken: string
  readonly refreshToken: string
  readonly expiresAt: number
  readonly refreshTokenExpiresAt: number
}

export interface KakaoFeedContent {
  readonly title: string
  readonly description: string
  readonly image_url: string
  readonly image_width: number
  readonly image_height: number
  readonly link: {
    readonly web_url: string
    readonly mobile_web_url: string
  }
}

export interface KakaoFeedMessage {
  readonly object_type: 'feed'
  readonly content: KakaoFeedContent
  readonly buttons: readonly {
    readonly title: string
    readonly link: {
      readonly web_url: string
      readonly mobile_web_url: string
    }
  }[]
}
