import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

const BUCKET = 'listing-drafts'; // create this public bucket in Supabase

// =====================================================
// POST /api/listing-drafts/upload
// FormData: { file, token? }
// Returns: { url, path }
// =====================================================
export async function POST(req: NextRequest) {
  try {
    const fd = await req.formData();
    const file = fd.get('file') as File | null;
    const token = (fd.get('token') as string | null) || 'anon';

    if (!file) {
      return NextResponse.json({ success: false, error: 'file required' }, { status: 400 });
    }

    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
    if (!['jpg', 'jpeg', 'png', 'webp', 'heic'].includes(ext)) {
      return NextResponse.json({ success: false, error: 'بنقبل صور بس (JPG/PNG/WEBP)' }, { status: 400 });
    }

    if (file.size > 8 * 1024 * 1024) {
      return NextResponse.json({ success: false, error: 'الصورة أكبر من 8 ميجا' }, { status: 400 });
    }

    const path = `${token}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const buf = Buffer.from(await file.arrayBuffer());
    const { error } = await supabase.storage.from(BUCKET).upload(path, buf, {
      contentType: file.type,
      upsert: false,
    });

    if (error) {
      console.error('upload error:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);

    return NextResponse.json({ success: true, url: pub.publicUrl, path });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

export const config = {
  api: {
    bodyParser: false,
  },
};
