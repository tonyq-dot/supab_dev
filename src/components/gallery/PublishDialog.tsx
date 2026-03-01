import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { applyWatermark } from '@/services/watermarkService'
import type { PublicationLatest } from '@/lib/database.types'

type Props = {
  item: PublicationLatest
  url: string
  onClose: () => void
}

export default function PublishDialog({ item, url, onClose }: Props) {
  const [withWatermark, setWithWatermark] = useState(false)
  const [watermarkText, setWatermarkText] = useState('Компания')
  const [publishedUrl, setPublishedUrl] = useState<string | null>(item.published_url)
  const [loading, setLoading] = useState(false)

  const handlePublish = async () => {
    setPublishedUrl(url)
    await supabase.from('publications').update({ is_published: true, published_url: url }).eq('id', item.id)
  }

  const handleDownloadWithWatermark = async () => {
    if (item.media_type !== 'image' && item.media_type !== 'gif') return
    setLoading(true)
    const dataUrl = await applyWatermark(url, watermarkText)
    const a = document.createElement('a')
    a.href = dataUrl
    a.download = `watermarked_${item.id}.png`
    a.click()
    setLoading(false)
  }

  const handleCopy = () => {
    const link = publishedUrl || url
    navigator.clipboard.writeText(link)
  }

  return (
    <div className="publish-dialog">
      <h4>Публикация для заказчика</h4>
      {!publishedUrl ? (
        <>
          <button type="button" onClick={handlePublish} className="btn btn-primary">
            Опубликовать
          </button>
          {item.media_type !== 'video' && (
            <>
              <label className="checkbox-label" style={{ marginTop: '1rem' }}>
                <input type="checkbox" checked={withWatermark} onChange={(e) => setWithWatermark(e.target.checked)} />
                Водяной знак при скачивании
              </label>
              {withWatermark && (
                <>
                  <label>
                    Текст водяного знака
                    <input value={watermarkText} onChange={(e) => setWatermarkText(e.target.value)} />
                  </label>
                  <button type="button" onClick={handleDownloadWithWatermark} disabled={loading} className="btn btn-outline">
                    {loading ? '...' : 'Скачать с водяным знаком'}
                  </button>
                </>
              )}
            </>
          )}
        </>
      ) : (
        <>
          <p className="hint">Ссылка для заказчика:</p>
          <div className="publish-url-row">
            <input readOnly value={publishedUrl} className="publish-url-input" />
            <button type="button" onClick={handleCopy} className="btn btn-outline">Копировать</button>
          </div>
        </>
      )}
    </div>
  )
}
