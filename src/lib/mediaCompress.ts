// src/lib/mediaCompress.ts
// =====================================================================
// 🗜️ ضغط الميديا في المتصفح قبل الرفع — من غير أي مكتبة خارجية.
//  • الصور  → canvas → WebP بعرض أقصى 1600px (بيوفّر ٧٠–٩٠٪ من الحجم)
//  • الفيديو → إعادة ترميز 720p بـMediaRecorder (بيوفّر ٦٠–٨٥٪)
//  • الـPDF  → مبيتضغطش في المتصفح؛ بنتحقق من الحد الأقصى ونقول للمستخدم
// الهدف: الجودة تفضل كويسة والحجم يفضل صغير — الصفحة تفتح بسرعة على الموبايل.
// =====================================================================
'use client'

import { UPLOAD_LIMITS } from '@/lib/projects'

export type Progress = (pct: number, label: string) => void

// captureStream لسه مش في الـtypes الرسمية لـHTMLVideoElement
type CapturableVideo = HTMLVideoElement & { captureStream?: () => MediaStream }

const MAX_IMAGE_EDGE = 1600
const VIDEO_MAX_HEIGHT = 720
const VIDEO_BITRATE = 1_200_000 // 1.2 Mbps — كفاية لبروشور فيديو
const AUDIO_BITRATE = 96_000

function mb(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)} ميجا`
}

/** ضغط صورة: تصغير + تحويل لـWebP */
export async function compressImage(file: File, onProgress?: Progress): Promise<File> {
  onProgress?.(10, 'بيقرأ الصورة…')
  const bitmap = await createImageBitmap(file)

  const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(bitmap.width, bitmap.height))
  const w = Math.round(bitmap.width * scale)
  const h = Math.round(bitmap.height * scale)

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) return file
  ctx.drawImage(bitmap, 0, 0, w, h)
  bitmap.close()

  onProgress?.(60, 'بيضغط…')
  const blob = await new Promise<Blob | null>((res) =>
    canvas.toBlob(res, 'image/webp', 0.82),
  )
  onProgress?.(100, 'خلص')

  if (!blob || blob.size >= file.size) return file
  return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.webp', { type: 'image/webp' })
}

/** أفضل صيغة webm يدعمها المتصفح للتسجيل */
function pickVideoMime(): string | null {
  const candidates = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
  ]
  for (const c of candidates) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(c)) return c
  }
  return null
}

/**
 * ضغط فيديو: بنشغّله مخفي، بناخد الستريم بتاعه بـcaptureStream،
 * وبنعيد ترميزه 720p بـ1.2Mbps. بياخد وقت زي مدة الفيديو تقريباً.
 * لو المتصفح مش داعم → بنرجّع الملف زي ما هو (والحد الأقصى بيتفحص برّه).
 */
export async function compressVideo(file: File, onProgress?: Progress): Promise<File> {
  const mime = pickVideoMime()
  const video = document.createElement('video') as CapturableVideo

  if (!mime || typeof video.captureStream !== 'function') {
    onProgress?.(100, 'المتصفح مش داعم الضغط — هيترفع زي ما هو')
    return file
  }

  const url = URL.createObjectURL(file)
  try {
    video.src = url
    video.muted = true
    video.playsInline = true

    await new Promise<void>((res, rej) => {
      video.onloadedmetadata = () => res()
      video.onerror = () => rej(new Error('مش قادر أقرا الفيديو'))
    })

    // لو الفيديو أصلاً صغير و720p أو أقل → مفيش داعي نعيد ترميزه
    if (video.videoHeight <= VIDEO_MAX_HEIGHT && file.size <= 12 * 1024 * 1024) {
      onProgress?.(100, 'الفيديو صغير أصلاً — مش محتاج ضغط')
      return file
    }

    const duration = video.duration || 0
    const stream = video.captureStream!()
    const recorder = new MediaRecorder(stream, {
      mimeType: mime,
      videoBitsPerSecond: VIDEO_BITRATE,
      audioBitsPerSecond: AUDIO_BITRATE,
    })

    const chunks: BlobPart[] = []
    recorder.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data) }

    const done = new Promise<void>((res) => { recorder.onstop = () => res() })

    recorder.start(1000)
    await video.play()

    const tick = window.setInterval(() => {
      if (duration > 0) {
        const pct = Math.min(97, Math.round((video.currentTime / duration) * 100))
        onProgress?.(pct, `بيضغط الفيديو… ${pct}%`)
      }
    }, 400)

    await new Promise<void>((res) => { video.onended = () => res() })
    window.clearInterval(tick)
    recorder.stop()
    await done

    const blob = new Blob(chunks, { type: 'video/webm' })
    onProgress?.(100, `خلص — ${mb(file.size)} ← ${mb(blob.size)}`)

    if (blob.size >= file.size) return file
    return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.webm', { type: 'video/webm' })
  } catch {
    onProgress?.(100, 'الضغط فشل — هيترفع زي ما هو')
    return file
  } finally {
    URL.revokeObjectURL(url)
    video.remove()
  }
}

export type Kind = 'image' | 'pdf' | 'video'

/** ضغط + تحقق من الحجم، وبعدين رفع مباشر لـSupabase Storage بـsigned URL */
export async function prepareAndUpload(
  file: File,
  kind: Kind,
  slug: string,
  onProgress?: Progress,
): Promise<{ url: string; name: string; size: number }> {
  let out = file

  if (kind === 'image') out = await compressImage(file, onProgress)
  else if (kind === 'video') out = await compressVideo(file, onProgress)
  else onProgress?.(50, 'بيجهّز الـPDF…')

  if (out.size > UPLOAD_LIMITS[kind]) {
    const limit = Math.round(UPLOAD_LIMITS[kind] / (1024 * 1024))
    throw new Error(
      kind === 'pdf'
        ? `البروشور ${mb(out.size)} — الحد الأقصى ${limit} ميجا. اضغطه الأول (مثلاً من ilovepdf.com) وارفعه تاني 🙏`
        : `الملف لسه كبير (${mb(out.size)}) والحد ${limit} ميجا. جرّب ملف أصغر 🙏`,
    )
  }

  onProgress?.(70, 'بيرفع…')

  const signRes = await fetch('/api/projects/upload-url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ kind, mime: out.type, size: out.size, slug }),
  })
  const signed = await signRes.json()
  if (!signRes.ok) throw new Error(signed?.error || 'فشل تجهيز الرفع')

  const putRes = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/upload/sign/${signed.bucket}/${signed.path}?token=${signed.token}`,
    { method: 'PUT', headers: { 'Content-Type': out.type }, body: out },
  )
  if (!putRes.ok) throw new Error('فشل الرفع — جرب تاني')

  onProgress?.(100, 'اترفع ✅')
  return { url: signed.publicUrl, name: out.name, size: out.size }
}
