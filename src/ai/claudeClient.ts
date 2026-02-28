import Anthropic from '@anthropic-ai/sdk'
import type { Logger } from '../config/index.js'

const CLAUDE_MODEL = 'claude-haiku-4-5-20251001'

export function createClaudeClient(apiKey: string): Anthropic {
  return new Anthropic({ apiKey })
}

export async function callClaude(
  client: Anthropic,
  systemPrompt: string,
  userPrompt: string,
  logger: Logger,
  maxRetries: number = 2,
): Promise<string> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await client.messages.create({
        model: CLAUDE_MODEL,
        max_tokens: 4096,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      })

      const textBlock = response.content.find((block) => block.type === 'text')
      if (!textBlock || textBlock.type !== 'text') {
        throw new Error('No text content in Claude response')
      }

      return textBlock.text
    } catch (error) {
      const isLastAttempt = attempt === maxRetries
      const errorMsg = error instanceof Error ? error.message : String(error)
      logger.warn('ai', `Claude API attempt ${attempt + 1} failed: ${errorMsg}`)

      if (isLastAttempt) {
        throw error
      }

      await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)))
    }
  }

  throw new Error('Unreachable')
}
