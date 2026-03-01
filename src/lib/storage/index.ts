import { supabase } from '@/lib/supabase'
import { SupabaseStorageProvider } from './SupabaseStorageProvider'
import { LocalStorageProvider } from './LocalStorageProvider'
import { S3StorageProvider } from './S3StorageProvider'
import type { IStorageProvider } from './types'

const BACKEND = (import.meta.env.VITE_STORAGE_BACKEND ?? 'supabase') as 'local' | 'supabase' | 's3'

let _provider: IStorageProvider | null = null

async function getStorageConfig(): Promise<{ backend: string; base_path: string; s3_bucket?: string; s3_region?: string } | null> {
  try {
    const { data } = await supabase.from('storage_config').select('backend, base_path, s3_bucket, s3_region').eq('is_default', true).single()
    return data
  } catch {
    return null
  }
}

export async function getStorageProvider(): Promise<IStorageProvider> {
  if (_provider) return _provider

  const envBackend = BACKEND
  const config = await getStorageConfig().catch(() => null)
  const backend = config?.backend ?? envBackend
  const basePath = config?.base_path ?? 'gallery-media'

  switch (backend) {
    case 'local':
      _provider = new LocalStorageProvider(basePath)
      break
    case 's3':
      _provider = new S3StorageProvider({
        bucket: config?.s3_bucket ?? import.meta.env.VITE_S3_BUCKET ?? '',
        region: config?.s3_region ?? import.meta.env.VITE_S3_REGION ?? 'us-east-1',
        endpoint: import.meta.env.VITE_S3_ENDPOINT,
      })
      break
    case 'supabase':
    default:
      _provider = new SupabaseStorageProvider(basePath)
      break
  }

  return _provider
}

export function buildStoragePath(params: {
  authorId: string
  projectId?: string
  publicationId: string
  version: number
  filename: string
}): string {
  const { authorId, projectId, publicationId, version, filename } = params
  const project = projectId ?? '_unsorted'
  return `${authorId}/${project}/${publicationId}/v${version}/${filename}`
}

export { SupabaseStorageProvider, LocalStorageProvider, S3StorageProvider }
export type { IStorageProvider } from './types'
