import { loadConfig, createLogger } from './config/index.js'
import { loadKeywords } from './keywords/keywordManager.js'
import { fetchAllNews } from './news/fetcher.js'
import { createClaudeClient } from './ai/claudeClient.js'
import { summarizeKoreanArticles } from './ai/summarizer.js'
import { translateAndSummarizeForeignArticles } from './ai/translator.js'
import { generateBriefingImage } from './image/imageGenerator.js'
import { uploadToR2 } from './storage/r2Uploader.js'
import { getAccessToken } from './kakao/tokenManager.js'
import { buildFeedMessage, sendKakaoMessage } from './kakao/messageSender.js'
import type { KeywordBriefing } from './types/index.js'

function getKstDateString(): string {
  const now = new Date()
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000)
  const year = kst.getUTCFullYear()
  const month = kst.getUTCMonth() + 1
  const day = kst.getUTCDate()

  const weekdays = ['일', '월', '화', '수', '목', '금', '토']
  const weekday = weekdays[kst.getUTCDay()]

  return `${year}년 ${month}월 ${day}일 ${weekday}요일`
}

function getKstDateKey(): string {
  const now = new Date()
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000)
  return kst.toISOString().split('T')[0]!
}

async function main() {
  const config = loadConfig()
  const logger = createLogger(config.LOG_LEVEL)

  logger.info('main', 'News briefing pipeline started', { dryRun: config.DRY_RUN })

  // 1. Load keywords
  const keywords = loadKeywords()
  if (keywords.length === 0) {
    logger.warn('main', 'No keywords registered. Exiting.')
    return
  }
  logger.info('main', `Loaded ${keywords.length} keywords`)

  // 2. Fetch news
  const fetchResults = await fetchAllNews(keywords, config, logger)

  // 3. AI summarize / translate
  const claude = createClaudeClient(config.ANTHROPIC_API_KEY)

  const keywordBriefings: KeywordBriefing[] = []

  for (const result of fetchResults) {
    const [koreanSummaries, foreignSummaries] = await Promise.all([
      summarizeKoreanArticles(claude, result.korean, logger),
      translateAndSummarizeForeignArticles(claude, result.foreign, logger),
    ])

    keywordBriefings.push({
      keyword: result.keyword,
      koreanArticles: koreanSummaries,
      foreignArticles: foreignSummaries,
    })
  }

  const totalArticles = keywordBriefings.reduce(
    (sum, kb) => sum + kb.koreanArticles.length + kb.foreignArticles.length,
    0,
  )

  if (totalArticles === 0) {
    logger.info('main', 'No articles found for any keyword')
  }

  // 4. Generate image
  const dateString = getKstDateString()
  const dateKey = getKstDateKey()

  let imageUrl: string | null = null

  try {
    const imageBuffer = await generateBriefingImage(dateString, keywordBriefings, logger)

    if (config.DRY_RUN) {
      const { writeFileSync } = await import('node:fs')
      const { resolve } = await import('node:path')
      writeFileSync(resolve(import.meta.dirname, `../briefing-${dateKey}.png`), imageBuffer)
      logger.info('main', `DRY_RUN: Image saved locally as briefing-${dateKey}.png`)
      imageUrl = `https://example.com/briefings/${dateKey}.png`
    } else {
      // 5. Upload to R2
      imageUrl = await uploadToR2(
        imageBuffer,
        dateKey,
        {
          accountId: config.CF_ACCOUNT_ID,
          accessKeyId: config.R2_ACCESS_KEY_ID,
          secretAccessKey: config.R2_SECRET_ACCESS_KEY,
          bucketName: config.R2_BUCKET_NAME,
          publicBaseUrl: config.R2_PUBLIC_BASE_URL,
        },
        logger,
      )
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    logger.error('main', `Image generation/upload failed: ${msg}`)
    logger.warn('main', 'Proceeding with text-only message')
  }

  // 6. Send KakaoTalk message
  const { accessToken, newRefreshToken } = await getAccessToken(
    config.KAKAO_REST_API_KEY,
    config.KAKAO_REFRESH_TOKEN,
    logger,
  )

  const message = buildFeedMessage(dateString, keywordBriefings, imageUrl)
  await sendKakaoMessage(accessToken, message, logger, config.DRY_RUN)

  // 7. Export new refresh token for GitHub Actions via GITHUB_ENV
  if (newRefreshToken && process.env.GITHUB_ENV) {
    const { appendFileSync } = await import('node:fs')
    appendFileSync(process.env.GITHUB_ENV, `NEW_REFRESH_TOKEN=${newRefreshToken}\n`)
  }

  logger.info('main', 'Pipeline completed successfully', {
    totalArticles,
    keywords: keywordBriefings.length,
    imageUrl: imageUrl ? 'uploaded' : 'skipped',
  })
}

main().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})
