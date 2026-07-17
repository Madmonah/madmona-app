// فحص صياغة الويبهوك بالـTypeScript parser (deno check بيفشل لأسباب مالهاش علاقة)
const ts = require('typescript');
const fs = require('fs');
const f = 'E:/madmona-app/supabase/functions/whatsapp-webhook/index.ts';
const src = fs.readFileSync(f, 'utf8');
const sf = ts.createSourceFile(f, src, ts.ScriptTarget.ES2022, true, ts.ScriptKind.TS);
const errs = sf.parseDiagnostics || [];
console.log(errs.length === 0 ? '✓ الصياغة سليمة' : '✗ ' + errs.length + ' خطأ');
errs.slice(0, 6).forEach((e) => {
  const { line } = sf.getLineAndCharacterOfPosition(e.start);
  console.log('  سطر', line + 1, ts.flattenDiagnosticMessageText(e.messageText, ' '));
});
// فحص إن كل حتة الفيديو موجودة
[['تعريف vidMeta', 'const vidMeta = message.video'],
 ['تعريف inboundVideoUrl', 'let inboundVideoUrl: string | null = null'],
 ['فرع الفيديو', "msgType === 'video' && vidMeta?.id"],
 ['حفظ الفيديو', 'inboundVideoUrl = stored.url'],
 ['metadata.video_url', 'inboundMeta.video_url = inboundVideoUrl'],
 ['شرط الوقوف اتصلّح', "(msgType === 'video' && !vidHandled)"],
 ['دالة meetingContext', 'async function meetingContext'],
 ['قاعدة المواعيد في البرومبت', '📅📅 MEETINGS'],
 ['meeting في الـJSON', '\\"meeting\\":{\\"action\\"'],
 ['الحجز الفعلي', "ai.meeting?.action === 'book'"],
 ['الإلغاء بالـRPC', "rpc('cancel_meeting'"]]
  .forEach(([n, p]) => console.log((src.includes(p) ? '  ✓ ' : '  ✗ ') + n));
