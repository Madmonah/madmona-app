const puppeteer = require('puppeteer-core')
async function main() {
  const br = await puppeteer.connect({ browserURL: 'http://localhost:9222', defaultViewport: null })
  const pages = await br.pages()
  const p = pages.find(pg => pg.url().includes('facebook.com'))
  if (!p) { console.log('NO FB TAB FOUND'); console.log(pages.map(pg => pg.url())); process.exit(0) }
  console.log('URL: ' + p.url())
  const info = await p.evaluate(() => {
    const dialogs = document.querySelectorAll('[role="dialog"]')
    const out = { dialogCount: dialogs.length, buttons: [] }
    const nodes = document.querySelectorAll('button, div[role="button"], span[role="button"], a, [role="menuitem"]')
    nodes.forEach(n => {
      const txt = (n.innerText || n.textContent || '').replace(/\s+/g, ' ').trim()
      const aria = n.getAttribute('aria-label') || ''
      if (txt || aria) {
        out.buttons.push({
          tag: n.tagName, txt: txt.slice(0, 40), aria: aria.slice(0, 40),
          disabled: n.disabled === true, ariaDisabled: n.getAttribute('aria-disabled'),
          inDialog: !!n.closest('[role="dialog"]')
        })
      }
    })
    return out
  })
  console.log(JSON.stringify(info, null, 1).slice(0, 6000))
  br.disconnect()
}
main().catch(e => { console.log('ERR: ' + e.message); process.exit(1) })
