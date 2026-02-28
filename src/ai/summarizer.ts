import type Anthropic from '@anthropic-ai/sdk'
import type { NewsArticle, ArticleSummary } from '../types/index.js'
import type { Logger } from '../config/index.js'
import { callClaude } from './claudeClient.js'

const SYSTEM_PROMPT = `당신은 뉴스 브리핑 전문 에디터입니다.
주어진 뉴스 기사들을 읽고 각 기사에 대해 아래 JSON 형식으로 응답하세요.
독자는 바쁜 직장인이므로 핵심만 간결하게 작성합니다.
반드시 유효한 JSON 배열만 출력하세요. 다른 텍스트는 포함하지 마세요.

출력 형식:
[
  {
    "articleId": "기사 고유 ID",
    "koreanTitle": "원문 제목 그대로",
    "summary": "3-4문장 핵심 요약. 육하원칙 기준.",
    "keyPoints": ["핵심 포인트1", "핵심 포인트2"],
    "sentiment": "positive|neutral|negative"
  }
]`

function buildUserPrompt(articles: readonly NewsArticle[]): string {
  const articleTexts = articles.map(
    (a) => `[ID: ${a.id}]\n제목: ${a.title}\n내용: ${a.description}`,
  )
  return `다음 ${articles.length}개의 뉴스 기사를 요약하세요:\n\n${articleTexts.join('\n---\n')}`
}

interface RawSummary {
  articleId: string
  koreanTitle: string
  summary: string
  keyPoints: string[]
  sentiment: 'positive' | 'neutral' | 'negative'
}

function parseResponse(text: string): readonly RawSummary[] {
  const jsonMatch = text.match(/\[[\s\S]*\]/)
  if (!jsonMatch) {
    throw new Error('No JSON array found in response')
  }
  return JSON.parse(jsonMatch[0])
}

export async function summarizeKoreanArticles(
  client: Anthropic,
  articles: readonly NewsArticle[],
  logger: Logger,
): Promise<readonly ArticleSummary[]> {
  if (articles.length === 0) return []

  logger.info('ai', `Summarizing ${articles.length} Korean articles`)

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
    logger.error('ai', `Failed to parse Korean summary response: ${error}`)
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
