import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { getStorageProvider, buildStoragePath } from '@/lib/storage'
import { useAuth } from '@/hooks/useAuth'
import { useProjects } from '@/hooks/useProjects'
import { useGalleryPoints } from '@/hooks/useGalleryPoints'
import ImageDropZone from '@/components/ImageDropZone'
import MediaViewer from '@/components/gallery/MediaViewer'
import type { PublicationLatest } from '@/lib/database.types'

const NEW_PROJECT_VALUE = '__new__'

export default function AddWork() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { projects, loading: projectsLoading, refetch: refetchProjects } = useProjects()
  const { categories, getConfigsForCategory, calculatePoints, loading: pointsLoading } = useGalleryPoints()
  const [urlCache, setUrlCache] = useState<Record<string, string>>({})

  const [projectId, setProjectId] = useState('')
  const [workTypeId, setWorkTypeId] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imageTitle, setImageTitle] = useState<string>('')
  const [uploadCategory, setUploadCategory] = useState('')
  const [uploadConfigIds, setUploadConfigIds] = useState<string[]>([])
  const [workTypes, setWorkTypes] = useState<{ id: string; name: string; base_value: number }[]>([])
  const [projectTypes, setProjectTypes] = useState<{ id: string; name: string; value: number }[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // New project form (when "Новый проект" selected)
  const [newProjectName, setNewProjectName] = useState('')
  const [newProjectTypeId, setNewProjectTypeId] = useState('')
  const [newProjectDroneCount, setNewProjectDroneCount] = useState(500)
  const [newProjectIsRework, setNewProjectIsRework] = useState(false)

  // After save: show preview and offer add another
  const [savedPublication, setSavedPublication] = useState<PublicationLatest | null>(null)
  const [savedWithoutImage, setSavedWithoutImage] = useState(false)

  useEffect(() => {
    supabase.from('work_types').select('id, name, base_value').order('name').then(({ data }) => {
      setWorkTypes(data ?? [])
    })
    supabase.from('project_types').select('id, name, value').order('name').then(({ data }) => {
      setProjectTypes(data ?? [])
      if (data?.length && !newProjectTypeId) setNewProjectTypeId(data[0].id)
    })
  }, [])

  const configsForSelectedCategory = uploadCategory ? getConfigsForCategory(uploadCategory) : []
  const toggleConfig = useCallback((id: string, isBonus: boolean) => {
    setUploadConfigIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id)
      if (isBonus) return [...prev, id]
      return [...prev.filter((pid) => !configsForSelectedCategory.find((c) => c.id === pid && !c.is_bonus)), id]
    })
  }, [configsForSelectedCategory])

  const getUrl = useCallback(async (path: string) => {
    if (urlCache[path]) return urlCache[path]
    const provider = await getStorageProvider()
    const url = await provider.getUrl(path)
    setUrlCache((prev) => ({ ...prev, [path]: url }))
    return url
  }, [urlCache])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !workTypeId || quantity < 1) return

    let resolvedProjectId = projectId
    if (projectId === NEW_PROJECT_VALUE) {
      if (!newProjectName.trim()) {
        setError('Введите название нового проекта')
        return
      }
      setError(null)
      setSubmitting(true)
      const { data: newProject, error: createErr } = await supabase.from('projects').insert({
        name: newProjectName.trim(),
        type_id: newProjectTypeId || projectTypes[0]?.id,
        drone_count: newProjectDroneCount,
        is_rework: newProjectIsRework,
        status: 'Active',
      }).select().single()
      if (createErr) {
        setError(createErr.message)
        setSubmitting(false)
        return
      }
      resolvedProjectId = newProject.id
      await refetchProjects()
    } else if (!resolvedProjectId) {
      setError('Выберите проект')
      return
    }

    setError(null)
    setSubmitting(true)

    const { data: workLog, error: err } = await supabase.from('work_logs').insert({
      user_id: user.id,
      project_id: resolvedProjectId,
      work_type_id: workTypeId,
      quantity,
      date,
      image_url: null,
    }).select().single()

    if (err) {
      setError(err.message)
      setSubmitting(false)
      return
    }

    if (imageFile && workLog) {
      const ext = imageFile.name.split('.').pop() || 'jpg'
      const type = imageFile.type === 'image/gif' ? 'gif' : 'image'
      const { data: pub } = await supabase.from('publications').insert({
        author_id: user.id,
        project_id: resolvedProjectId,
        work_log_id: workLog.id,
        title: imageTitle.trim() || null,
        source: 'web_ui',
      }).select().single()

      if (pub) {
        const path = buildStoragePath({
          authorId: user.id,
          projectId: resolvedProjectId,
          publicationId: pub.id,
          version: 1,
          filename: `${crypto.randomUUID()}.${ext}`,
        })

        const provider = await getStorageProvider()
        await provider.upload(path, imageFile)
        const imageUrl = await provider.getUrl(path)
        await supabase.from('work_logs').update({ image_url: imageUrl }).eq('id', workLog.id)

        const pointsAssigned = uploadConfigIds.length > 0 ? calculatePoints(uploadConfigIds) : null
        const pointsConfigId = uploadConfigIds.length === 1 && !configsForSelectedCategory.find((c) => c.id === uploadConfigIds[0])?.is_bonus
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
        if (latest) setSavedPublication(latest as PublicationLatest)
      }
    }

    setSubmitting(false)
    if (!imageFile) {
      setSavedWithoutImage(true)
    }
  }

  const resetForm = useCallback(() => {
    setProjectId('')
    setNewProjectName('')
    setImageFile(null)
    setImageTitle('')
    setUploadCategory('')
    setUploadConfigIds([])
    setQuantity(1)
    setDate(new Date().toISOString().slice(0, 10))
    setWorkTypeId('')
    setError(null)
  }, [])

  const handleClosePreview = useCallback(() => {
    setSavedPublication(null)
    setSavedWithoutImage(false)
    resetForm()
    navigate('/works')
  }, [resetForm, navigate])

  const handleAddAnother = useCallback(() => {
    setSavedPublication(null)
    setSavedWithoutImage(false)
    resetForm()
  }, [resetForm])

  if (projectsLoading) return <p>Загрузка...</p>

  return (
    <div className="page">
      <h1>Добавить работу</h1>
      <form onSubmit={handleSubmit} className="form">
        <label>
          Проект
          <select
            value={projectId}
            onChange={(e) => {
              setProjectId(e.target.value)
              if (e.target.value !== NEW_PROJECT_VALUE) setError(null)
            }}
            required={projectId !== NEW_PROJECT_VALUE}
          >
            <option value="">Выберите проект</option>
            <option value={NEW_PROJECT_VALUE}>+ Новый проект</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.drone_count} дронов)
              </option>
            ))}
          </select>
        </label>

        {projectId === NEW_PROJECT_VALUE && (
          <div className="card form">
            <h3>Новый проект</h3>
            <label>
              Название
              <input
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                placeholder="Дубай Аэрошоу"
                required
              />
            </label>
            <label>
              Тип проекта
              <select value={newProjectTypeId} onChange={(e) => setNewProjectTypeId(e.target.value)}>
                {projectTypes.map((pt) => (
                  <option key={pt.id} value={pt.id}>{pt.name} ({pt.value})</option>
                ))}
              </select>
            </label>
            <label>
              Количество дронов
              <input
                type="number"
                min={1}
                value={newProjectDroneCount}
                onChange={(e) => setNewProjectDroneCount(parseInt(e.target.value, 10) || 0)}
              />
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={newProjectIsRework}
                onChange={(e) => setNewProjectIsRework(e.target.checked)}
              />
              Переработка
            </label>
          </div>
        )}

        <label>
          Вид работы
          <select value={workTypeId} onChange={(e) => setWorkTypeId(e.target.value)} required>
            <option value="">Выберите вид работы</option>
            {workTypes.map((wt) => (
              <option key={wt.id} value={wt.id}>
                {wt.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Количество
          <input
            type="number"
            min={1}
            value={quantity}
            onChange={(e) => setQuantity(parseInt(e.target.value, 10) || 1)}
          />
        </label>
        <label>
          Дата
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </label>
        <label>
          Превью (опционально)
          <ImageDropZone value={imageFile} onChange={setImageFile} />
          {imageFile && (
            <>
              <input
                type="text"
                value={imageTitle}
                onChange={(e) => setImageTitle(e.target.value)}
                placeholder="Название картинки"
                style={{ marginTop: '0.5rem' }}
              />
              {!pointsLoading && (
                <>
                  <label style={{ marginTop: '0.75rem' }}>
                    Вид работы (для баллов галереи)
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
                        <p className="points-summary">Итого: {calculatePoints(uploadConfigIds)} баллов</p>
                      )}
                    </label>
                  )}
                </>
              )}
            </>
          )}
        </label>
        {error && <p className="error">{error}</p>}
        <button type="submit" disabled={submitting} className="btn btn-primary">
          {submitting ? 'Сохранение...' : 'Сохранить'}
        </button>
      </form>

      {savedPublication && (
        <MediaViewer
          item={savedPublication}
          getUrl={() => getUrl(savedPublication.storage_path)}
          onClose={handleClosePreview}
          extraActions={
            <button type="button" onClick={handleAddAnother} className="btn btn-primary">
              Добавить следующую работу
            </button>
          }
        />
      )}

      {savedWithoutImage && (
        <div className="modal-overlay" onClick={handleClosePreview}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Работа добавлена</h3>
            <p>Работа успешно сохранена.</p>
            <div className="form-actions" style={{ marginTop: '1rem' }}>
              <button type="button" onClick={handleAddAnother} className="btn btn-primary">
                Добавить следующую работу
              </button>
              <button type="button" onClick={handleClosePreview} className="btn btn-outline">
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
