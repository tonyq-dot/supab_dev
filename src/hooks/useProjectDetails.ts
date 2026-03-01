import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { getStorageProvider } from '@/lib/storage'

export type ProjectWork = {
  id: string
  image_url: string | null
  storage_path: string | null
  work_type_name: string
  date: string
  quantity: number
  title: string | null
  user_id: string
}

export type ProjectParticipant = {
  user_id: string
  display_name: string | null
  nickname: string | null
}

export type ProjectDetails = {
  works: ProjectWork[]
  participants: ProjectParticipant[]
}

export function useProjectDetails(projectId: string | null) {
  const [details, setDetails] = useState<ProjectDetails>({ works: [], participants: [] })
  const [loading, setLoading] = useState(false)
  const [urlCache, setUrlCache] = useState<Record<string, string>>({})

  const getUrl = useCallback(async (path: string) => {
    if (urlCache[path]) return urlCache[path]
    const provider = await getStorageProvider()
    const url = await provider.getUrl(path)
    setUrlCache((prev) => ({ ...prev, [path]: url }))
    return url
  }, [urlCache])

  useEffect(() => {
    if (!projectId) {
      setDetails({ works: [], participants: [] })
      setLoading(false)
      return
    }

    setLoading(true)

    const load = async () => {
      const { data: workLogs, error } = await supabase
        .from('work_logs')
        .select(`
          id,
          user_id,
          image_url,
          date,
          quantity,
          work_types (name)
        `)
        .eq('project_id', projectId)
        .order('date', { ascending: false })

      if (error) {
        setDetails({ works: [], participants: [] })
        setLoading(false)
        return
      }

      const rows = (workLogs ?? []) as Array<{
        id: string
        user_id: string
        image_url: string | null
        date: string
        quantity: number
        work_types: { name: string } | null
      }>

      const workLogIds = rows.map((r) => r.id)

      let titleByWorkLog: Record<string, string> = {}
      let storagePathByWorkLog: Record<string, string> = {}
      if (workLogIds.length > 0) {
        const [pubsRes, latestRes] = await Promise.all([
          supabase
            .from('publications')
            .select('work_log_id, title')
            .in('work_log_id', workLogIds)
            .not('work_log_id', 'is', null),
          supabase
            .from('publication_latest')
            .select('work_log_id, storage_path')
            .in('work_log_id', workLogIds)
            .not('work_log_id', 'is', null),
        ])
        for (const p of pubsRes.data ?? []) {
          if (p.work_log_id && p.title && !titleByWorkLog[p.work_log_id]) {
            titleByWorkLog[p.work_log_id] = p.title
          }
        }
        for (const pl of latestRes.data ?? []) {
          if (pl.work_log_id && pl.storage_path && !storagePathByWorkLog[pl.work_log_id]) {
            storagePathByWorkLog[pl.work_log_id] = pl.storage_path
          }
        }
      }

      const userIds = [...new Set(rows.map((r) => r.user_id))]
      let profiles: Record<string, { display_name: string | null; nickname: string | null }> = {}
      if (userIds.length > 0) {
        const { data: profs } = await supabase
          .from('user_profiles')
          .select('user_id, display_name, nickname')
          .in('user_id', userIds)
        for (const pr of profs ?? []) {
          profiles[pr.user_id] = { display_name: pr.display_name, nickname: pr.nickname }
        }
      }

      const works: ProjectWork[] = rows.map((r) => ({
        id: r.id,
        image_url: r.image_url,
        storage_path: storagePathByWorkLog[r.id] ?? null,
        work_type_name: r.work_types?.name ?? '—',
        date: r.date,
        quantity: r.quantity,
        title: titleByWorkLog[r.id] ?? null,
        user_id: r.user_id,
      }))

      const participants: ProjectParticipant[] = userIds.map((uid) => ({
        user_id: uid,
        display_name: profiles[uid]?.display_name ?? null,
        nickname: profiles[uid]?.nickname ?? null,
      }))

      setDetails({ works, participants })
      setLoading(false)
    }

    load()
  }, [projectId])

  return { ...details, loading, getUrl }
}
