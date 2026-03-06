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

    const queryPromise = query.then(({ data, error }) => {
      if (error) {
         console.error('Error fetching projects:', error)
         throw error
      }
      return data as Project[]
    })

    const timeoutPromise = new Promise<Project[]>((_, reject) => 
      setTimeout(() => reject(new Error('Projects fetch timeout')), 5000)
    )

    return Promise.race([queryPromise, timeoutPromise])
      .then((data) => {
        setProjects(data ?? [])
      })
      .catch((err) => {
        console.error('Projects fetch error:', err)
        setProjects([]) // Fallback to empty list
      })
  }, [activeOnly])

  useEffect(() => {
    refetch().finally(() => setLoading(false))
  }, [refetch])

  return { projects, loading, refetch }
}
