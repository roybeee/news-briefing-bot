import { createHash } from 'node:crypto'

export function makeArticleId(title: string, source: string): string {
  const normalized = title.toLowerCase().replace(/\s+/g, ' ').trim()
  return createHash('sha256').update(`${normalized}:${source}`).digest('hex').slice(0, 16)
}
