// Walks through the app in headless Chrome and saves screenshots: first on the
// sample data, then on the live SAP sandbox (skipped with E2E_SKIP_SAP=1).
// Usage: npm run dev, then `npm run e2e` (screenshots go to e2e/shots/).
// A second argument tests another address, e.g. the built file:
//   node e2e/walkthrough.mjs e2e/shots "file://$PWD/dist/index.html"
// Set CHROME_PATH if Chrome is not in the default macOS location.
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
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
// This walkthrough isolates the original food workflow from automatic SAP imports.
await page.evaluateOnNewDocument(() => {
  const key = 'order-care:imported-sap-orders:v1'
  if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify({ importedAt: new Date().toISOString(), orders: [], pricing: [] }))
})
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
async function isDisabled(label) {
  return page.evaluate((t) => [...document.querySelectorAll('button')].find((b) => b.textContent.includes(t))?.disabled ?? null, label)
}
async function expectNav(label, { active, count }) {
  const actual = await page.evaluate((t) => {
    const button = [...document.querySelectorAll('aside button')].find((b) => b.textContent.includes(t))
    return { active: button?.getAttribute('aria-current') === 'page', count: button?.querySelector('[data-slot="badge"]')?.textContent ?? '' }
  }, label)
  if (actual.active !== active || actual.count !== count) throw new Error(`Unexpected ${label} navigation state: ${JSON.stringify(actual)}`)
}
async function waitForText(expected, timeout = 30_000) {
  await page.waitForFunction((t) => document.body.innerText.includes(t), { timeout }, expected)
}

async function expectAcceptedSummary(amount, deducted) {
  const summary = await page.evaluate(() => [...document.querySelectorAll('[data-slot="card"]')]
    .find((card) => card.textContent.includes('Current expected payout'))?.innerText)
  if (!summary?.includes(amount) || !summary.includes(`$39.06 at acceptance · ${deducted} in deductions`)) {
    throw new Error(`Unexpected accepted payout summary: ${summary}`)
  }
}

async function expectSavedOrderDetails() {
  await page.click('[aria-label="View order 4821 details"]')
  const dialog = await page.$eval('[role="dialog"]', (el) => ({
    text: el.innerText,
    buttons: [...el.querySelectorAll('button')].map((button) => button.textContent.trim()),
  }))
  for (const value of ['Order 4821', 'Chicken katsu bowl', 'Feijoa soda', 'Items at menu price', '$57.50', '−$1.70', '$55.80', '−$16.74', '$39.06']) {
    if (!dialog.text.includes(value)) throw new Error(`Saved order details are missing: ${value}`)
  }
  if (dialog.buttons.some((label) => label.includes('Accept') || label.includes('Decline'))) {
    throw new Error('Saved order details allow another order decision')
  }
  await click('Close')
  if (await page.$('[role="dialog"]')) throw new Error('Close did not dismiss saved order details')
}

const SIMULATE = 'Simulate: customer reports a missing item'

// --- Sample data ---------------------------------------------------------------
await page.goto(`${URL}?source=sample`, { waitUntil: 'networkidle0' })
await page.evaluate(() => localStorage.clear())
await page.reload({ waitUntil: 'networkidle0' })

// 1. An order offer shows the expected payout before it is accepted.
await waitForText('Order 4821')
await expectText('$39.06') // (57.50 − 1.70 promotion) × 70%
if ((await isDisabled(SIMULATE)) !== true) throw new Error('The simulation should be disabled before any order is accepted')
await expectText('Accept an order first')
await expectNav('Accepted', { active: false, count: '' })
await expectNav('Payouts', { active: false, count: '' })
await click('Payouts')
await expectText('No deductions. Nothing has been taken from your payouts.')
await click('Accepted')
await expectText('You have not answered any order yet.')
await click('New orders')
await shot('01-sample-offers')

await click('Review offer')
await waitForText('Items at menu price')
await expectText('$57.50')
await expectText('−$1.70')
await expectText('$55.80')
await expectText('−$16.74')
await shot('02-sample-offer')
await click('Accept order')
await expectText('About order 4821')
await click('Accepted')
await expectAcceptedSummary('$39.06', '$0.00')
await expectSavedOrderDetails()
await click('New orders')

// 2. The customer reports a missing item: the merchant is told without being interrupted.
await click(SIMULATE)
await waitForText('−$5.00 on order 4821')
await expectText('Each order shows your expected payout') // still on New orders
await expectNav('New orders', { active: true, count: '2' })
await expectNav('Payouts', { active: false, count: '1' })
if (await page.$('[role="dialog"]')) throw new Error('The simulation opened a blocking dialog')
await shot('03-sample-notice')
if ((await isDisabled(SIMULATE)) !== true) throw new Error('The latest accepted order should only be simulated once')
// The merchant can keep using the current page with the notice still visible.
await click('Review offer')
await waitForText('Items at menu price')
await expectText('Order 4820')
await page.click('[aria-label="Close without answering"]')

// 3. The deduction shows its reason the same day and can be challenged.
await click('See why and respond')
await waitForText('order 4821')
await expectText('Customer reported a missing item: 1 × Feijoa soda')
await expectText('$39.06 → $34.06') // the payout shown at acceptance, less the 5.00 refund
await expectText('$16.74') // the fee is kept in full
await expectText('Challenge by:')
await expectText('Outcome due by:')
await expectText('Customer photo')
await page.click('[aria-label="View customer sample photo"]')
await page.waitForFunction(() => {
  const img = document.querySelector('img[alt="Sample customer photo showing one Feijoa soda bottle enlarged"]')
  return img?.complete && img.naturalWidth > 0
})
await page.keyboard.press('Escape')
await page.waitForFunction(() => !document.querySelector('[role="dialog"]'))
if ((await text()).includes('−$5.00 on order 4821')) throw new Error('The notice should close when Payouts is opened')
await shot('04-sample-deduction')

await click('Accepted')
await expectAcceptedSummary('$34.06', '$5.00')
await expectText('Not submitted')
await expectSavedOrderDetails() // The acceptance snapshot stays $39.06 after the deduction.
await shot('04a-sample-accepted-deduction')
await click('Payouts')

await click('Challenge this deduction')
await page.type('textarea', 'Both sodas were packed. Our packing photo shows them in the sealed bag.')
await shot('05-sample-challenge-form')
await click('Send challenge')
await expectText('Challenge sent')
await expectText('Both sodas were packed.')
await expectNav('Payouts', { active: true, count: '' })
await shot('06-sample-challenge-sent')

await click('Accepted')
await expectText('1 accepted · 0 declined')
await expectText('−$5.00')
await expectText('Submitted')
await expectAcceptedSummary('$34.06', '$5.00') // Submitting a challenge does not reverse the deduction.
await shot('07-sample-accepted')

await page.reload({ waitUntil: 'networkidle0' })
await waitForText('Order 4820')
if ((await text()).includes('Order 4821')) throw new Error('An accepted order came back as an offer after a reload')
await click('Payouts')
await waitForText('Challenge sent')
await click('Accepted')
await expectText('Submitted')
await expectAcceptedSummary('$34.06', '$5.00')
await expectSavedOrderDetails()

await click('How the data is read')
await waitForText('Where each value comes from')
await shot('08-sample-how-data-is-read')
await page.keyboard.press('Escape')
await page.waitForFunction(() => !document.querySelector('[role="dialog"]'))

// 4. The latest acceptance wins, and a promoted multi-quantity line refunds one unit.
await click('Reset')
await waitForText('Order 4821')
if ((await isDisabled(SIMULATE)) !== true) throw new Error('Reset did not disable the simulation')
await click('Review offer')
await waitForText('Items at menu price')
await click('Accept order') // 4821, which must not become the target again after 4820 is refunded
await click('Review offer')
await waitForText('Items at menu price')
await click('Accept order') // 4820: two fries at $13.60 after the promotion
await expectText('About order 4820')
await page.evaluate((label) => {
  const button = [...document.querySelectorAll('button')].find((b) => b.textContent.includes(label))
  button.click()
  button.click()
}, SIMULATE)
await waitForText('−$6.80 on order 4820')
await expectNav('Payouts', { active: false, count: '1' })
if ((await isDisabled(SIMULATE)) !== true) throw new Error('The simulation fell back to an older accepted order')
await click('See why and respond')
await expectText('Customer reported a missing item: 1 × Kūmara fries')
if ((await text()).includes('No customer photo available')) throw new Error('A missing photo should not display placeholder text')
if (await page.$('[aria-label="View customer sample photo"]')) throw new Error('Order 4820 incorrectly shows the 4821 customer illustration')
await expectText('$35.42 → $28.62')
await expectText('$15.18')

// A new deduction must not disturb a challenge the merchant is writing.
await click('New orders')
await click('Review offer')
await waitForText('Items at menu price')
await click('Accept order') // 4819
await expectText('About order 4819')
await click('Payouts')
await click('Challenge this deduction')
const draft = 'Both portions of fries were packed.'
await page.type('textarea', draft)
await click(SIMULATE)
await waitForText('−$5.00 on order 4819')
if ((await page.$eval('textarea', (el) => el.value)) !== draft) throw new Error('The incoming deduction interrupted the challenge draft')
await expectNav('Payouts', { active: true, count: '2' })
await page.click('[aria-label="Dismiss"]')
if ((await page.$eval('textarea', (el) => el.value)) !== draft) throw new Error('Dismissing the notice changed the draft')
await shot('09-sample-uninterrupted-challenge')
await click('Send challenge')

// Refunds, decisions and challenges survive a reload; Reset clears all three.
await page.reload({ waitUntil: 'networkidle0' })
await waitForText('No new orders. You have answered every offer')
await expectNav('Payouts', { active: false, count: '1' })
await click('Payouts')
await expectText(draft)
await expectText('order 4819')
await expectText('order 4820')
if ((await text()).includes('order 4821')) throw new Error('An older accepted order was refunded unexpectedly')
await click('Reset')
await waitForText('Order 4821')
await click('Accepted')
await expectText('You have not answered any order yet.')
await click('Payouts')
await expectText('No deductions. Nothing has been taken from your payouts.')

// --- Optional merchant photo ---------------------------------------------------
const photoFixtures = mkdtempSync(join(tmpdir(), 'order-care-photos-'))
try {
  const png = await page.evaluate(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 1800
    canvas.height = 1000
    const context = canvas.getContext('2d')
    context.fillStyle = '#228855'
    context.fillRect(0, 0, canvas.width, canvas.height)
    return canvas.toDataURL('image/png').split(',')[1]
  })
  const packing = join(photoFixtures, 'packing.png')
  const replacement = join(photoFixtures, 'sealed-bag.png')
  const invalid = join(photoFixtures, 'notes.txt')
  const corrupt = join(photoFixtures, 'corrupt.jpg')
  const oversized = join(photoFixtures, 'large.jpg')
  writeFileSync(packing, Buffer.from(png, 'base64'))
  writeFileSync(replacement, Buffer.from(png, 'base64'))
  writeFileSync(invalid, 'not a photo')
  writeFileSync(corrupt, 'not a JPEG')
  writeFileSync(oversized, Buffer.alloc(5 * 1024 * 1024 + 1))

  await click('New orders')
  await click('Review offer')
  await waitForText('Items at menu price')
  await click('Accept order')
  await click(SIMULATE)
  await click('Payouts')
  await click('Challenge this deduction')
  await page.type('textarea', 'Both drinks are visible in our packing photo.')
  const input = await page.$('input[type="file"]')
  if (await input.evaluate((el) => el.multiple)) throw new Error('The attachment input allows multiple photos')
  for (const [file, message] of [[invalid, 'Choose a JPEG or PNG photo.'], [oversized, 'no larger than 5 MB'], [corrupt, 'could not be opened']]) {
    await input.uploadFile(file)
    await waitForText(message)
    if ((await page.$eval('textarea', (el) => el.value)) !== 'Both drinks are visible in our packing photo.') {
      throw new Error('A rejected photo cleared the explanation')
    }
  }
  await input.uploadFile(packing)
  await waitForText('packing.png')
  await page.waitForFunction(() => {
    const img = document.querySelector('img[alt="Merchant evidence photo"]')
    return img?.complete && img.naturalWidth > 0 && img.naturalWidth <= 1280
  })
  await click('Remove photo')
  if (await page.$('img[alt="Merchant evidence photo"]')) throw new Error('Removing the draft photo failed')
  await input.uploadFile(packing) // Reselecting the same file must work.
  await waitForText('packing.png')
  await input.uploadFile(replacement)
  await waitForText('sealed-bag.png')
  if ((await page.$$('img[alt="Merchant evidence photo"]')).length !== 1) throw new Error('Replacing a photo added a second attachment')
  await page.click('[aria-label="View attached photo"]')
  await page.waitForSelector('img[alt="Merchant evidence photo enlarged"]')
  await page.keyboard.press('Escape')
  await page.waitForFunction(() => !document.querySelector('[role="dialog"]'))

  // Failed persistence must leave the form and evidence available for retry.
  await page.evaluate(() => {
    window.originalStorageSetItem = Storage.prototype.setItem
    Storage.prototype.setItem = function (key, value) {
      if (key === 'order-care:challenges:sample') throw new DOMException('Full', 'QuotaExceededError')
      return window.originalStorageSetItem.call(this, key, value)
    }
  })
  await click('Send challenge')
  await expectText('Your challenge could not be saved')
  await expectText('sealed-bag.png')
  await expectNav('Payouts', { active: true, count: '1' })
  if (!(await page.$('textarea'))) throw new Error('A failed submission closed the form')
  await page.evaluate(() => { Storage.prototype.setItem = window.originalStorageSetItem })
  await click('Send challenge')
  await expectNav('Payouts', { active: true, count: '' })
  await expectText('Challenge sent')
  await expectText('sealed-bag.png')
  if (await page.$('textarea')) throw new Error('Successful submission left the draft form open')
  await shot('09a-merchant-photo-sent')

  await page.reload({ waitUntil: 'networkidle0' })
  await waitForText('Order 4820')
  await click('Payouts')
  await expectText('sealed-bag.png')
  await page.click('[aria-label="View attached photo"]')
  await page.waitForFunction(() => {
    const img = document.querySelector('img[alt="Merchant evidence photo enlarged"]')
    return img?.complete && img.naturalWidth > 0
  })
  await page.keyboard.press('Escape')
  await page.waitForFunction(() => !document.querySelector('[role="dialog"]'))
  await click('Accepted')
  await expectText('Submitted')
  await expectAcceptedSummary('$34.06', '$5.00')
  await click('Reset')
  await waitForText('Order 4821')
  await click('Payouts')
  await expectText('No deductions. Nothing has been taken from your payouts.')
  if (await page.evaluate(() => localStorage.getItem('order-care:challenges:sample') !== '[]')) {
    throw new Error('Reset kept submitted photo evidence')
  }
} finally {
  rmSync(photoFixtures, { recursive: true, force: true })
}

// --- Live SAP sandbox ----------------------------------------------------------
if (!process.env.E2E_SKIP_SAP) {
  await click('SAP sandbox')
  await waitForText('Review offer', 60_000)
  if ((await isDisabled(SIMULATE)) !== true) throw new Error('The simulation should be disabled on the SAP sandbox')
  await expectText('Sample data only')
  await shot('10-sap-offers')
  await click('Review offer')
  await waitForText('Items at menu price', 60_000)
  await shot('11-sap-offer')
  await click('Accept order')
  if ((await isDisabled(SIMULATE)) !== true) throw new Error('The simulation should stay disabled on the SAP sandbox')
  await click('Accepted')
  await expectText('Payout at acceptance')
  await click('Payouts')
  await waitForText('Challenge window closed', 60_000)
  await expectText('SAP order reason')
  if ((await text()).includes('No customer photo available')) throw new Error('SAP deductions should not display missing-photo placeholder text')
  if (await page.$('[aria-label="View customer sample photo"]')) throw new Error('SAP deductions incorrectly show a sample customer photo')
  await shot('12-sap-deductions')
  await click('How the data is read')
  await waitForText('SAP sandbox (live)')
  await shot('13-sap-how-data-is-read')
  await page.keyboard.press('Escape')
  await page.waitForFunction(() => !document.querySelector('[role="dialog"]'))
  await click('Sample data')
  await waitForText('Order 4821')
  if ((await isDisabled(SIMULATE)) !== true) throw new Error('A SAP acceptance enabled the sample simulation')
  await click('Payouts')
  await expectText('No deductions. Nothing has been taken from your payouts.')
}

await browser.close()
if (errors.length) {
  console.error('Console problems:\n' + errors.join('\n'))
  process.exit(1)
}
console.log(`Walkthrough passed. Screenshots in ${OUT}/`)
process.exit(0)
