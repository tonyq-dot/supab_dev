import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export type ProjectMilestone = {
  id: string
  project_id: string
  pitch_date: string
  comment: string | null
  created_at: string
  sort_order: number
}

export function useProjectMilestones(projectId: string | null) {
  const [milestones, setMilestones] = useState<ProjectMilestone[]>([])
  const [loading, setLoading] = useState(false)

  const refetch = useCallback(() => {
    if (!projectId) {
      setMilestones([])
      return Promise.resolve()
    }
    return supabase
      .from('project_milestones')
      .select('*')
      .eq('project_id', projectId)
      .order('sort_order', { ascending: true })
      .order('pitch_date', { ascending: true })
      .then(({ data }) => {
        setMilestones((data as ProjectMilestone[]) ?? [])
      })
  }, [projectId])

  useEffect(() => {
    if (!projectId) {
      setMilestones([])
      setLoading(false)
      return
    }
    setLoading(true)
    refetch().finally(() => setLoading(false))
  }, [projectId, refetch])

  const addMilestone = useCallback(
    async (pitchDate: string, comment?: string) => {
      if (!projectId) throw new Error('No project')
      const { data: maxOrder } = await supabase
        .from('project_milestones')
        .select('sort_order')
        .eq('project_id', projectId)
        .order('sort_order', { ascending: false })
        .limit(1)
        .single()
      const sortOrder = (maxOrder?.sort_order ?? -1) + 1
      const { data, error } = await supabase
        .from('project_milestones')
        .insert({ project_id: projectId, pitch_date: pitchDate, comment: comment ?? null, sort_order: sortOrder })
        .select()
        .single()
      if (!error && data) {
        setMilestones((prev) => [...prev, data as ProjectMilestone].sort((a, b) => a.sort_order - b.sort_order))
        return data as ProjectMilestone
      }
      throw error
    },
    [projectId]
  )

  const updateMilestone = useCallback(async (id: string, updates: { pitch_date?: string; comment?: string }) => {
    const { error } = await supabase.from('project_milestones').update(updates).eq('id', id)
    if (!error) refetch()
    return error
  }, [refetch])

  const deleteMilestone = useCallback(async (id: string) => {
    const { error } = await supabase.from('project_milestones').delete().eq('id', id)
    if (!error) setMilestones((prev) => prev.filter((m) => m.id !== id))
    return error
  }, [])

  return { milestones, loading, refetch, addMilestone, updateMilestone, deleteMilestone }
}
