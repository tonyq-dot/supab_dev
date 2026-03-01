import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/lib/database.types'

type Project = Database['public']['Tables']['projects']['Row'] & {
  project_types?: { name: string; value: number } | null
  clients?: { id: string; name: string } | null
}

export function useProjects(activeOnly = true) {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)

  const refetch = useCallback(() => {
    let query = supabase
      .from('projects')
      .select(`
        *,
        project_types (name, value),
        clients (id, name)
      `)
      .order('name')

    if (activeOnly) {
      query = query.eq('status', 'Active')
    }

    return query.then(({ data }) => {
      setProjects((data as Project[]) ?? [])
    })
  }, [activeOnly])

  useEffect(() => {
    refetch().finally(() => setLoading(false))
  }, [refetch])

  return { projects, loading, refetch }
}
