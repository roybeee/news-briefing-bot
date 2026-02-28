import type { KeywordBriefing, KakaoFeedMessage } from '../types/index.js'
import type { Logger } from '../config/index.js'

export function buildFeedMessage(
  date: string,
  keywords: readonly KeywordBriefing[],
  imageUrl: string | null,
): KakaoFeedMessage {
  const totalCount = keywords.reduce(
    (sum, k) => sum + k.koreanArticles.length + k.foreignArticles.length,
    0,
  )

  const keywordNames = keywords.map((k) => k.keyword).join(' / ')

  const allArticles = keywords.flatMap((k) => [...k.koreanArticles, ...k.foreignArticles])
  const firstUrl = allArticles[0]?.url ?? 'https://news.naver.com'

  const summaryLines = allArticles
    .slice(0, 5)
    .map((a) => `- ${a.koreanTitle}`)
    .join('\n')

  const linkTarget = imageUrl ?? firstUrl

  return {
    object_type: 'feed',
    content: {
      title: `오늘의 뉴스 브리핑 — ${date}`,
      description: `${keywordNames} 등 ${totalCount}건\n\n${summaryLines}`,
      image_url: imageUrl ?? 'https://via.placeholder.com/800x1200.png?text=News+Briefing',
      image_width: 800,
      image_height: 1200,
      link: {
        web_url: firstUrl,
        mobile_web_url: firstUrl,
      },
    },
    buttons: [
      {
        title: imageUrl ? '브리핑 이미지 보기' : '기사 원문 보기',
        link: {
          web_url: linkTarget,
          mobile_web_url: linkTarget,
        },
      },
    ],
  }
}

export async function sendKakaoMessage(
  accessToken: string,
  message: KakaoFeedMessage,
  logger: Logger,
  dryRun: boolean = false,
): Promise<void> {
  if (dryRun) {
    logger.info('send', 'DRY_RUN: Skipping Kakao message send')
    logger.debug('send', 'Message payload:', { payload: JSON.stringify(message, null, 2) })
    return
  }

  logger.info('send', 'Sending KakaoTalk message')

  const response = await fetch('https://kapi.kakao.com/v2/api/talk/memo/default/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
      Authorization: `Bearer ${accessToken}`,
    },
    body: `template_object=${encodeURIComponent(JSON.stringify(message))}`,
    signal: AbortSignal.timeout(30_000),
  })

  if (!response.ok) {
    const errorBody = await response.text()
    // Truncate to avoid leaking large/sensitive response bodies in logs
    const truncated = errorBody.slice(0, 200)
    throw new Error(`Kakao message send failed: ${response.status} — ${truncated}`)
  }

  const result = await response.json()
  logger.info('send', `Kakao message sent successfully`, { result_code: result.result_code })
}
