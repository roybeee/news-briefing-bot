import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import type { Logger } from '../config/index.js'

interface R2Config {
  readonly accountId: string
  readonly accessKeyId: string
  readonly secretAccessKey: string
  readonly bucketName: string
  readonly publicBaseUrl: string
}

function createR2Client(config: R2Config): S3Client {
  return new S3Client({
    region: 'auto',
    endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  })
}

export async function uploadToR2(
  imageBuffer: Buffer,
  dateKey: string,
  config: R2Config,
  logger: Logger,
  maxRetries: number = 3,
): Promise<string> {
  const client = createR2Client(config)
  const key = `briefings/${dateKey}.png`

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      await client.send(
        new PutObjectCommand({
          Bucket: config.bucketName,
          Key: key,
          Body: imageBuffer,
          ContentType: 'image/png',
        }),
      )

      const publicUrl = `${config.publicBaseUrl.replace(/\/$/, '')}/${key}`
      logger.info('upload', `Uploaded to R2: ${publicUrl}`)
      return publicUrl
    } catch (error) {
      const isLastAttempt = attempt === maxRetries - 1
      logger.warn('upload', `R2 upload attempt ${attempt + 1} failed: ${error}`)

      if (isLastAttempt) {
        throw new Error(`R2 upload failed after ${maxRetries} attempts: ${error}`)
      }

      await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)))
    }
  }

  throw new Error('Unreachable')
}
