'use client'
// 📷 (٩/٩/٢٠٢٦) محمد: «يوثّق بصورة ومتنساش تقلل الجودة». ضغط الصورة في المتصفح
// قبل الرفع: أطول ضلع ١٢٨٠ بكسل · JPEG بجودة ٠.٧٢ — صورة الموبايل من ٤ ميجا لـ~١٥٠ كيلو.
export async function compressImage(file: File, opts: { maxSide?: number; quality?: number } = {}): Promise<{ dataBase64: string; mimetype: string; bytes: number }> {
  const maxSide = opts.maxSide ?? 1280
  const quality = opts.quality ?? 0.72
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
  const w = Math.max(1, Math.round(bitmap.width * scale))
  const h = Math.max(1, Math.round(bitmap.height * scale))
  const canvas = document.createElement('canvas')
  canvas.width = w; canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('canvas')
  ctx.drawImage(bitmap, 0, 0, w, h)
  bitmap.close?.()
  const dataUrl = canvas.toDataURL('image/jpeg', quality)
  const dataBase64 = dataUrl.replace(/^data:[^;]+;base64,/, '')
  return { dataBase64, mimetype: 'image/jpeg', bytes: Math.round(dataBase64.length * 0.75) }
}
