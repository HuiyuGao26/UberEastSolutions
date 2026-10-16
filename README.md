# Order Care: merchant app prototype for Uber Eats NZ

A prototype for our INFOSYS 704 group assignment (A3). It builds Gao’s A2-D1 proposal for Uber Eats merchants, “change the sequence, not the price”, as two features on a merchant tablet.

> Student prototype for a university course. Not affiliated with Uber. The sample people, merchants, orders and numbers are fictional, and the 30% fee rate is illustrative.

## What it does

**1. See what an order pays before accepting it** (Release 1)

- **New orders.** Each order offer shows the expected payout.
- **Review offer.** Items at menu price, the merchant’s own promotion, the fee basis, the fee, and the expected payout. Accept or decline.
- **Accepted.** Accepted orders, each with the payout that was shown at the moment of acceptance.

**2. See a deduction the same day, with the reason, and challenge it** (Release 2)

- **Payouts.** A customer refund taken from the payout shows its reason, the items, the fee that is kept in full, and the payout before and after.
- **Challenge this deduction.** The merchant writes why it should be reversed and sends it. The card then shows the challenge and the date an outcome is due (day 7). A deduction can be challenged within 30 days of the order date.

The merchant can optionally attach one JPEG or PNG photo (up to 5 MB), preview or remove it before sending, and open the saved photo afterward. Photos are resized and kept only in this browser alongside the challenge, not sent to SAP or a reviewer. If saving fails, the form keeps the explanation and photo for retrying. Unsent drafts are not retained after leaving Payouts or reloading. Reset clears submitted challenges and their photos.

The sample day starts with four new orders and no deductions. After accepting an order, use **Simulate: customer reports a missing item** in the top bar outside the tablet. This plays the customer reporting a problem after delivery: one unit of the cheapest item on the most recently accepted order is refunded, at its price after any promotion. The tablet shows a notification and a Payouts badge without navigating away or opening a dialog. Open **Payouts** to see why and send a challenge.

For example: accept order **4821** with an expected payout of **$39.06** → simulate the missing item → see a **$5.00** deduction for one Feijoa soda → open Payouts and see **$39.06 → $34.06**, with the **$16.74** fee kept in full → send a challenge.

The simulation is available only with sample data, once per accepted order. Before accepting an order it is disabled; after simulating a report, accept another order to try it again. On the SAP sandbox it stays disabled: orders and credit memo requests are read for display, and acceptance is kept locally as before.

**Reset** in the top bar starts the sample day again, clearing decisions, simulated refunds and challenges. What you do is saved in your browser only, including simulated deductions after a reload.

## How it uses the SAP APIs

The screens read through one wrapper, `OrderRepository` in `src/sap/repository.ts`, which follows two SAP OData V4 APIs on the SAP Business Accelerator Hub: **Sales Order (A2X)** and **Credit Memo Request (A2X)**. It has two implementations, switched with **Data source** in the top bar:

| Data source | Implementation | What it reads |
|---|---|---|
| Sample data (default) | `src/sap/mockRepository.ts` | Fictional Uber Eats records in `src/sap/mock-data.ts`, written in the two APIs’ formats |
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
- **Accept, decline and challenge.** The sandbox only allows GET (writes return HTTP 405), and neither API takes a challenge. The merchant’s answers, the payout shown and the challenges are kept in the browser. With a company’s own S/4HANA system they would be written back.
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
```

The sample data works without any setup. For the SAP sandbox, copy `.env.example` to `.env.local` and paste your API key from api.sap.com. The key is read at build time, so it ends up inside `dist/index.html`; `.env.local` and `dist/` are not committed.

`index.html?source=sap` or `?source=sample` opens the app on that data source.

## Where things are

| Path | What it holds |
|---|---|
| `src/sap/repository.ts` | The wrapper’s interface, and where the merchant’s actions are stored |
| `src/sap/sapRepository.ts`, `src/sap/client.ts` | Calls to the SAP sandbox |
| `src/sap/mockRepository.ts`, `src/sap/mock-data.ts` | Sample records in the two APIs’ formats |
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

## Earlier version

The git tag `four-solution-prototype` is the earlier draft that combined all four team proposals (merchant, customer and support views).
