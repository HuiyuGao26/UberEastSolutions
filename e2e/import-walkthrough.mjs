// Tests the merged local demo, including an offline reload and import failure.
// Default: deterministic SAP-shaped test responses. E2E_LIVE_SAP=1: real GETs.
import assert from 'node:assert/strict'
import { mkdirSync } from 'node:fs'
import puppeteer from 'puppeteer-core'

const url = process.argv[2] ?? 'http://localhost:5173/'
const out = process.argv[3] ?? 'e2e/shots/import'
mkdirSync(out, { recursive: true })
const browser = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: 'new',
  defaultViewport: { width: 1440, height: 1000 },
})
try {
  const page = await browser.newPage()
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  const requests = []
  let failing = false
  await page.setRequestInterception(true)
  page.on('request', async (request) => {
    if (!request.url().startsWith('https://sandbox.api.sap.com/')) return request.continue()
    requests.push({ url: request.url(), method: request.method() })
    if (request.method() === 'OPTIONS') return request.respond({ status: 204, headers: {
      'access-control-allow-origin': '*', 'access-control-allow-headers': 'apikey,accept', 'access-control-allow-methods': 'GET,OPTIONS',
    } })
    const headers = { 'access-control-allow-origin': '*', 'content-type': 'application/json' }
    if (failing) return request.respond({ status: 503, headers, body: JSON.stringify({ error: { message: 'Test: SAP unavailable' } }) })
    if (process.env.E2E_LIVE_SAP) return request.continue()
    // Synthetic test responses, never shipped as imported real SAP records.
    const pricing = request.url().includes('_ItemPricingElement')
    const value = pricing ? [{
      SalesOrder: '545897', SalesOrderItem: '10', PricingProcedureStep: '20', ConditionType: 'PPR0',
      PriceElementDescription: 'Price', ConditionClass: 'B', ConditionAmount: 20,
      ConditionInactiveReason: null, ConditionIsForStatistics: false,
    }] : [{
      SalesOrder: '545897', SalesOrganization: '1710', SoldToParty: 'TEST',
      CreationDate: new Date().toISOString().slice(0, 10), CreationTime: '00:30:54', TransactionCurrency: 'USD',
      _Item: [{ SalesOrderItem: '10', Product: 'TEST-BIKE', SalesOrderItemText: 'Test bike', RequestedQuantity: 2, NetAmount: 10 }],
      _Partner: [{ PartnerFunction: 'AG', Customer: 'TEST', BusinessPartnerName1: 'Test customer', CityName: 'Test city' }],
    }]
    return request.respond({ status: 200, headers, body: JSON.stringify({ value }) })
  })
  const body = () => page.evaluate(() => document.body.innerText)
  const wait = (text) => page.waitForFunction((t) => document.body.innerText.includes(t), { timeout: 60_000 }, text)
  const waitForImport = () => page.waitForFunction(() => [...document.querySelectorAll('button')]
    .some((button) => button.textContent.includes('Import SAP orders') && !button.disabled), { timeout: 60_000 })
  async function click(text) {
    const button = await page.waitForSelector(`::-p-xpath(//button[contains(., '${text}') and not(@disabled)])`)
    await button.click()
  }
  const snapshot = () => page.evaluate(() => JSON.parse(localStorage.getItem('order-care:imported-sap-orders:v1')))
  const screenshot = (name) => page.screenshot({ path: `${out}/${name}.png` })
  await page.goto(`${url}?source=sample`, { waitUntil: 'networkidle0' })
  await page.evaluate(() => localStorage.clear())
  await page.reload({ waitUntil: 'networkidle0' })
  await wait('Order 4821')
  await wait('SAP demo record')
  await waitForImport()
  const titles = await page.$$eval('[data-slot="card-title"]', (elements) => elements.map((element) => element.innerText))
  assert(titles[0].startsWith('Order 4821'))
  assert(titles[1].startsWith('Order 4820'))
  assert(titles[2].startsWith('Order 4819'))
  assert(titles[3].includes('SAP demo record'), 'The fourth card must show original SAP data')
  assert(!titles.some((title) => title.startsWith('Order 4818')))
  await screenshot('00-three-food-orders-then-sap')

  // A background import must not close the food offer the merchant is reviewing.
  await click('Review offer')
  await wait('Items at menu price')
  await click('Import SAP orders')
  await waitForImport()
  assert(await page.$('[role="dialog"]'), 'Importing SAP data closed the open food offer')
  await wait('Items at menu price')
  await click('Accept order')
  await wait('SAP demo record')
  const imported = await snapshot()
  assert(imported.orders.length > 0)
  const order = imported.orders[0]
  await wait(`Order ${order.SalesOrder}`)
  const title = await page.waitForSelector(`::-p-xpath(//*[@data-slot='card-title'][contains(., 'Order ${order.SalesOrder}')])`)
  const card = await title.evaluateHandle((element) => element.closest('[data-slot="card"]'))
  const review = await card.$('button')
  await review.click()
  await wait('Items at menu price')
  assert((await body()).includes(order._Item[0].SalesOrderItemText))
  assert((await body()).includes('Original SAP demo order'))
  await click('Accept order')
  await wait(`About order ${order.SalesOrder}`)
  await screenshot('01-imported-orders')

  // Accepting, refunding and challenging the imported record send no API writes.
  const readsBeforeActions = requests.length
  await click('Simulate: customer reports a missing item')
  await wait(`on order ${order.SalesOrder}`)
  await click('See why and respond')
  await wait('Local simulation, not a SAP credit memo')
  await click('Challenge this deduction')
  await page.type('textarea', 'The item was included. This challenge is saved locally.')
  await click('Send challenge')
  await wait('Challenge sent')
  assert.equal(requests.length, readsBeforeActions)
  await screenshot('02-imported-deduction-challenge')

  await click('Accepted')
  await wait('2 accepted · 0 declined')
  const summary = await page.$eval('[data-slot="card"]', (element) => element.innerText)
  assert(summary.includes('$39.06'), 'NZD total must stay separate from USD')
  if (order.TransactionCurrency === 'USD') assert(summary.includes('US$'), 'USD total must retain its currency')
  await screenshot('03-multiple-currencies')

  // Failed refresh must preserve the original import, decisions and challenge.
  failing = true
  await click('New orders')
  await click('Import SAP orders')
  await wait('Test: SAP unavailable')
  assert.deepEqual(await snapshot(), imported)
  await click('Payouts')
  await wait('Challenge sent')
  const readCount = requests.length
  await page.reload({ waitUntil: 'networkidle0' })
  await wait('Order 4820')
  await click('Payouts')
  await wait('Challenge sent')
  assert.equal(requests.length, readCount, 'Offline reload must use the saved SAP snapshot')
  await click('Reset')
  await wait(`Order ${order.SalesOrder}`)
  await click('Payouts')
  await wait('No deductions. Nothing has been taken from your payouts.')
  assert.deepEqual(await snapshot(), imported, 'Reset keeps the snapshot and clears local actions')
  await click('How the data is read')
  await wait('original SAP orders imported')
  await screenshot('04-import-provenance')
  assert(requests.every((request) => ['GET', 'OPTIONS'].includes(request.method)), 'Only GET and CORS preflight are allowed')
  assert.deepEqual(errors, [])
  console.log(`Import walkthrough passed (${process.env.E2E_LIVE_SAP ? 'live SAP' : 'test responses'}). ${out}`)
} finally {
  await browser.close()
}
