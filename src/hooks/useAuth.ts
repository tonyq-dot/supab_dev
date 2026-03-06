import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    // Race between getSession and a timeout
    const fetchSession = async () => {
      try {
        const sessionPromise = supabase.auth.getSession()
        const timeoutPromise = new Promise<{ data: { session: null }, error: any }>((_, reject) => 
          setTimeout(() => reject(new Error('Auth timeout')), 5000)
        )

        const { data: { session }, error } = await Promise.race([sessionPromise, timeoutPromise]) as any
        
        if (mounted) {
          if (error) console.error('Auth error:', error)
          setUser(session?.user ?? null)
        }
      } catch (error) {
        console.error('Auth error or timeout:', error)
      } finally {
        if (mounted) setLoading(false)
      }
    }

    fetchSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) setUser(session?.user ?? null)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  return { user, loading }
}
