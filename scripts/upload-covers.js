// يرفع الصور المستخرجة من البروشورات للستوريدج
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const URL = 'https://mjhflxpxunwycbiquoig.supabase.co';
// نقرا المفتاح من .env.local مباشرة (مش بنطبعه)
const env = fs.readFileSync('E:\\madmona-app\\.env.local', 'utf8');
const m = env.match(/SUPABASE_SERVICE_ROLE_KEY\s*=\s*"?([^"\r\n]+)"?/);
const KEY = m ? m[1].trim() : '';
const OUT = 'C:\\Users\\solutions\\AppData\\Roaming\\Claude\\local-agent-mode-sessions\\b4c8f83c-bfd2-4d1f-a7fa-bfb88a9ebea8\\7327d46d-6790-4c13-8b1a-9aee6e2447a3\\local_4f4ba56b-2cfb-4d83-8fe8-624b6fdf9a43\\outputs';

// الصور اللي راجعتها بعيني واعتمدتها
const FILES = [
  { file: 'commonhaus-p9.jpg', key: 'brochure-covers/commonhaus.jpg' },
  { file: 'annex-p10.jpg',     key: 'brochure-covers/annex26.jpg' },
];

(async () => {
  if (!KEY) { console.log('NO KEY'); return; }
  const sb = createClient(URL, KEY, { auth: { persistSession: false } });
  for (const f of FILES) {
    const p = path.join(OUT, f.file);
    if (!fs.existsSync(p)) { console.log('MISSING', f.file); continue; }
    const buf = fs.readFileSync(p);
    const { error } = await sb.storage.from('project-media')
      .upload(f.key, buf, { contentType: 'image/jpeg', upsert: true });
    if (error) { console.log('FAIL', f.file, error.message); continue; }
    const { data } = sb.storage.from('project-media').getPublicUrl(f.key);
    console.log('OK', f.file, '->', data.publicUrl);
  }
})();
