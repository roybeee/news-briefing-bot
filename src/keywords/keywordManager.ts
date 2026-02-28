import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { randomUUID } from 'node:crypto'
import type { Keyword, KeywordsData } from '../types/index.js'

const KEYWORDS_PATH = resolve(import.meta.dirname, '../../data/keywords.json')

export function loadKeywords(): readonly Keyword[] {
  try {
    const raw = readFileSync(KEYWORDS_PATH, 'utf-8')
    const data: KeywordsData = JSON.parse(raw)
    return data.keywords ?? []
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    throw new Error(`Failed to load keywords: ${msg}`)
  }
}

export function addKeyword(term: string, category: string): Keyword {
  const keywords = [...loadKeywords()]
  const exists = keywords.find((k) => k.term === term)
  if (exists) {
    throw new Error(`Keyword "${term}" already exists (id: ${exists.id})`)
  }

  const newKeyword: Keyword = {
    id: randomUUID().slice(0, 8),
    term,
    category,
  }

  const updated: KeywordsData = {
    keywords: [...keywords, newKeyword],
  }

  writeFileSync(KEYWORDS_PATH, JSON.stringify(updated, null, 2) + '\n', 'utf-8')
  return newKeyword
}

export function removeKeyword(term: string): Keyword {
  const keywords = [...loadKeywords()]
  const index = keywords.findIndex((k) => k.term === term)
  if (index === -1) {
    throw new Error(`Keyword "${term}" not found`)
  }

  const removed = keywords[index]!
  const updated: KeywordsData = {
    keywords: keywords.filter((_, i) => i !== index),
  }

  writeFileSync(KEYWORDS_PATH, JSON.stringify(updated, null, 2) + '\n', 'utf-8')
  return removed
}
