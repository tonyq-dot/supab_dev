import { useState, useCallback, useRef, useEffect } from 'react'

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']

function fileFromBlob(blob: Blob, filename: string): File {
  return new File([blob], filename, { type: blob.type })
}

type Props = {
  value: File | null
  onChange: (file: File | null) => void
  placeholder?: string
}

export default function ImageDropZone({ value, onChange, placeholder = 'Перетащите изображение сюда или вставьте из буфера (Ctrl+V)' }: Props) {
  const [isDragging, setIsDragging] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [screenCaptureError, setScreenCaptureError] = useState<string | null>(null)
  const [showCropModal, setShowCropModal] = useState(false)
  const [cropStream, setCropStream] = useState<MediaStream | null>(null)
  const [cropRect, setCropRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null)
  const [videoSize, setVideoSize] = useState<{ w: number; h: number } | null>(null)
  const [isSelecting, setIsSelecting] = useState(false)
  const [selectStart, setSelectStart] = useState<{ x: number; y: number } | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const setFile = useCallback(
    (file: File | null) => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
      setPreviewUrl(null)
      if (file) {
        const url = URL.createObjectURL(file)
        setPreviewUrl(url)
      }
      onChange(file)
    },
    [onChange, previewUrl]
  )

  useEffect(() => {
    if (value) {
      const url = URL.createObjectURL(value)
      setPreviewUrl(url)
      return () => URL.revokeObjectURL(url)
    }
    setPreviewUrl(null)
  }, [value])

  const validateAndSet = useCallback(
    (file: File) => {
      if (!ACCEPTED_TYPES.includes(file.type)) return
      setFile(file)
    },
    [setFile]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      const file = e.dataTransfer.files?.[0]
      if (file) validateAndSet(file)
    },
    [validateAndSet]
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDragging(false)
  }, [])

  const handlePaste = useCallback(
    (e: ClipboardEvent) => {
      const items = e.clipboardData?.items
      if (!items) return
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          e.preventDefault()
          const file = item.getAsFile()
          if (file) validateAndSet(file)
          break
        }
      }
    },
    [validateAndSet]
  )

  useEffect(() => {
    document.addEventListener('paste', handlePaste)
    return () => document.removeEventListener('paste', handlePaste)
  }, [handlePaste])

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) validateAndSet(file)
      e.target.value = ''
    },
    [validateAndSet]
  )

  const handleClear = useCallback(() => {
    setFile(null)
  }, [setFile])

  // Screen capture with region selection
  const startScreenCapture = useCallback(async () => {
    setScreenCaptureError(null)
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      })
      setCropStream(stream)
      setShowCropModal(true)
      setCropRect(null)
      setVideoSize(null)
    } catch (err) {
      setScreenCaptureError(err instanceof Error ? err.message : 'Не удалось захватить экран')
    }
  }, [])

  const stopScreenCapture = useCallback(() => {
    cropStream?.getTracks().forEach((t) => t.stop())
    setCropStream(null)
    setShowCropModal(false)
    setCropRect(null)
    setScreenCaptureError(null)
  }, [cropStream])

  const handleVideoLoaded = useCallback(() => {
    if (videoRef.current) {
      setVideoSize({ w: videoRef.current.videoWidth, h: videoRef.current.videoHeight })
    }
    setCropRect(null)
  }, [])

  const handleCropMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!videoRef.current) return
      const rect = videoRef.current.getBoundingClientRect()
      const scaleX = videoRef.current.videoWidth / rect.width
      const scaleY = videoRef.current.videoHeight / rect.height
      const x = Math.round((e.clientX - rect.left) * scaleX)
      const y = Math.round((e.clientY - rect.top) * scaleY)
      setIsSelecting(true)
      setSelectStart({ x, y })
      setCropRect({ x, y, w: 0, h: 0 })
    },
    []
  )

  const handleCropMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!isSelecting || !selectStart || !videoRef.current) return
      const rect = videoRef.current.getBoundingClientRect()
      const scaleX = videoRef.current.videoWidth / rect.width
      const scaleY = videoRef.current.videoHeight / rect.height
      const x = Math.round((e.clientX - rect.left) * scaleX)
      const y = Math.round((e.clientY - rect.top) * scaleY)
      const left = Math.min(selectStart.x, x)
      const top = Math.min(selectStart.y, y)
      const w = Math.abs(x - selectStart.x)
      const h = Math.abs(y - selectStart.y)
      setCropRect({ x: left, y: top, w, h })
    },
    [isSelecting, selectStart]
  )

  const handleCropMouseUp = useCallback(() => {
    setIsSelecting(false)
    setSelectStart(null)
  }, [])

  const captureToFile = useCallback(
    (useCrop: boolean) => {
      if (!videoRef.current || !cropStream) return
      const video = videoRef.current
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      const r = useCrop ? cropRect : null
      if (r && r.w > 0 && r.h > 0) {
        canvas.width = r.w
        canvas.height = r.h
        ctx.drawImage(video, r.x, r.y, r.w, r.h, 0, 0, r.w, r.h)
      } else {
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        ctx.drawImage(video, 0, 0)
      }

      canvas.toBlob(
        (blob) => {
          if (blob) {
            const file = fileFromBlob(blob, `screenshot-${Date.now()}.png`)
            setFile(file)
          }
          stopScreenCapture()
        },
        'image/png',
        0.95
      )
    },
    [cropRect, cropStream, setFile, stopScreenCapture]
  )

  const handleConfirmCrop = useCallback(() => captureToFile(true), [captureToFile])
  const handleCaptureFull = useCallback(() => captureToFile(false), [captureToFile])

  return (
    <div className="image-drop-zone-wrap">
      <div
        ref={containerRef}
        className={`image-drop-zone ${isDragging ? 'is-dragging' : ''} ${previewUrl ? 'has-preview' : ''}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        {previewUrl ? (
          <div className="image-drop-preview">
            <img src={previewUrl} alt="Превью" />
            <div className="image-drop-actions">
              <label className="btn btn-outline btn-sm">
                Заменить
                <input
                  type="file"
                  accept={ACCEPTED_TYPES.join(',')}
                  onChange={handleFileInput}
                  hidden
                />
              </label>
              <button type="button" className="btn btn-outline btn-sm" onClick={handleClear}>
                Удалить
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="image-drop-content">
              <svg className="image-drop-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
              <p className="image-drop-text">{placeholder}</p>
              <div className="image-drop-buttons">
                <label className="btn btn-outline btn-sm">
                  Выбрать файл
                  <input
                    type="file"
                    accept={ACCEPTED_TYPES.join(',')}
                    onChange={handleFileInput}
                    hidden
                  />
                </label>
                <button type="button" className="btn btn-outline btn-sm" onClick={startScreenCapture}>
                  Скриншот региона
                </button>
              </div>
            </div>
          </>
        )}
      </div>
      {screenCaptureError && <p className="image-drop-error">{screenCaptureError}</p>}

      {showCropModal && cropStream && (
        <div className="modal-overlay" onClick={stopScreenCapture}>
          <div className="image-crop-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Выберите регион экрана</h3>
            <p className="image-crop-hint">Перетащите мышью для выделения области или нажмите «Захватить всё»</p>
            <div
              className="image-crop-video-wrap"
              onMouseDown={handleCropMouseDown}
              onMouseMove={handleCropMouseMove}
              onMouseUp={handleCropMouseUp}
              onMouseLeave={handleCropMouseUp}
            >
              <video
                ref={videoRef}
                srcObject={cropStream}
                autoPlay
                muted
                playsInline
                onLoadedMetadata={handleVideoLoaded}
                onLoadedData={handleVideoLoaded}
              />
              {cropRect && cropRect.w > 0 && cropRect.h > 0 && videoSize && (
                <div
                  className="image-crop-overlay"
                  style={{
                    left: (cropRect.x / videoSize.w) * 100 + '%',
                    top: (cropRect.y / videoSize.h) * 100 + '%',
                    width: (cropRect.w / videoSize.w) * 100 + '%',
                    height: (cropRect.h / videoSize.h) * 100 + '%',
                  }}
                />
              )}
            </div>
            <div className="image-crop-actions">
              <button type="button" className="btn btn-outline" onClick={stopScreenCapture}>
                Отмена
              </button>
              <button type="button" className="btn btn-outline" onClick={handleCaptureFull}>
                Захватить всё
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleConfirmCrop}
                disabled={!cropRect || cropRect.w < 10 || cropRect.h < 10}
              >
                Использовать выделенную область
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
