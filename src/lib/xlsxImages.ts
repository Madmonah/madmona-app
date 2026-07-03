// استخراج الصور المدفونة جوه ملف Excel (.xlsx) ومابنجها على صفوف الشيت.
// ملف الـ xlsx هو ZIP — بنقراه يدوي وبنفك الضغط بـ DecompressionStream (مدعومة في كل المتصفحات الحديثة).
// مفيش أي dependency جديدة.

type ZipEntry = { name: string; method: number; data: Uint8Array }

function readZipEntries(buf: ArrayBuffer): ZipEntry[] {
  const dv = new DataView(buf)
  const u8 = new Uint8Array(buf)
  // دور على End Of Central Directory من الآخر
  let eocd = -1
  const min = Math.max(0, u8.length - 22 - 65535)
  for (let i = u8.length - 22; i >= min; i--) {
    if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break }
  }
  if (eocd < 0) throw new Error('not a zip')
  const count = dv.getUint16(eocd + 10, true)
  let off = dv.getUint32(eocd + 16, true)
  const entries: ZipEntry[] = []
  const td = new TextDecoder()
  for (let n = 0; n < count; n++) {
    if (dv.getUint32(off, true) !== 0x02014b50) break
    const method = dv.getUint16(off + 10, true)
    const compSize = dv.getUint32(off + 20, true)
    const nameLen = dv.getUint16(off + 28, true)
    const extraLen = dv.getUint16(off + 30, true)
    const commentLen = dv.getUint16(off + 32, true)
    const localOff = dv.getUint32(off + 42, true)
    const name = td.decode(u8.slice(off + 46, off + 46 + nameLen))
    const lNameLen = dv.getUint16(localOff + 26, true)
    const lExtraLen = dv.getUint16(localOff + 28, true)
    const dataStart = localOff + 30 + lNameLen + lExtraLen
    entries.push({ name, method, data: u8.slice(dataStart, dataStart + compSize) })
    off += 46 + nameLen + extraLen + commentLen
  }
  return entries
}

async function inflate(e: ZipEntry): Promise<Uint8Array> {
  if (e.method === 0) return e.data
  const ds = new DecompressionStream('deflate-raw')
  const stream = new Blob([e.data as BlobPart]).stream().pipeThrough(ds)
  return new Uint8Array(await new Response(stream).arrayBuffer())
}

function mimeFor(path: string): string {
  const ext = (path.split('.').pop() || '').toLowerCase()
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg'
  if (ext === 'webp') return 'image/webp'
  if (ext === 'gif') return 'image/gif'
  return 'image/png'
}

/**
 * بيرجّع Map: رقم صف الشيت (0-based، صف العناوين = 0) -> Blob بتاع الصورة.
 * يعني الصف الأول من الداتا = 1.
 */
export async function extractRowImages(buf: ArrayBuffer): Promise<Map<number, Blob>> {
  const map = new Map<number, Blob>()
  let entries: ZipEntry[]
  try { entries = readZipEntries(buf) } catch { return map }
  const byName = new Map(entries.map(e => [e.name, e] as const))
  const td = new TextDecoder()

  const drawings = entries.filter(e => /^xl\/drawings\/drawing\d+\.xml$/.test(e.name))
  for (const drawing of drawings) {
    let drawingXml = ''
    try { drawingXml = td.decode(await inflate(drawing)) } catch { continue }
    const relsEntry = byName.get(`xl/drawings/_rels/${drawing.name.split('/').pop()}.rels`)
    if (!relsEntry) continue
    const relsXml = td.decode(await inflate(relsEntry))

    // rId -> media path
    const relMap = new Map<string, string>()
    for (const rel of relsXml.matchAll(/<Relationship\b[^>]*>/g)) {
      const tag = rel[0]
      const id = tag.match(/\bId="([^"]+)"/)?.[1]
      const target = tag.match(/\bTarget="([^"]+)"/)?.[1]
      if (id && target) relMap.set(id, target.replace(/^\.\.\//, 'xl/').replace(/^\/xl\//, 'xl/'))
    }

    const anchorRe = /<xdr:(?:twoCellAnchor|oneCellAnchor)\b[^>]*>([\s\S]*?)<\/xdr:(?:twoCellAnchor|oneCellAnchor)>/g
    for (const a of drawingXml.matchAll(anchorRe)) {
      const inner = a[1]
      const rowM = inner.match(/<xdr:from>[\s\S]*?<xdr:row>(\d+)<\/xdr:row>/)
      const embedM = inner.match(/r:embed="([^"]+)"/)
      if (!rowM || !embedM) continue
      const target = relMap.get(embedM[1])
      if (!target) continue
      const media = byName.get(target)
      if (!media) continue
      try {
        const data = await inflate(media)
        const row = Number(rowM[1])
        if (!map.has(row)) map.set(row, new Blob([data as BlobPart], { type: mimeFor(target) }))
      } catch { /* skip broken image */ }
    }
  }
  return map
}

/** بيرفع صورة مستخرجة على ستوردج مضمونة وبيرجّع لينك عام */
export async function uploadExtractedImage(blob: Blob, supplierId: string, kind: string, name: string): Promise<string | null> {
  try {
    const ext = blob.type.includes('jpeg') ? 'jpg' : blob.type.includes('webp') ? 'webp' : blob.type.includes('gif') ? 'gif' : 'png'
    const safe = name.replace(/[^\w؀-ۿ-]+/g, '-').slice(0, 40) || 'img'
    const fd = new FormData()
    fd.append('file', new File([blob], `${safe}.${ext}`, { type: blob.type }))
    fd.append('supplierId', supplierId)
    fd.append('kind', kind)
    const res = await fetch('/api/supplier/upload-media', { method: 'POST', body: fd })
    const j = await res.json().catch(() => null)
    return j?.success ? (j.url as string) : null
  } catch { return null }
}
