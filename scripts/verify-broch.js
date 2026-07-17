// أتأكد إن كل بروشور شغّال فعلاً على النت (مش بس مسجّل في الداتابيز)
const B = 'https://mjhflxpxunwycbiquoig.supabase.co/storage/v1/object/public/content-images/wa-recovered/';
const files = ['ritz-new-zayed-brochure.pdf', 'i-business-park-brochure.pdf', 'annex-26-mall-brochure.pdf'];
(async () => {
  for (const f of files) {
    try {
      const r = await fetch(B + f, { method: 'HEAD' });
      const mb = (+r.headers.get('content-length') / 1048576).toFixed(1);
      console.log(r.ok ? '✅' : '❌', f, '|', r.status, '|', mb, 'MB |', r.headers.get('content-type'));
    } catch (e) { console.log('❌', f, e.message); }
  }
})();
