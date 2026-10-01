// Clicks through the whole demo guide in headless Chrome and saves screenshots.
// Usage: npm run dev, then `npm run e2e` (screenshots go to e2e/shots/).
// Set CHROME_PATH if Chrome is not in the default macOS location; E2E_HEIGHT=760 tests a short window.
import { mkdirSync } from 'node:fs'
import puppeteer from 'puppeteer-core'
const OUT = process.argv[2] ?? 'e2e/shots'
const URL = process.argv[3] ?? 'http://localhost:5173/'
mkdirSync(OUT, { recursive: true })
const browser = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: 'new',
  defaultViewport: { width: 1600, height: Number(process.env.E2E_HEIGHT ?? 1000) },
})
const page = await browser.newPage()
const errors = []
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(`${m.type()}: ${m.text()}`) })
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))
await page.goto(URL, { waitUntil: 'networkidle0' })
await page.evaluate(() => localStorage.clear())
await page.reload({ waitUntil: 'networkidle0' })

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
async function assertGuideShowsCurrent(text) {
  await sleep(500) // let the smooth scroll finish
  const visible = await page.evaluate((t) => {
    const list = document.querySelector('aside ol')
    const btn = [...list.querySelectorAll('button')].find((b) => b.textContent.includes(t))
    if (!btn) return false
    const l = list.getBoundingClientRect()
    const b = btn.getBoundingClientRect()
    return b.top >= l.top && b.bottom <= l.bottom
  }, text)
  if (!visible) throw new Error(`Guide button "${text}" is scrolled out of view`)
}
async function click(text, sel = 'button, [role=tab], label') {
  if (text.startsWith('Go to ')) await assertGuideShowsCurrent(text)
  const handles = await page.$$(sel)
  for (const h of handles) {
    const ok = await h.evaluate((el, t) => {
      const r = el.getBoundingClientRect()
      return el.textContent.trim().includes(t) && r.width > 0 && r.height > 0 && !el.disabled
    }, text)
    if (ok) { await h.click(); await sleep(250); return }
  }
  throw new Error(`No clickable element with text: ${text}`)
}
async function shot(name) { await sleep(300); await page.screenshot({ path: `${OUT}/${name}.png` }) }

await shot('01-merchant-home')
await click('Confirm plan')
await click('Go to Merchant tablet')
await shot('02-offer')
await click('Accept order')
await click('Go to Customer phone')
await shot('03-tracking-late')
await click('Get help with this order')
await click('Send')
await shot('04-voucher')
await click('Accept voucher')
await click('Go to Customer phone')
await click('Get help with this order')
await click('Feijoa soda', 'label')
await shot('05a-help-missing')
await click('Send')
await shot('05-missing-case')
await click('Go to Support console')
await shot('06-case')
await click('Send question')
await click('Go to Merchant tablet')
await click('Both sodas were packed and the bag')
await shot('07-request')
await click('Send answer')
await click('Go to Support console')
await click('Resolve', '[role=tab]')
await shot('08-resolve')
await click('Resolve case')
await click('Go to Merchant tablet')
await shot('09-deduction')
await click('Challenge this deduction')
await click('Send challenge')
await click('Go to Support console')
await shot('10-challenge')
await click('Reverse deduction')
await click('Go to Support console')
await shot('11-insights')
await click('Customer', 'nav button')
await shot('12-customer-after')
await click('Merchant', 'nav button')
await click('Payouts', 'aside button')
await shot('13-merchant-payouts-after')
const done = await page.evaluate(() => [...document.querySelectorAll('aside p')].map((p) => p.textContent).find((t) => /steps done/.test(t)))
console.log('guide:', done)
console.log('errors:', errors.length ? errors.join('\n') : 'none')
await browser.close()
if (errors.length || !/11 of 11/.test(done ?? '')) process.exit(1)
