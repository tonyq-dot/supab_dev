import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export type Client = { id: string; name: string; created_at: string }

export function useClients() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)

  const refetch = useCallback(() => {
    return supabase
      .from('clients')
      .select('id, name, created_at')
      .order('name')
      .then(({ data }) => {
        setClients((data as Client[]) ?? [])
      })
  }, [])

  useEffect(() => {
    refetch().finally(() => setLoading(false))
  }, [refetch])

  const addClient = useCallback(
    async (name: string) => {
      const { data, error } = await supabase.from('clients').insert({ name }).select('id, name, created_at').single()
      if (!error && data) {
        setClients((prev) => [...prev, data as Client].sort((a, b) => a.name.localeCompare(b.name)))
        return data as Client
      }
      throw error
    },
    []
  )

  return { clients, loading, refetch, addClient }
}
