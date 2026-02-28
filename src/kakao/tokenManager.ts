import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import type { KakaoTokenCache } from '../types/index.js'
import type { Logger } from '../config/index.js'

const TOKEN_PATH = resolve(import.meta.dirname, '../../data/kakao_token.json')

interface TokenRefreshResponse {
  access_token: string
  token_type: string
  expires_in: number
  refresh_token?: string
  refresh_token_expires_in?: number
}

function loadTokenCache(): KakaoTokenCache | null {
  if (!existsSync(TOKEN_PATH)) return null

  try {
    const raw = readFileSync(TOKEN_PATH, 'utf-8')
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function saveTokenCache(cache: KakaoTokenCache): void {
  writeFileSync(TOKEN_PATH, JSON.stringify(cache, null, 2) + '\n', { encoding: 'utf-8', mode: 0o600 })
}

export async function getAccessToken(
  restApiKey: string,
  refreshToken: string,
  logger: Logger,
): Promise<{ accessToken: string; newRefreshToken: string | null }> {
  const cached = loadTokenCache()
  const now = Date.now()
  const FIVE_MINUTES = 5 * 60 * 1000

  if (cached && cached.expiresAt - FIVE_MINUTES > now) {
    logger.debug('kakao', 'Using cached access token')
    return { accessToken: cached.accessToken, newRefreshToken: null }
  }

  logger.info('kakao', 'Refreshing access token')

  const response = await fetch('https://kauth.kakao.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: restApiKey,
      refresh_token: refreshToken,
    }),
    signal: AbortSignal.timeout(30_000),
  })

  if (!response.ok) {
    throw new Error(`Kakao token refresh failed: ${response.status}`)
  }

  const data: TokenRefreshResponse = await response.json()

  const newCache: KakaoTokenCache = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? refreshToken,
    expiresAt: now + data.expires_in * 1000,
    refreshTokenExpiresAt: data.refresh_token_expires_in
      ? now + data.refresh_token_expires_in * 1000
      : cached?.refreshTokenExpiresAt ?? now + 60 * 24 * 60 * 60 * 1000,
  }

  saveTokenCache(newCache)

  const newRefreshToken = data.refresh_token ?? null

  if (newRefreshToken) {
    logger.info('kakao', 'New refresh token received — update GitHub Secrets')
  }

  const daysUntilRefreshExpiry = Math.floor(
    (newCache.refreshTokenExpiresAt - now) / (24 * 60 * 60 * 1000),
  )
  if (daysUntilRefreshExpiry < 30) {
    logger.warn('kakao', `Refresh token expires in ${daysUntilRefreshExpiry} days!`)
  }

  return { accessToken: data.access_token, newRefreshToken }
}
