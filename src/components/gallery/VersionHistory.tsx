import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { getStorageProvider, buildStoragePath } from '@/lib/storage'
import { useGalleryPoints } from '@/hooks/useGalleryPoints'
import type { PublicationLatest } from '@/lib/database.types'

type PublicationVersion = {
  id: string
  version_number: number
  storage_path: string
  media_type: string
  points_assigned: number | null
  created_at: string
  created_by: string
}

type VersionHistoryEntry = {
  version_number: number
  changed_by: string
  change_description: string | null
  created_at: string
}

type Props = {
  item: PublicationLatest
  getUrl: (path: string) => Promise<string>
  onVersionAdded?: () => void
}

export default function VersionHistory({ item, getUrl: _getUrl, onVersionAdded }: Props) {
  const { user } = useAuth()
  const { categories, getConfigsForCategory, calculatePoints } = useGalleryPoints()
  const [versions, setVersions] = useState<PublicationVersion[]>([])
  const [history, setHistory] = useState<VersionHistoryEntry[]>([])
  const [newFile, setNewFile] = useState<File | null>(null)
  const [newDescription, setNewDescription] = useState('')
  const [uploadCategory, setUploadCategory] = useState('')
  const [uploadConfigIds, setUploadConfigIds] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    supabase.from('publication_versions').select('id, version_number, storage_path, media_type, points_assigned, created_at, created_by')
      .eq('publication_id', item.id).order('version_number', { ascending: false })
      .then(({ data }) => setVersions((data as PublicationVersion[]) ?? []))
    supabase.from('publication_version_history').select('version_number, changed_by, change_description, created_at')
      .eq('publication_id', item.id).order('created_at', { ascending: false })
      .then(({ data }) => setHistory((data as VersionHistoryEntry[]) ?? []))
  }, [item.id])

  const configsForCategory = uploadCategory ? getConfigsForCategory(uploadCategory) : []
  const toggleConfig = (id: string, isBonus: boolean) => {
    setUploadConfigIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id)
      if (isBonus) return [...prev, id]
      return [...prev.filter((pid) => !configsForCategory.find((c) => c.id === pid && !c.is_bonus)), id]
    })
  }

  const handleAddVersion = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !newFile) return
    setUploading(true)
    try {
      const ext = newFile.name.split('.').pop() || 'jpg'
      const type = newFile.type.startsWith('video/') ? 'video' : newFile.type === 'image/gif' ? 'gif' : 'image'
      const nextVersion = item.version_number + 1
      const path = buildStoragePath({
        authorId: item.author_id,
        projectId: item.project_id ?? undefined,
        publicationId: item.id,
        version: nextVersion,
        filename: `${crypto.randomUUID()}.${ext}`,
      })

      const provider = await getStorageProvider()
      await provider.upload(path, newFile)

      const pointsAssigned = uploadConfigIds.length > 0 ? calculatePoints(uploadConfigIds) : null
      const pointsConfigId = uploadConfigIds.length === 1 && !configsForCategory.find((c) => c.id === uploadConfigIds[0])?.is_bonus
        ? uploadConfigIds[0]
        : null

      await supabase.from('publication_versions').insert({
        publication_id: item.id,
        version_number: nextVersion,
        storage_path: path,
        storage_backend: 'supabase',
        media_type: type,
        points_config_id: pointsConfigId || null,
        points_assigned: pointsAssigned,
        created_by: user.id,
      })

      await supabase.from('publication_version_history').insert({
        publication_id: item.id,
        version_number: nextVersion,
        changed_by: user.id,
        change_description: newDescription.trim() || null,
      })

      await supabase.from('publications').update({ updated_at: new Date().toISOString() }).eq('id', item.id)

      const { data: newVersions } = await supabase.from('publication_versions').select('*')
        .eq('publication_id', item.id).order('version_number', { ascending: false })
      setVersions((newVersions as PublicationVersion[]) ?? [])
      const { data: newHistory } = await supabase.from('publication_version_history').select('*')
        .eq('publication_id', item.id).order('created_at', { ascending: false })
      setHistory((newHistory as VersionHistoryEntry[]) ?? [])
      setNewFile(null)
      setNewDescription('')
      setUploadConfigIds([])
      setUploadCategory('')
      onVersionAdded?.()
    } finally {
      setUploading(false)
    }
  }

  const formatDate = (d: string) => new Date(d).toLocaleString('ru-RU')

  return (
    <div className="version-history">
      <h4>История версий</h4>
      <ul className="version-list">
        {versions.map((v) => (
          <li key={v.id} className="version-item">
            <span className="version-number">v{v.version_number}</span>
            <span className="version-meta">{formatDate(v.created_at)}</span>
            {v.points_assigned != null && <span className="version-points">{v.points_assigned} баллов</span>}
          </li>
        ))}
      </ul>
      {history.length > 0 && (
        <div className="version-history-details">
          <h5>Описания изменений</h5>
          <ul>
            {history.map((h, i) => (
              <li key={i}>
                v{h.version_number} — {formatDate(h.created_at)}: {h.change_description || '(без описания)'}
              </li>
            ))}
          </ul>
        </div>
      )}
      {user && (
        <form onSubmit={handleAddVersion} className="form version-add-form">
          <h5>Добавить версию</h5>
          <label>
            Файл
            <input type="file" accept="image/*,video/*" onChange={(e) => setNewFile(e.target.files?.[0] ?? null)} required={!!newFile} />
          </label>
          <label>
            Описание изменений
            <input value={newDescription} onChange={(e) => setNewDescription(e.target.value)} placeholder="Что изменилось" />
          </label>
          <label>
            Вид работы (для баллов)
            <select value={uploadCategory} onChange={(e) => { setUploadCategory(e.target.value); setUploadConfigIds([]) }}>
              <option value="">—</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </label>
          {uploadCategory && configsForCategory.length > 0 && (
            <label>
              Подвид
              <div className="points-config-list">
                {configsForCategory.map((cfg) => (
                  <label key={cfg.id} className="points-config-item">
                    <input
                      type="checkbox"
                      checked={uploadConfigIds.includes(cfg.id)}
                      onChange={() => toggleConfig(cfg.id, cfg.is_bonus)}
                    />
                    {cfg.subtype} — {cfg.points_min}{cfg.is_bonus ? '+' : `–${cfg.points_max}`} баллов
                  </label>
                ))}
              </div>
              {uploadConfigIds.length > 0 && <p className="points-summary">Итого: {calculatePoints(uploadConfigIds)} баллов</p>}
            </label>
          )}
          <button type="submit" disabled={!newFile || uploading} className="btn btn-primary">
            {uploading ? 'Загрузка...' : 'Добавить версию'}
          </button>
        </form>
      )}
    </div>
  )
}
