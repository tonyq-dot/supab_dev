import { supabase } from '@/lib/supabase'
import type { IStorageProvider } from './types'

/**
 * Local storage provider for dev: uses Supabase local instance (supabase start)
 * or public/uploads with object URLs for in-browser dev without backend.
 * For true local filesystem, run a dev server with upload API.
 */
export class LocalStorageProvider implements IStorageProvider {
  constructor(private basePath: string = 'gallery-media') {}

  async upload(path: string, file: Blob, _metadata?: Record<string, string>): Promise<string> {
    const { error } = await supabase.storage.from(this.basePath).upload(path, file, {
      upsert: false,
      cacheControl: '3600',
    })
    if (error) throw new Error(`Local storage upload failed: ${error.message}`)
    return path
  }

  async getUrl(path: string): Promise<string> {
    const { data } = supabase.storage.from(this.basePath).getPublicUrl(path)
    return data.publicUrl
  }

  async delete(path: string): Promise<void> {
    const { error } = await supabase.storage.from(this.basePath).remove([path])
    if (error) throw new Error(`Local storage delete failed: ${error.message}`)
  }

  async exists(path: string): Promise<boolean> {
    const parts = path.split('/')
    const fileName = parts.pop()
    const folder = parts.join('/')
    const { data, error } = await supabase.storage.from(this.basePath).list(folder || '', { limit: 1 })
    if (error) return false
    return (data ?? []).some((f) => f.name === fileName)
  }
}
