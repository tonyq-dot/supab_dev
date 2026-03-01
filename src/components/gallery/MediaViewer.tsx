import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import TagManager from './TagManager'
import PublishDialog from './PublishDialog'
import ImageEffectsPanel from './ImageEffectsPanel'
import VideoPlayer from './VideoPlayer'
import VersionHistory from './VersionHistory'
import type { PublicationLatest } from '@/lib/database.types'

type Props = {
  item: PublicationLatest
  url?: string
  getUrl?: () => Promise<string>
  onClose: () => void
  onRefresh?: () => void
  extraActions?: React.ReactNode
}

export default function MediaViewer({ item, url: urlProp, getUrl, onClose, onRefresh, extraActions }: Props) {
  const [activeTab, setActiveTab] = useState<'view' | 'tags' | 'effects' | 'publish' | 'versions'>('view')
  const [url, setUrl] = useState<string>(urlProp ?? '')
  const [title, setTitle] = useState<string>(item.title ?? '')
  const [editingTitle, setEditingTitle] = useState(false)
  const isVideo = item.media_type === 'video'

  const handleSaveTitle = async () => {
    await supabase.from('publications').update({ title: title.trim() || null }).eq('id', item.id)
    setEditingTitle(false)
    onRefresh?.()
  }

  useEffect(() => {
    if (urlProp) setUrl(urlProp)
    else if (getUrl) getUrl().then(setUrl)
  }, [urlProp, getUrl, item.storage_path])

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal media-viewer-modal" onClick={(e) => e.stopPropagation()}>
        <div className="media-viewer-header">
          <h3>Просмотр</h3>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            {extraActions}
            <button type="button" onClick={onClose} className="btn btn-outline">Закрыть</button>
          </div>
        </div>
        <div className="media-viewer-tabs">
          <button type="button" className={activeTab === 'view' ? 'active' : ''} onClick={() => setActiveTab('view')}>Просмотр</button>
          <button type="button" className={activeTab === 'tags' ? 'active' : ''} onClick={() => setActiveTab('tags')}>Теги</button>
          {!isVideo && (
            <button type="button" className={activeTab === 'effects' ? 'active' : ''} onClick={() => setActiveTab('effects')}>Эффекты</button>
          )}
          <button type="button" className={activeTab === 'publish' ? 'active' : ''} onClick={() => setActiveTab('publish')}>Публикация</button>
          <button type="button" className={activeTab === 'versions' ? 'active' : ''} onClick={() => setActiveTab('versions')}>Версии</button>
        </div>
        <div className="media-viewer-content">
          {activeTab === 'view' && (
            <div className="media-viewer-main">
              <div className="media-viewer-title-row">
                {editingTitle ? (
                  <>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Название"
                      className="media-viewer-title-input"
                      autoFocus
                    />
                    <button type="button" onClick={handleSaveTitle} className="btn btn-sm btn-primary">Сохранить</button>
                    <button type="button" onClick={() => { setTitle(item.title ?? ''); setEditingTitle(false) }} className="btn btn-sm btn-outline">Отмена</button>
                  </>
                ) : (
                  <>
                    <span className="media-viewer-title">{title || '(без названия)'}</span>
                    <button type="button" onClick={() => setEditingTitle(true)} className="btn btn-sm btn-outline">Изменить</button>
                  </>
                )}
              </div>
              {!url ? (
                <p>Загрузка...</p>
              ) : isVideo ? (
                <VideoPlayer mediaId={item.id} url={url} />
              ) : (
                <img src={url} alt="" style={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain' }} />
              )}
            </div>
          )}
          {activeTab === 'tags' && <TagManager mediaId={item.id} />}
          {activeTab === 'effects' && !isVideo && url && <ImageEffectsPanel imageUrl={url} />}
          {activeTab === 'publish' && <PublishDialog item={item} url={url} onClose={onClose} />}
          {activeTab === 'versions' && getUrl && (
            <VersionHistory item={item} getUrl={getUrl} onVersionAdded={onRefresh} />
          )}
        </div>
      </div>
    </div>
  )
}
