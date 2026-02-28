import nodeHtmlToImage from 'node-html-to-image'
import type { KeywordBriefing } from '../types/index.js'
import type { Logger } from '../config/index.js'
import { renderBriefingHtml } from './templateRenderer.js'

export async function generateBriefingImage(
  date: string,
  keywords: readonly KeywordBriefing[],
  logger: Logger,
): Promise<Buffer> {
  logger.info('image', 'Generating briefing image')

  const html = renderBriefingHtml(date, keywords)

  const image = await nodeHtmlToImage({
    html,
    quality: 90,
    type: 'png',
    puppeteerArgs: {
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    },
  })

  if (!Buffer.isBuffer(image)) {
    throw new Error('Image generation did not return a Buffer')
  }

  logger.info('image', `Image generated: ${image.length} bytes`)
  return image
}
