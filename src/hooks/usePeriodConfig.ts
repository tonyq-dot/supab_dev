import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/lib/database.types'

type PeriodConfig = Database['public']['Tables']['period_configs']['Row']

export function usePeriodConfig() {
  const [config, setConfig] = useState<PeriodConfig | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('period_configs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
      .then(({ data }) => {
        setConfig(data as PeriodConfig | null)
      })
      .finally(() => setLoading(false))
  }, [])

  return { config, loading }
}
