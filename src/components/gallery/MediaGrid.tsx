import { useState, useEffect } from 'react'
import MediaCard from './MediaCard'
import type { PublicationLatest } from '@/lib/database.types'

type Props = {
  items: PublicationLatest[]
  getUrl: (path: string) => Promise<string>
  onSelect: (item: PublicationLatest) => void
}

export default function MediaGrid({ items, getUrl, onSelect }: Props) {
  const [urls, setUrls] = useState<Record<string, string>>({})

  useEffect(() => {
    const load = async () => {
      const entries = await Promise.all(
        items.map(async (item) => {
          const url = await getUrl(item.storage_path)
          return [item.storage_path, url] as const
        })
      )
      setUrls((prev) => ({ ...prev, ...Object.fromEntries(entries) }))
    }
    if (items.length > 0) load()
  }, [items, getUrl])

  return (
    <div className="media-grid">
      {items.map((item) => (
        <MediaCard
          key={item.id}
          item={item}
          url={urls[item.storage_path] ?? ''}
          onClick={() => onSelect(item)}
        />
      ))}
    </div>
  )
}
