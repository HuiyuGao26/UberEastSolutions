# Order Care: merchant app prototype for Uber Eats NZ

A prototype for our INFOSYS 704 group assignment (A3). It builds Gao’s A2-D1 proposal for Uber Eats merchants, “change the sequence, not the price”, as two features on a merchant tablet.

> Student prototype for a university course. Not affiliated with Uber. The three NZD food orders and merchant are fictional. Imported SAP records are SAP sandbox demo data, not Uber transactions. The 30% fee rate is illustrative.

## What it does

**1. See what an order pays before accepting it** (Release 1)

- **New orders.** Each order offer shows the expected payout.
- **Review offer.** Items at menu price, the merchant’s own promotion, the fee basis, the fee, and the expected payout. Accept or decline.
- **Accepted.** Accepted orders, each with the payout that was shown at the moment of acceptance.

**2. See a deduction the same day, with the reason, and challenge it** (Release 2)

- **Payouts.** A customer refund taken from the payout shows its reason, the items, the fee that is kept in full, and the payout before and after.
- **Challenge this deduction.** The merchant writes why it should be reversed and sends it. The card then shows the challenge and the date an outcome is due (day 7). A deduction can be challenged within 30 days of the order date.

The sample day starts with three fictional food orders, followed by up to two original SAP orders, and no deductions. After accepting an order, use **Simulate: customer reports a missing item** in the top bar outside the tablet. This plays the customer reporting a problem after delivery: one unit of the cheapest item on the most recently accepted order is refunded, at its price after any promotion. The tablet shows a notification and a Payouts badge without navigating away or opening a dialog. Open **Payouts** to see why and send a challenge.

For example: accept order **4821** with an expected payout of **$39.06** → simulate the missing item → see a **$5.00** deduction for one Feijoa soda → open Payouts and see **$39.06 → $34.06**, with the **$16.74** fee kept in full → send a challenge.

The simulation is available only with sample data, once per accepted order. Before accepting an order it is disabled; after simulating a report, accept another order to try it again. On the SAP sandbox it stays disabled: orders and credit memo requests are read for display, and acceptance is kept locally as before.

### Merge original SAP orders into the local demo

On the first visit to **Sample data**, the app automatically reads SAP orders if an API key is configured. The three food orders appear first, with the first SAP record in the fourth position, visible on the same screen. **Import SAP orders** refreshes the saved data or retries a failed read. The app reads the newest sales orders using the existing V4 wrapper, selects up to two with usable items, reads each item's pricing elements, and saves a snapshot in this browser. The imported cards are marked **SAP demo record**.

The SAP order IDs, dates, customers, products, quantities, amounts, currencies and pricing conditions stay unchanged. These records can be bicycles in USD. We present them as offers for the prototype; we do not claim that they are actual Uber Eats orders or that their SAP status changed.

Review and accept an imported order, then use **Simulate: customer reports a missing item** and send a challenge in **Payouts**, just as with a food order. The fee and payout are calculated locally. The simulated deduction is a local Credit Memo Request-shaped record; no credit memo is created in SAP. Accept, decline and challenge are also stored locally. The Accepted summary keeps NZD and USD totals separate without converting them.

The snapshot and local actions survive a reload, including offline. **Reset** clears actions and simulated deductions but keeps the imported orders, so another run needs no network. Import again to replace the snapshot with a fresh read. An unsuccessful import preserves the earlier snapshot and local actions. The first import needs the configured API key and an internet connection.

For the pitch: “Our prototype reads sales orders and item pricing from the SAP sandbox through GET requests and combines the unchanged demo records with fictional food orders. Fees, merchant decisions, deductions and challenges are simulated locally, with no write-back to SAP.” This is **Option #2: partial fit**, with the wrapper and local workflow adaptations disclosed.

**Reset** in the top bar starts the sample day again, clearing decisions, simulated refunds and challenges. What you do is saved in your browser only, including simulated deductions after a reload.

## How it uses the SAP APIs

The screens read through one wrapper, `OrderRepository` in `src/sap/repository.ts`, which follows two SAP OData V4 APIs on the SAP Business Accelerator Hub: **Sales Order (A2X)** and **Credit Memo Request (A2X)**. It has two implementations, switched with **Data source** in the top bar:

| Data source | Implementation | What it reads |
|---|---|---|
| Sample data (default) | `src/sap/mockRepository.ts` | Fictional food orders in SAP format, plus original SAP orders and item pricing imported on demand and cached in the browser |
| SAP sandbox | `src/sap/sapRepository.ts` | The live SAP sandbox. It returns SAP’s own demo records, not Uber Eats data |

Three requests are made:

- `GET …/SalesOrder?$expand=_Item,_Partner`: orders, items and customers
- `GET …/SalesOrderItem(SalesOrder='…',SalesOrderItem='…')/_ItemPricingElement`: prices and discounts of one item
- `GET …/CreditMemoRequest?$expand=_Item`: customer refunds, shown as deductions

| On screen | SAP field |
|---|---|
| Order number | Sales Order: `SalesOrder` |
| Placed | Sales Order: `CreationDate` + `CreationTime` |
| Customer | Sales Order `_Partner` (sold-to): `BusinessPartnerName1`, `CityName` |
| Item name and quantity | Sales Order `_Item`: `SalesOrderItemText`, `RequestedQuantity` |
| Menu price | Sales Order `_ItemPricingElement` where `ConditionClass` = B (price) |
| Merchant’s promotion | Menu price − `NetAmount` (discount conditions) |
| Fee basis | Sales Order `_Item`: `NetAmount` |
| Deduction amount | Credit Memo Request: `TotalNetAmount` |
| Deducted on | Credit Memo Request: `CreationDate` + `CreationTime` |
| Reason | Credit Memo Request: `SDDocumentReason` (a code) |
| Order it was made against | Credit Memo Request: `ReferenceSDDocument` |
| Refunded items | Credit Memo Request `_Item`: `CreditMemoRequestItemText`, `RequestedQuantity` |

**What the wrapper adds**, because the APIs only partly fit the solution:

- **Fee and expected payout.** A sales order has no marketplace fee, so the app works it out in `src/domain/rules.ts`: fee = fee basis × 30%, payout = fee basis − fee.
- **Accept, decline and challenge.** This prototype uses only GET requests to SAP. The merchant’s answers, the payout shown, simulated deductions and challenges are kept in the browser. Production write-back would need a backend and suitable APIs for each action. The earlier sandbox write check returned HTTP 405 on the Purchase Order API; these two services have not separately been write-tested.
- **Reason texts.** SAP returns a reason code only, and each SAP system configures its own texts. The sample data uses its own codes (`Z01`, `Z02`) with texts in `src/domain/mapping.ts`; codes from the sandbox are shown as they are.
- **The two time limits** are rules in `src/domain/rules.ts`, not SAP data: 30 days from the order date to challenge (Uber’s published rule) and an outcome by day 7 after the deduction (proposed in the A2-D1).

On the SAP sandbox the credit memo requests are several years old and refer to SAP’s own invoices and returns, so the Payouts screen lists them as closed; the challenge can be tried on the sample data.

**How the data is read** in the top bar shows the same information inside the app.

## Run it

Needs Node 22 or later.

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # one self-contained file: dist/index.html, which also opens by double-clicking it
npm run e2e      # with the dev server running: walks through both data sources in headless Chrome, screenshots in e2e/shots/
npm run e2e:import # merged local demo, using synthetic API test responses
E2E_LIVE_SAP=1 npm run e2e:import # same import/accept/deduct/challenge flow with real SAP GETs
```

The sample data works without any setup. For the SAP sandbox, copy `.env.example` to `.env.local` and paste your API key from api.sap.com. The key is read at build time, so it ends up inside `dist/index.html`; `.env.local` and `dist/` are not committed.

`index.html?source=sap` or `?source=sample` opens the app on that data source.

## Where things are

| Path | What it holds |
|---|---|
| `src/sap/repository.ts` | The wrapper’s interface, and where the merchant’s actions are stored |
| `src/sap/sapRepository.ts`, `src/sap/client.ts` | Calls to the SAP sandbox |
| `src/sap/mockRepository.ts`, `src/sap/mock-data.ts` | Sample records in the two APIs’ formats |
| `src/sap/importedOrders.ts` | Imports original SAP orders and item pricing into the local demo, with a saved timestamp |
| `src/sap/types.ts` | The SAP fields the app reads |
| `src/domain/mapping.ts` | SAP records → what the screens show; reason texts |
| `src/domain/rules.ts` | Fee rate, expected payout, and the two time limits |
| `src/state/store.tsx` | Data source, loading, and what the merchant has done |
| `src/apps/merchant/` | Merchant tablet: new orders, the offer, accepted orders, payouts |
| `src/components/ui/` | shadcn/ui components |

Stack: Vite, React, TypeScript, Tailwind CSS v4, shadcn/ui (Radix), lucide icons.

## Notes on the numbers

- The 30% fee rate is illustrative. With a merchant-funded item promotion the fee is calculated on the discounted price, as in the NZ Merchant Service Terms §6.2(b).
- Whether the real Uber Eats merchant app already shows a net amount on the offer is not known from public guidance; Gao’s A2-D1 checks this in Stage 0.
- `../SAP API Pool v4.xlsx` is an API selection reference. Its Sales Order row lists `API_SALES_ORDER_SRV` (OData V2), whereas the app uses Sales Order (A2X, OData V4), consistent with the lab tutorial. The spreadsheet does not include Credit Memo Request or provide merchant acceptance/challenge operations. The “v4” in the workbook filename is the pool's version, not a declaration that every listed API is OData V4.

## Earlier version

The git tag `four-solution-prototype` is the earlier draft that combined all four team proposals (merchant, customer and support views).
