const CODE = process.argv[2] || 'MADPSDGU';
fetch('https://www.madmonacairo.com/api/auth/wa', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ action: 'finish', code: CODE, full_name: 'اختبار المارد' }),
}).then(r => r.json()).then(j => {
  console.log(JSON.stringify({
    has_hash: !!j.token_hash,
    madmona_token: j.madmona_token ? 'YES(' + String(j.madmona_token).slice(0, 8) + '..)' : 'MISSING',
    phone: j.phone || null,
    full_name: j.full_name || null,
    error: j.error || null,
  }));
}).catch(e => console.log('ERR', e.message));
