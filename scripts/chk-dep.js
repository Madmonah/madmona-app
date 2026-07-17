// أفحص النسخة المنشورة فعلاً — فيها إصلاح الفيديو ولا لأ؟
const fs = require('fs'), path = require('path');
const d = 'C:\\Users\\solutions\\AppData\\Roaming\\Claude\\local-agent-mode-sessions\\b4c8f83c-bfd2-4d1f-a7fa-bfb88a9ebea8\\7327d46d-6790-4c13-8b1a-9aee6e2447a3\\local_4f4ba56b-2cfb-4d83-8fe8-624b6fdf9a43\\.claude\\projects';
function walk(p) {
  let out = [];
  for (const f of fs.readdirSync(p, { withFileTypes: true })) {
    const fp = path.join(p, f.name);
    if (f.isDirectory()) out = out.concat(walk(fp));
    else if (/get_edge_function.*\.txt$/.test(f.name)) out.push(fp);
  }
  return out;
}
const files = walk(d).sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
const j = JSON.parse(fs.readFileSync(files[0], 'utf8'));
const src = j.files[0].content;
console.log('النسخة المنشورة: v' + j.version, '| الحالة:', j.status);
[['فرع الفيديو', "msgType === 'video' && vidMeta?.id"],
 ['تعريف vidMeta', 'const vidMeta = message.video'],
 ['حفظ الفيديو', 'inboundVideoUrl = stored.url'],
 ['metadata.video_url', 'inboundMeta.video_url = inboundVideoUrl'],
 ['شرط الوقوف اتصلّح', "(msgType === 'video' && !vidHandled)"],
 ['حفظ media_id (v52)', 'inboundMeta.wa_media_id = inboundMediaId'],
 ['حد الحجم اترفع', 'const DOC_MAX_BYTES = 48 * 1024 * 1024'],
 ['تنبيه الملف الكبير', '⚠️ ملف كبير اترفض!'],
 ['📅 دالة meetingContext', 'async function meetingContext'],
 ['📅 قاعدة المواعيد', '📅📅 MEETINGS'],
 ['📅 الحجز الفعلي', "ai.meeting?.action === 'book'"],
 ['📅 الإلغاء', "rpc('cancel_meeting'"]]
  .forEach(([n, p]) => console.log((src.includes(p) ? '  ✓ ' : '  ✗ ') + n));
