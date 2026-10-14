// Walks through the app in headless Chrome and saves screenshots: first on the
// sample data, then on the live SAP sandbox (skipped with E2E_SKIP_SAP=1).
// Usage: npm run dev, then `npm run e2e` (screenshots go to e2e/shots/).
// A second argument tests another address, e.g. the built file:
//   node e2e/walkthrough.mjs e2e/shots "file://$PWD/dist/index.html"
// Set CHROME_PATH if Chrome is not in the default macOS location.
import { mkdirSync } from 'node:fs'
import puppeteer from 'puppeteer-core'

const OUT = process.argv[2] ?? 'e2e/shots'
const URL = process.argv[3] ?? 'http://localhost:5173/'
mkdirSync(OUT, { recursive: true })

const browser = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: 'new',
  defaultViewport: { width: 1440, height: 900 },
})
const page = await browser.newPage()
const errors = []
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(`${m.type()}: ${m.text()}`) })
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const text = () => page.evaluate(() => document.body.innerText)
async function shot(name) { await sleep(300); await page.screenshot({ path: `${OUT}/${name}.png` }) }
async function click(label) {
  for (const h of await page.$$('button')) {
    const ok = await h.evaluate((el, t) => {
      const r = el.getBoundingClientRect()
      return el.textContent.trim().includes(t) && r.width > 0 && r.height > 0 && !el.disabled
    }, label)
    if (ok) { await h.click(); await sleep(250); return }
  }
  throw new Error(`No clickable button with text: ${label}`)
}
async function expectText(expected) {
  const body = await text()
  if (!body.includes(expected)) throw new Error(`Expected to see "${expected}"`)
}
async function waitForText(expected, timeout = 30_000) {
  await page.waitForFunction((t) => document.body.innerText.includes(t), { timeout }, expected)
}

// --- Sample data ---------------------------------------------------------------
await page.goto(`${URL}?source=sample`, { waitUntil: 'networkidle0' })
await page.evaluate(() => localStorage.clear())
await page.reload({ waitUntil: 'networkidle0' })

await waitForText('Order 4821')
await expectText('$39.06') // (57.50 − 1.70 promotion) × 70%
await shot('01-sample-offers')

await click('Review offer')
await waitForText('Items at menu price')
await expectText('$57.50')
await expectText('−$1.70')
await expectText('$55.80')
await expectText('−$16.74')
await shot('02-sample-offer')

await click('Accept order')
await shot('03-sample-after-accept')
await click('Review offer')
await click('Decline')
await click('Accepted')
await expectText('Payout shown')
await expectText('$39.06')
await expectText('1 accepted · 1 declined')
await shot('04-sample-accepted')

await page.reload({ waitUntil: 'networkidle0' })
await waitForText('Order 4819')
if ((await text()).includes('Order 4821')) throw new Error('An accepted order came back as an offer after a reload')

await click('How the data is read')
await waitForText('Where each value comes from')
await shot('05-sample-how-data-is-read')
await page.keyboard.press('Escape')
await sleep(300)

// --- Live SAP sandbox ----------------------------------------------------------
if (!process.env.E2E_SKIP_SAP) {
  await click('SAP sandbox')
  await shot('06-sap-loading')
  await waitForText('Review offer', 60_000)
  await shot('07-sap-offers')
  await click('Review offer')
  await waitForText('Items at menu price', 60_000)
  await shot('08-sap-offer')
  await click('Accept order')
  await click('Accepted')
  await expectText('Payout shown')
  await shot('09-sap-accepted')
  await click('How the data is read')
  await waitForText('SAP sandbox (live)')
  await shot('10-sap-how-data-is-read')
}

await browser.close()
if (errors.length) {
  console.error('Console problems:\n' + errors.join('\n'))
  process.exit(1)
}
console.log(`Walkthrough passed. Screenshots in ${OUT}/`)
