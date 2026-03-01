import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export type MilestoneWithProject = {
  id: string
  project_id: string
  pitch_date: string
  comment: string | null
  created_at: string
  sort_order: number
  projects?: { name: string; clients?: { name: string } | null } | null
}

export function useAllMilestones() {
  const [milestones, setMilestones] = useState<MilestoneWithProject[]>([])
  const [loading, setLoading] = useState(true)

  const refetch = useCallback(() => {
    return supabase
      .from('project_milestones')
      .select(`
        id,
        project_id,
        pitch_date,
        comment,
        created_at,
        sort_order,
        projects (name, clients (name))
      `)
      .order('pitch_date', { ascending: false })
      .then(({ data }) => {
        setMilestones((data as MilestoneWithProject[]) ?? [])
      })
  }, [])

  useEffect(() => {
    refetch().finally(() => setLoading(false))
  }, [refetch])

  return { milestones, loading, refetch }
}
