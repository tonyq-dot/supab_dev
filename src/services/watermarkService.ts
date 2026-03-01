/**
 * Apply watermark (text) to image
 */
export async function applyWatermark(
  imageUrl: string,
  text: string,
  options?: { opacity?: number; fontSize?: number }
): Promise<string> {
  const img = await loadImage(imageUrl)
  const canvas = document.createElement('canvas')
  canvas.width = img.width
  canvas.height = img.height
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(img, 0, 0)
  ctx.save()
  ctx.globalAlpha = options?.opacity ?? 0.5
  ctx.font = `${options?.fontSize ?? 48}px sans-serif`
  ctx.fillStyle = '#ffffff'
  ctx.strokeStyle = '#000000'
  ctx.lineWidth = 2
  const x = canvas.width / 2
  const y = canvas.height / 2
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.strokeText(text, x, y)
  ctx.fillText(text, x, y)
  ctx.restore()
  return canvas.toDataURL('image/png')
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = url
  })
}
