import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export type UserRole = 'animator' | 'manager' | null

export function useUserRole(userId: string | undefined) {
  const [role, setRole] = useState<UserRole>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) {
      setRole(null)
      setLoading(false)
      return
    }

    supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .maybeSingle()
      .then(({ data, error }) => {
        setRole((data?.role as UserRole) ?? 'animator')
        setLoading(false)
      })
  }, [userId])

  return { role, loading, isManager: role === 'manager' }
}
