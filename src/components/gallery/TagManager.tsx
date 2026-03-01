import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

type Tag = { id: string; name: string }
type MediaTag = { id: string; media_id: string; tag_id: string }

type Props = {
  mediaId: string
  onTagsChange?: () => void
}

export default function TagManager({ mediaId, onTagsChange }: Props) {
  const { user } = useAuth()
  const [allTags, setAllTags] = useState<Tag[]>([])
  const [mediaTags, setMediaTags] = useState<MediaTag[]>([])
  const [newTagName, setNewTagName] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('tags').select('id, name').order('name').then(({ data }) => setAllTags(data ?? []))
    supabase.from('media_tags').select('*').eq('media_id', mediaId).then(({ data }) => setMediaTags(data ?? []))
      .finally(() => setLoading(false))
  }, [mediaId])

  const appliedTagIds = new Set(mediaTags.map((mt) => mt.tag_id))

  const handleAddTag = async (tagId: string) => {
    await supabase.from('media_tags').insert({ media_id: mediaId, tag_id: tagId })
    const { data } = await supabase.from('media_tags').select('*').eq('media_id', mediaId)
    setMediaTags(data ?? [])
    onTagsChange?.()
  }

  const handleRemoveTag = async (tagId: string) => {
    await supabase.from('media_tags').delete().eq('media_id', mediaId).eq('tag_id', tagId)
    setMediaTags((prev) => prev.filter((mt) => mt.tag_id !== tagId))
    onTagsChange?.()
  }

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return
    const { data: tag } = await supabase.from('tags').insert({ name: newTagName.trim() }).select().single()
    if (tag) {
      setAllTags((prev) => [...prev, tag].sort((a, b) => a.name.localeCompare(b.name)))
      await handleAddTag(tag.id)
      setNewTagName('')
    }
  }

  if (loading) return <p>Загрузка...</p>

  return (
    <div className="tag-manager">
      <h4>Теги</h4>
      <div className="tag-manager-applied">
        {mediaTags.map((mt) => {
          const tag = allTags.find((t) => t.id === mt.tag_id)
          return tag ? (
            <span key={mt.id} className="tag-badge">
              {tag.name}
              <button type="button" onClick={() => handleRemoveTag(tag.id)} className="tag-remove">×</button>
            </span>
          ) : null
        })}
      </div>
      <div className="tag-manager-add">
        <select
          value=""
          onChange={(e) => {
            const id = e.target.value
            if (id) handleAddTag(id)
          }}
        >
          <option value="">Добавить тег...</option>
          {allTags.filter((t) => !appliedTagIds.has(t.id)).map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
      </div>
      {user && (
        <div className="tag-manager-create">
          <input
            value={newTagName}
            onChange={(e) => setNewTagName(e.target.value)}
            placeholder="Новый тег"
            onKeyDown={(e) => e.key === 'Enter' && handleCreateTag()}
          />
          <button type="button" onClick={handleCreateTag} className="btn btn-sm">Создать</button>
        </div>
      )}
    </div>
  )
}
