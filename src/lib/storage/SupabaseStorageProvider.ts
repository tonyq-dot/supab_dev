import { supabase } from '@/lib/supabase'
import type { IStorageProvider } from './types'

const BUCKET = 'gallery-media'

export class SupabaseStorageProvider implements IStorageProvider {
  constructor(private basePath: string = BUCKET) {}

  async upload(path: string, file: Blob, _metadata?: Record<string, string>): Promise<string> {
    const { error } = await supabase.storage.from(this.basePath).upload(path, file, {
      upsert: false,
      cacheControl: '3600',
    })
    if (error) throw new Error(`Storage upload failed: ${error.message}`)
    return path
  }

  async getUrl(path: string): Promise<string> {
    const { data } = supabase.storage.from(this.basePath).getPublicUrl(path)
    return data.publicUrl
  }

  async delete(path: string): Promise<void> {
    const { error } = await supabase.storage.from(this.basePath).remove([path])
    if (error) throw new Error(`Storage delete failed: ${error.message}`)
  }

  async exists(path: string): Promise<boolean> {
    const { data, error } = await supabase.storage.from(this.basePath).list(path.split('/').slice(0, -1).join('/'), {
      limit: 1,
    })
    if (error) return false
    const fileName = path.split('/').pop()
    return (data ?? []).some((f) => f.name === fileName)
  }
}
