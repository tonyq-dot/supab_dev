import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useProjects } from '@/hooks/useProjects'
import { useGalleryPoints } from '@/hooks/useGalleryPoints'
import { getStorageProvider, buildStoragePath } from '@/lib/storage'
import MediaGrid from '@/components/gallery/MediaGrid'
import MediaViewer from '@/components/gallery/MediaViewer'
import type { PublicationLatest } from '@/lib/database.types'

export default function Gallery() {
  const { user } = useAuth()
  const { projects } = useProjects(false)
  const { categories, getConfigsForCategory, calculatePoints, loading: pointsLoading } = useGalleryPoints()
  const [items, setItems] = useState<PublicationLatest[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<PublicationLatest | null>(null)
  const [searchParams] = useSearchParams()
  const [filterProject, setFilterProject] = useState<string>(searchParams.get('project') || '')
  const [filterWorkLog, setFilterWorkLog] = useState<string>(searchParams.get('work') || '')
  const [filterType, setFilterType] = useState<string>('')
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadTitle, setUploadTitle] = useState<string>('')
  const [uploadWorkLog, setUploadWorkLog] = useState<string>('')
  const [uploadProject, setUploadProject] = useState<string>('')
  const [uploadCategory, setUploadCategory] = useState<string>('')
  const [uploadConfigIds, setUploadConfigIds] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [workLogs, setWorkLogs] = useState<{ id: string; date: string; project_id: string; project_name?: string; work_type_name?: string; publication_title?: string }[]>([])
  const [urlCache, setUrlCache] = useState<Record<string, string>>({})

  const loadWorkLogs = useCallback(async () => {
    if (!user?.id) return
    const { data: logs } = await supabase
      .from('work_logs')
      .select('id, date, project_id, projects(name), work_types(name)')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .limit(50)
    const rows = (logs ?? []).map((r: { id: string; date: string; project_id: string; projects?: { name: string } | null; work_types?: { name: string } | null }) => ({
      id: r.id,
      date: r.date,
      project_id: r.project_id,
      project_name: r.projects?.name,
      work_type_name: r.work_types?.name,
    }))
    const ids = rows.map((r) => r.id)
    if (ids.length > 0) {
      const { data: pubs } = await supabase
        .from('publications')
        .select('work_log_id, title')
        .in('work_log_id', ids)
        .not('work_log_id', 'is', null)
        .order('created_at', { ascending: false })
      const titleByWorkLog: Record<string, string> = {}
      for (const p of pubs ?? []) {
        if (p.work_log_id && p.title && !titleByWorkLog[p.work_log_id]) {
          titleByWorkLog[p.work_log_id] = p.title
        }
      }
      rows.forEach((r) => { r.publication_title = titleByWorkLog[r.id] })
    }
    setWorkLogs(rows)
  }, [user?.id])

  useEffect(() => {
    loadWorkLogs()
  }, [loadWorkLogs])

  useEffect(() => {
    const handler = () => {
      if (document.visibilityState === 'visible') loadWorkLogs()
    }
    document.addEventListener('visibilitychange', handler)
    return () => document.removeEventListener('visibilitychange', handler)
  }, [loadWorkLogs])

  const loadItems = useCallback(async () => {
    if (!user?.id) return
    setLoading(true)
    let workLogIds: string[] | null = null
    if (filterWorkLog) {
      workLogIds = [filterWorkLog]
    } else if (filterProject) {
      const { data: logs } = await supabase.from('work_logs').select('id').eq('user_id', user.id).eq('project_id', filterProject)
      workLogIds = logs?.map((l) => l.id) ?? []
    }
    if (workLogIds !== null && workLogIds.length === 0) {
      setItems([])
      setLoading(false)
      return
    }
    let query = supabase.from('publication_latest').select('*').eq('author_id', user.id).order('created_at', { ascending: false })
    if (filterType) query = query.eq('media_type', filterType)
    if (workLogIds !== null) query = query.in('work_log_id', workLogIds)
    const { data } = await query
    setItems((data as PublicationLatest[]) ?? [])
    setLoading(false)
  }, [user?.id, filterProject, filterType, filterWorkLog])

  useEffect(() => {
    loadItems()
  }, [loadItems])

  const getUrl = useCallback(async (path: string) => {
    if (urlCache[path]) return urlCache[path]
    const provider = await getStorageProvider()
    const url = await provider.getUrl(path)
    setUrlCache((prev) => ({ ...prev, [path]: url }))
    return url
  }, [urlCache])

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !uploadFile) return
    const ext = uploadFile.name.split('.').pop() || 'jpg'
    const type = uploadFile.type.startsWith('video/') ? 'video' : uploadFile.type === 'image/gif' ? 'gif' : 'image'
    setUploading(true)

    try {
      const { data: pub } = await supabase.from('publications').insert({
        author_id: user.id,
        project_id: uploadProject || (uploadWorkLog ? workLogs.find((w) => w.id === uploadWorkLog)?.project_id : null) || null,
        work_log_id: uploadWorkLog || null,
        title: uploadTitle.trim() || null,
        source: 'web_ui',
      }).select().single()
      if (!pub) throw new Error('Failed to create publication')

      const path = buildStoragePath({
        authorId: user.id,
        projectId: pub.project_id ?? undefined,
        publicationId: pub.id,
        version: 1,
        filename: `${crypto.randomUUID()}.${ext}`,
      })

      const provider = await getStorageProvider()
      await provider.upload(path, uploadFile)

      const pointsAssigned = uploadConfigIds.length > 0 ? calculatePoints(uploadConfigIds) : null
      const pointsConfigId = uploadConfigIds.length === 1 && !getConfigsForCategory(uploadCategory).find((c) => c.id === uploadConfigIds[0])?.is_bonus
        ? uploadConfigIds[0]
        : null

      await supabase.from('publication_versions').insert({
        publication_id: pub.id,
        version_number: 1,
        storage_path: path,
        storage_backend: 'supabase',
        media_type: type,
        points_config_id: pointsConfigId || null,
        points_assigned: pointsAssigned,
        created_by: user.id,
      })

      const { data: latest } = await supabase.from('publication_latest').select('*').eq('id', pub.id).single()
      if (latest) setItems((prev) => [latest as PublicationLatest, ...prev])
      loadWorkLogs()
    } finally {
      setUploadFile(null)
      setUploadTitle('')
      setUploadConfigIds([])
      setUploadCategory('')
      setUploading(false)
    }
  }

  const configsForSelectedCategory = uploadCategory ? getConfigsForCategory(uploadCategory) : []
  const toggleConfig = (id: string, isBonus: boolean) => {
    setUploadConfigIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id)
      if (isBonus) return [...prev, id]
      return [...prev.filter((pid) => !configsForSelectedCategory.find((c) => c.id === pid && !c.is_bonus)), id]
    })
  }

  if (loading) return <p>Загрузка...</p>

  return (
    <div className="page">
      <h1>Галерея</h1>
      <div className="filters">
        {filterWorkLog && (
          <span className="filter-hint">
            Показана работа <button type="button" onClick={() => setFilterWorkLog('')} className="btn btn-sm">Сбросить</button>
          </span>
        )}
        <label>
          Проект (по работе)
          <select value={filterProject} onChange={(e) => setFilterProject(e.target.value)} disabled={!!filterWorkLog}>
            <option value="">Все</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </label>
        <label>
          Тип
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
            <option value="">Все</option>
            <option value="image">Изображение</option>
            <option value="gif">GIF</option>
            <option value="video">Видео</option>
          </select>
        </label>
      </div>
      <form onSubmit={handleUpload} className="form card">
        <h3>Загрузить медиа</h3>
        <label>
          Файл
          <input type="file" accept="image/*,video/*" onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)} required={!!uploadFile} />
        </label>
        <label>
          Название (опционально)
          <input
            type="text"
            value={uploadTitle}
            onChange={(e) => setUploadTitle(e.target.value)}
            placeholder="Имя картинки"
          />
        </label>
        <label>
          Проект (опционально)
          <select value={uploadProject} onChange={(e) => setUploadProject(e.target.value)}>
            <option value="">—</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </label>
        <label>
          Привязать к работе (опционально)
          <select value={uploadWorkLog} onChange={(e) => setUploadWorkLog(e.target.value)}>
            <option value="">—</option>
            {workLogs.map((wl) => (
              <option key={wl.id} value={wl.id}>
                {[wl.date, wl.project_name, wl.work_type_name, wl.publication_title].filter(Boolean).join(' · ')}
              </option>
            ))}
          </select>
        </label>
        {!pointsLoading && (
          <>
            <label>
              Вид работы (для баллов)
              <select value={uploadCategory} onChange={(e) => { setUploadCategory(e.target.value); setUploadConfigIds([]) }}>
                <option value="">—</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </label>
            {uploadCategory && configsForSelectedCategory.length > 0 && (
              <label>
                Подвид / сложность
                <div className="points-config-list">
                  {configsForSelectedCategory.map((cfg) => (
                    <label key={cfg.id} className="points-config-item">
                      <input
                        type="checkbox"
                        checked={uploadConfigIds.includes(cfg.id)}
                        onChange={() => toggleConfig(cfg.id, cfg.is_bonus)}
                      />
                      {cfg.subtype} ({cfg.complexity}) — {cfg.points_min}{cfg.is_bonus ? '+' : `–${cfg.points_max}`} баллов
                    </label>
                  ))}
                </div>
                {uploadConfigIds.length > 0 && (
                  <p className="points-summary">
                    Итого: {calculatePoints(uploadConfigIds)} баллов
                  </p>
                )}
              </label>
            )}
          </>
        )}
        <button type="submit" disabled={!uploadFile || uploading} className="btn btn-primary">
          {uploading ? 'Загрузка...' : 'Загрузить'}
        </button>
      </form>
      <MediaGrid items={items} getUrl={getUrl} onSelect={setSelected} />
      {selected && (
        <MediaViewer
          item={selected}
          getUrl={() => getUrl(selected.storage_path)}
          onClose={() => setSelected(null)}
          onRefresh={loadItems}
        />
      )}
    </div>
  )
}
