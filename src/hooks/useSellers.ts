import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export type Seller = { id: string; name: string; created_at: string }

export function useSellers() {
  const [sellers, setSellers] = useState<Seller[]>([])
  const [loading, setLoading] = useState(true)

  const refetch = useCallback(() => {
    return supabase
      .from('sellers')
      .select('id, name, created_at')
      .order('name')
      .then(({ data }) => {
        setSellers((data as Seller[]) ?? [])
      })
  }, [])

  useEffect(() => {
    refetch().finally(() => setLoading(false))
  }, [refetch])

  const addSeller = useCallback(
    async (name: string) => {
      const { data, error } = await supabase.from('sellers').insert({ name }).select('id, name, created_at').single()
      if (!error && data) {
        setSellers((prev) => [...prev, data as Seller].sort((a, b) => a.name.localeCompare(b.name)))
        return data as Seller
      }
      throw error
    },
    []
  )

  return { sellers, loading, refetch, addSeller }
}
