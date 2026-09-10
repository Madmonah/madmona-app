let s = ''; process.stdin.on('data', d => s += d).on('end', () => {
  const line = s.trim().split('\n').pop()
  try { const o = JSON.parse(line); console.log(o.url); console.log('uiErr', o.uiErr); console.log(o.errs.filter(e => !/GoTrue/.test(e)).slice(-8).join('\n')) } catch { console.log(s.slice(-600)) }
})
