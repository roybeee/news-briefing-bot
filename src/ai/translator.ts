import type Anthropic from '@anthropic-ai/sdk'
import type { NewsArticle, ArticleSummary } from '../types/index.js'
import type { Logger } from '../config/index.js'
import { callClaude } from './claudeClient.js'

const SYSTEM_PROMPT = `당신은 글로벌 뉴스 번역·요약 전문가입니다.
영어(또는 타 언어) 기사를 읽고 한국어로 번역하여 요약합니다.
번역은 자연스러운 한국어로, 요약은 핵심 정보 위주로 작성합니다.
반드시 유효한 JSON 배열만 출력하세요. 다른 텍스트는 포함하지 마세요.

출력 형식:
[
  {
    "articleId": "기사 고유 ID",
    "koreanTitle": "한국어로 자연스럽게 번역한 제목",
    "summary": "한국어 3-4문장 요약. 원문의 핵심 정보 포함.",
    "keyPoints": ["핵심 포인트1", "핵심 포인트2"],
    "sentiment": "positive|neutral|negative"
  }
]`

function buildUserPrompt(articles: readonly NewsArticle[]): string {
  const articleTexts = articles.map(
    (a) =>
      `[ID: ${a.id}] (원문 언어: ${a.language})\n제목: ${a.title}\n내용: ${a.description}`,
  )
  return `다음 ${articles.length}개의 해외 뉴스 기사를 번역하고 요약하세요:\n\n${articleTexts.join('\n---\n')}`
}

interface RawTranslation {
  articleId: string
  koreanTitle: string
  summary: string
  keyPoints: string[]
  sentiment: 'positive' | 'neutral' | 'negative'
}

function parseResponse(text: string): readonly RawTranslation[] {
  const jsonMatch = text.match(/\[[\s\S]*\]/)
  if (!jsonMatch) {
    throw new Error('No JSON array found in response')
  }
  return JSON.parse(jsonMatch[0])
}

export async function translateAndSummarizeForeignArticles(
  client: Anthropic,
  articles: readonly NewsArticle[],
  logger: Logger,
): Promise<readonly ArticleSummary[]> {
  if (articles.length === 0) return []

  logger.info('ai', `Translating and summarizing ${articles.length} foreign articles`)

  const responseText = await callClaude(client, SYSTEM_PROMPT, buildUserPrompt(articles), logger)

  try {
    const parsed = parseResponse(responseText)
    const articleMap = new Map(articles.map((a) => [a.id, a]))

    return parsed
      .map((raw): ArticleSummary | null => {
        const original = articleMap.get(raw.articleId)
        if (!original) return null

        return {
          articleId: raw.articleId,
          originalTitle: original.title,
          koreanTitle: raw.koreanTitle,
          summary: raw.summary,
          keyPoints: raw.keyPoints,
          sentiment: raw.sentiment,
          source: original.source,
          url: original.url,
        }
      })
      .filter((s): s is ArticleSummary => s !== null)
  } catch (error) {
    logger.error('ai', `Failed to parse translation response: ${error}`)
    return articles.map((a) => ({
      articleId: a.id,
      originalTitle: a.title,
      koreanTitle: a.title,
      summary: a.description,
      keyPoints: [],
      sentiment: 'neutral' as const,
      source: a.source,
      url: a.url,
    }))
  }
}
