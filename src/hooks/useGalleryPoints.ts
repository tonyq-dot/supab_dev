import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export interface GalleryCategory {
  id: string
  code: string | null
  name: string
  parent_id: string | null
}

export interface GalleryPointsConfig {
  id: string
  category_id: string
  code: string | null
  subtype: string
  complexity: string
  points_min: number
  points_max: number
  is_bonus: boolean
}

export function useGalleryPoints() {
  const [categories, setCategories] = useState<GalleryCategory[]>([])
  const [configs, setConfigs] = useState<GalleryPointsConfig[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      supabase.from('gallery_work_categories').select('id, code, name, parent_id').is('parent_id', null).order('name'),
      supabase.from('gallery_points_config').select('*').order('subtype'),
    ]).then(([catRes, cfgRes]) => {
      setCategories(catRes.data ?? [])
      setConfigs(cfgRes.data ?? [])
    }).finally(() => setLoading(false))
  }, [])

  const getConfigsForCategory = (categoryId: string) =>
    configs.filter((c) => c.category_id === categoryId)

  const calculatePoints = (configIds: string[], useMax: boolean = true): number => {
    let base = 0
    let bonus = 0
    for (const id of configIds) {
      const cfg = configs.find((c) => c.id === id)
      if (!cfg) continue
      const pts = useMax ? cfg.points_max : cfg.points_min
      if (cfg.is_bonus) bonus += pts
      else base += pts
    }
    return base + bonus
  }

  return { categories, configs, loading, getConfigsForCategory, calculatePoints }
}
