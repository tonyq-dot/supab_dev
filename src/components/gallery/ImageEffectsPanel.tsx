import { useState } from 'react'
import { applyEffect, type EffectType } from '@/services/imageEffectsService'

type Props = {
  imageUrl: string
}

export default function ImageEffectsPanel({ imageUrl }: Props) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleEffect = async (effect: EffectType) => {
    setLoading(true)
    const result = await applyEffect(imageUrl, effect)
    setPreviewUrl(result)
    setLoading(false)
  }

  const handleDownload = () => {
    if (!previewUrl) return
    const a = document.createElement('a')
    a.href = previewUrl
    a.download = `effect_${Date.now()}.png`
    a.click()
  }

  return (
    <div className="effects-panel">
      <h4>Эффекты</h4>
      <div className="effects-buttons">
        <button type="button" onClick={() => handleEffect('grayscale')} disabled={loading} className="btn btn-outline">
          Чёрно-белое
        </button>
        <button type="button" onClick={() => handleEffect('sepia')} disabled={loading} className="btn btn-outline">
          Сепия
        </button>
      </div>
      {previewUrl && (
        <div className="effects-preview">
          <img src={previewUrl} alt="Preview" style={{ maxWidth: '100%', maxHeight: 300 }} />
          <button type="button" onClick={handleDownload} className="btn btn-primary">Скачать</button>
        </div>
      )}
    </div>
  )
}
