import { useRef, useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

type VideoComment = {
  id: string
  timestamp_sec: number
  text: string
  author_id: string
  created_at: string
}

type Props = {
  mediaId: string
  url: string
}

function formatTime(sec: number) {
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export default function VideoPlayer({ mediaId, url }: Props) {
  const { user } = useAuth()
  const videoRef = useRef<HTMLVideoElement>(null)
  const [comments, setComments] = useState<VideoComment[]>([])
  const [newComment, setNewComment] = useState('')
  const [currentTime, setCurrentTime] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('video_comments').select('*').eq('media_id', mediaId).order('timestamp_sec')
      .then(({ data }) => setComments((data as VideoComment[]) ?? []))
      .finally(() => setLoading(false))
  }, [mediaId])

  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    const onTimeUpdate = () => setCurrentTime(v.currentTime)
    v.addEventListener('timeupdate', onTimeUpdate)
    return () => v.removeEventListener('timeupdate', onTimeUpdate)
  }, [])

  const seekTo = (sec: number) => {
    const v = videoRef.current
    if (v) {
      v.currentTime = sec
      v.play()
    }
  }

  const handleAddComment = async () => {
    if (!user || !newComment.trim()) return
    const { data } = await supabase.from('video_comments').insert({
      media_id: mediaId,
      timestamp_sec: currentTime,
      text: newComment.trim(),
      author_id: user.id,
    }).select().single()
    if (data) {
      setComments((prev) => [...prev, data as VideoComment].sort((a, b) => a.timestamp_sec - b.timestamp_sec))
      setNewComment('')
    }
  }

  const handleExportComments = () => {
    const rows = comments.map((c) => ({ timestamp: formatTime(c.timestamp_sec), timestamp_sec: c.timestamp_sec, text: c.text }))
    const blob = new Blob([JSON.stringify({ mediaId, comments: rows }, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `comments_${mediaId}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const handleExportCSV = () => {
    const lines = ['timestamp_sec;time;text', ...comments.map((c) => `${c.timestamp_sec};${formatTime(c.timestamp_sec)};${c.text.replace(/;/g, ',')}`)]
    const blob = new Blob(['\ufeff' + lines.join('\n')], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `comments_${mediaId}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  return (
    <div className="video-player">
      <video ref={videoRef} src={url} controls style={{ maxWidth: '100%', maxHeight: '50vh' }} />
      <div className="video-comments">
        <h4>Комментарии по времени</h4>
        <div className="video-comments-add">
          <input
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder={`Комментарий (${formatTime(currentTime)})`}
            onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
          />
          <button type="button" onClick={handleAddComment} disabled={!newComment.trim()} className="btn btn-primary">
            Добавить
          </button>
        </div>
        <div className="video-comments-export">
          <button type="button" onClick={handleExportComments} className="btn btn-sm btn-outline">JSON</button>
          <button type="button" onClick={handleExportCSV} className="btn btn-sm btn-outline">CSV</button>
        </div>
        <ul className="video-comments-list">
          {comments.map((c) => (
            <li key={c.id} className="video-comment-item" onClick={() => seekTo(c.timestamp_sec)}>
              <span className="video-comment-time">{formatTime(c.timestamp_sec)}</span>
              <span className="video-comment-text">{c.text}</span>
            </li>
          ))}
        </ul>
        {comments.length === 0 && !loading && <p className="hint">Нет комментариев</p>}
      </div>
    </div>
  )
}
