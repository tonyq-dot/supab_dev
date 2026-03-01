import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export type ProjectSeller = { id: string; project_id: string; seller_id: string; sellers?: { id: string; name: string } | null }

export function useProjectSellers(projectId: string | null) {
  const [projectSellers, setProjectSellers] = useState<ProjectSeller[]>([])
  const [loading, setLoading] = useState(false)

  const refetch = useCallback(() => {
    if (!projectId) {
      setProjectSellers([])
      return Promise.resolve()
    }
    return supabase
      .from('project_sellers')
      .select('id, project_id, seller_id, sellers(id, name)')
      .eq('project_id', projectId)
      .then(({ data }) => {
        setProjectSellers((data as ProjectSeller[]) ?? [])
      })
  }, [projectId])

  useEffect(() => {
    if (!projectId) {
      setProjectSellers([])
      setLoading(false)
      return
    }
    setLoading(true)
    refetch().finally(() => setLoading(false))
  }, [projectId, refetch])

  const addSeller = useCallback(
    async (sellerId: string) => {
      if (!projectId) throw new Error('No project')
      const { data, error } = await supabase
        .from('project_sellers')
        .insert({ project_id: projectId, seller_id: sellerId })
        .select('id, project_id, seller_id, sellers(id, name)')
        .single()
      if (!error && data) {
        setProjectSellers((prev) => [...prev, data as ProjectSeller])
        return data as ProjectSeller
      }
      throw error
    },
    [projectId]
  )

  const removeSeller = useCallback(async (projectSellerId: string) => {
    const { error } = await supabase.from('project_sellers').delete().eq('id', projectSellerId)
    if (!error) setProjectSellers((prev) => prev.filter((ps) => ps.id !== projectSellerId))
    return error
  }, [])

  return { projectSellers, loading, refetch, addSeller, removeSeller }
}
