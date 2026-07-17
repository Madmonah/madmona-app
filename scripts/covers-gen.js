// Pull the cover list straight from Supabase into covers.json (avoids hand-copying 75 URLs).
const https = require('https');
const fs = require('fs');
const URL_ = 'https://mjhflxpxunwycbiquoig.supabase.co/rest/v1/property_market_items' +
  '?select=title,property_type,cover_url&segment=eq.developer&status=eq.published' +
  '&cover_url=not.is.null&order=property_type,title';
const KEY = process.env.SB_ANON;

https.get(URL_, { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } }, res => {
  let b = '';
  res.on('data', d => (b += d));
  res.on('end', () => {
    const rows = JSON.parse(b).map((r, i) => ({ i: i + 1, ...r }));
    fs.writeFileSync('E:/madmona-app/scripts/covers.json', JSON.stringify(rows, null, 1));
    console.log(rows.length, 'covers');
  });
});
