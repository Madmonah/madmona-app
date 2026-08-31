const puppeteer = require('puppeteer-core')
const sleep = ms => new Promise(r => setTimeout(r, ms))

function dumpButtons(label) {
  return `console.log('=== ${label} ===')`
}

async function dump(p, label) {
  const info = await p.evaluate(() => {
    const dialogs = Array.from(document.querySelectorAll('[role="dialog"]'))
    const out = { label: '', dialogCount: dialogs.length, dialogHTML: dialogs.map(d => d.getBoundingClientRect()), buttons: [] }
    const scope = dialogs.length ? dialogs[dialogs.length - 1] : document
    const nodes = scope.querySelectorAll('button, div[role="button"], span[role="button"], a, [role="menuitem"]')
    nodes.forEach(n => {
      const txt = (n.innerText || n.textContent || '').replace(/\s+/g, ' ').trim()
      const aria = n.getAttribute('aria-label') || ''
      if (txt || aria) {
        out.buttons.push({
          tag: n.tagName, txt: txt.slice(0, 30), aria: aria.slice(0, 30),
          disabled: n.disabled === true, ariaDisabled: n.getAttribute('aria-disabled'),
        })
      }
    })
    return out
  })
  console.log('=== ' + label + ' === dialogs=' + info.dialogCount)
  console.log(JSON.stringify(info.buttons))
}

async function main() {
  const br = await puppeteer.connect({ browserURL: 'http://localhost:9222', defaultViewport: null })
  const pages = await br.pages()
  let p = pages.find(pg => pg.url().includes('facebook.com'))
  if (!p) { p = await br.newPage(); await p.goto('https://www.facebook.com/', { waitUntil: 'domcontentloaded', timeout: 60000 }) }
  else { await p.bringToFront(); if (p.url() !== 'https://www.facebook.com/') await p.goto('https://www.facebook.com/', { waitUntil: 'domcontentloaded', timeout: 60000 }) }
  await sleep(3000)
  await dump(p, 'home')

  await p.evaluate(() => {
    const el = document.querySelector('div[role="button"][aria-label*="mind"i], div[role="button"][aria-label*="فكرك"i], div[aria-label*="Create a post"i]')
    if (el) el.click()
  })
  await sleep(3000)
  await dump(p, 'after-open-composer')

  await p.evaluate(() => {
    const items = Array.from(document.querySelectorAll('div[role="button"], span'))
    const t = items.find(x => /photo\/?video|photo.?video/i.test(x.innerText || ''))
    if (t) t.click()
  })
  await sleep(3000)
  await dump(p, 'after-click-photovideo')

  const f = await p.$('input[type="file"]')
  if (!f) { console.log('NO FILE INPUT'); br.disconnect(); return }
  await f.uploadFile('C:\\Users\\SOLUTI~1\\AppData\\Local\\Temp\\reel-shortcut-2-before-after.mp4')
  await sleep(25000)
  await dump(p, 'after-upload-25s')

  await sleep(15000)
  await dump(p, 'after-upload-40s')

  br.disconnect()
}
main().catch(e => { console.log('ERR: ' + e.message + '\n' + e.stack); process.exit(1) })
