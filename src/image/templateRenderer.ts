import Handlebars from 'handlebars'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { KeywordBriefing } from '../types/index.js'

Handlebars.registerHelper('eq', (a: unknown, b: unknown) => a === b)

const TEMPLATE_PATH = resolve(import.meta.dirname, 'templates/briefing.html')

export function renderBriefingHtml(
  date: string,
  keywords: readonly KeywordBriefing[],
): string {
  const templateSource = readFileSync(TEMPLATE_PATH, 'utf-8')
  const template = Handlebars.compile(templateSource)

  const hasArticles = keywords.some(
    (k) => k.koreanArticles.length > 0 || k.foreignArticles.length > 0,
  )

  const now = new Date()
  const shortDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

  return template({
    date,
    keywords,
    hasArticles,
    shortDate,
  })
}
