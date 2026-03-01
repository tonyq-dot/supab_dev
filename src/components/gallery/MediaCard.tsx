import type { PublicationLatest } from '@/lib/database.types'

type Props = {
  item: PublicationLatest
  url: string
  onClick: () => void
}

export default function MediaCard({ item, url, onClick }: Props) {
  const isVideo = item.media_type === 'video'
  return (
    <div className="media-card" onClick={onClick} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && onClick()}>
      <div className="media-card-preview">
        {url ? (
          isVideo ? (
            <video src={url} muted preload="metadata" />
          ) : (
            <img src={url} alt="" loading="lazy" />
          )
        ) : (
          <div className="media-card-placeholder">Загрузка...</div>
        )}
        {isVideo && <span className="media-card-badge">Видео</span>}
        {item.version_number > 1 && <span className="media-card-badge media-card-version">v{item.version_number}</span>}
      </div>
    </div>
  )
}
