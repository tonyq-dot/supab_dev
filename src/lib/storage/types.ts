export type StorageBackend = 'local' | 'supabase' | 's3'

export interface IStorageProvider {
  upload(path: string, file: Blob, metadata?: Record<string, string>): Promise<string>
  getUrl(path: string): Promise<string>
  delete(path: string): Promise<void>
  exists(path: string): Promise<boolean>
}

export interface StorageConfig {
  backend: StorageBackend
  basePath: string
  s3Bucket?: string
  s3Region?: string
}
