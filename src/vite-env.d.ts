/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly VITE_STORAGE_BACKEND?: string
  readonly VITE_S3_BUCKET?: string
  readonly VITE_S3_REGION?: string
  readonly VITE_S3_ENDPOINT?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
