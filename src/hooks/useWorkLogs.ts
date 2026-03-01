import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/lib/database.types'

type DetailedScore = Database['public']['Views']['detailed_scores']['Row']

export function useWorkLogs(userId: string | undefined, startDate?: string, endDate?: string) {
  const [scores, setScores] = useState<DetailedScore[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!userId) {
      setScores([])
      setLoading(false)
      return
    }

    let query = supabase
      .from('detailed_scores')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false })

    if (startDate) query = query.gte('date', startDate)
    if (endDate) query = query.lte('date', endDate)

    query
      .then(({ data, error: err }) => {
        setScores((data as DetailedScore[]) ?? [])
        setError(err?.message ?? null)
      })
      .finally(() => setLoading(false))
  }, [userId, startDate, endDate])

  const totalPoints = scores.reduce((sum, r) => sum + Number(r.score), 0)

  return { scores, totalPoints, loading, error }
}
