import { createSupabaseAdmin } from './supabaseAdmin.ts'

export async function verifyApiKey(apiKey: string | null): Promise<boolean> {
  if (!apiKey) return false
  const supabase = createSupabaseAdmin()
  const hash = await hashKey(apiKey)
  const { data } = await supabase.from('api_keys').select('id').eq('key_hash', hash).single()
  return !!data
}

async function hashKey(key: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(key)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}
