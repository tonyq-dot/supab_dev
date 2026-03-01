import type { IStorageProvider } from './types'

export interface S3Config {
  bucket: string
  region: string
  endpoint?: string
  accessKeyId?: string
  secretAccessKey?: string
}

export class S3StorageProvider implements IStorageProvider {
  private bucket: string
  private region: string
  private endpoint?: string

  constructor(config: S3Config) {
    this.bucket = config.bucket
    this.region = config.region
    this.endpoint = config.endpoint
  }

  async upload(path: string, file: Blob, _metadata?: Record<string, string>): Promise<string> {
    const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3')
    const client = new S3Client({
      region: this.region,
      ...(this.endpoint && { endpoint: this.endpoint, forcePathStyle: true }),
    })
    const buffer = await file.arrayBuffer()
    await client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: path,
        Body: new Uint8Array(buffer),
        ContentType: file.type,
      })
    )
    return path
  }

  async getUrl(path: string): Promise<string> {
    const { GetObjectCommand } = await import('@aws-sdk/client-s3')
    const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner')
    const { S3Client } = await import('@aws-sdk/client-s3')
    const client = new S3Client({
      region: this.region,
      ...(this.endpoint && { endpoint: this.endpoint, forcePathStyle: true }),
    })
    const command = new GetObjectCommand({ Bucket: this.bucket, Key: path })
    return getSignedUrl(client, command, { expiresIn: 3600 })
  }

  async delete(path: string): Promise<void> {
    const { S3Client, DeleteObjectCommand } = await import('@aws-sdk/client-s3')
    const client = new S3Client({
      region: this.region,
      ...(this.endpoint && { endpoint: this.endpoint, forcePathStyle: true }),
    })
    await client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: path }))
  }

  async exists(path: string): Promise<boolean> {
    const { S3Client, HeadObjectCommand } = await import('@aws-sdk/client-s3')
    const client = new S3Client({
      region: this.region,
      ...(this.endpoint && { endpoint: this.endpoint, forcePathStyle: true }),
    })
    try {
      await client.send(new HeadObjectCommand({ Bucket: this.bucket, Key: path }))
      return true
    } catch {
      return false
    }
  }
}
