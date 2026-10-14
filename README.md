# Order Care: merchant app prototype for Uber Eats NZ

A prototype for our INFOSYS 704 group assignment (A3). It builds **one feature** from Gao’s A2-D1 proposal (Release 1): an Uber Eats merchant sees what an order will pay **before** accepting it.

> Student prototype for a university course. Not affiliated with Uber. The sample people, merchants, orders and numbers are fictional, and the 30% fee rate is illustrative.

## What it does

1. **New orders.** Each order offer shows the expected payout.
2. **Review offer.** Items at menu price, the merchant’s own promotion, the fee basis, the fee, and the expected payout.
3. **Accept or decline.** Accepted orders are listed with the payout that was shown at the moment of acceptance.

**Reset** in the top bar turns every order back into a new offer. Answers are saved in your browser only.

## How it uses the SAP API

The screens read orders through one wrapper, `OrderRepository` in `src/sap/repository.ts`, which follows the SAP **Sales Order (A2X) OData V4 API** on the SAP Business Accelerator Hub. It has two implementations, switched with **Data source** in the top bar:

| Data source | Implementation | What it reads |
|---|---|---|
| Sample data (default) | `src/sap/mockRepository.ts` | Fictional Uber Eats orders in `src/sap/mock-data.ts`, written in the Sales Order API’s format |
| SAP sandbox | `src/sap/sapRepository.ts` | The live SAP sandbox. It returns SAP’s own demo orders, not Uber Eats orders |

Two requests are made:

- `GET …/SalesOrder?$expand=_Item,_Partner`: orders, items and customers
- `GET …/SalesOrderItem(SalesOrder='…',SalesOrderItem='…')/_ItemPricingElement`: prices and discounts of one item

| On screen | Sales Order API field |
|---|---|
| Order number | `SalesOrder` |
| Placed | `CreationDate` + `CreationTime` |
| Customer | `_Partner` (sold-to): `BusinessPartnerName1`, `CityName` |
| Item name and quantity | `_Item`: `SalesOrderItemText`, `RequestedQuantity` |
| Menu price | `_ItemPricingElement` where `ConditionClass` = B (price) |
| Merchant’s promotion | Menu price − `NetAmount` (discount conditions) |
| Fee basis | `_Item`: `NetAmount` |

**What the wrapper adds**, because the API only partly fits the solution:

- **Fee and expected payout.** A sales order has no marketplace fee, so the app works it out in `src/domain/rules.ts`: fee = fee basis × 30%, payout = fee basis − fee.
- **Accept and decline.** The sandbox only allows GET (writes return HTTP 405), so the merchant’s answer and the payout shown are kept in the browser. With a company’s own S/4HANA system they would be written back to the order.

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
| `src/sap/repository.ts` | The wrapper’s interface, and where decisions are stored |
| `src/sap/sapRepository.ts`, `src/sap/client.ts` | Calls to the SAP sandbox |
| `src/sap/mockRepository.ts`, `src/sap/mock-data.ts` | Sample orders in the Sales Order API’s format |
| `src/sap/types.ts` | The Sales Order API fields the app reads |
| `src/domain/mapping.ts` | Sales Order records → what the screens show |
| `src/domain/rules.ts` | Fee rate and the expected payout |
| `src/state/store.tsx` | Data source, loading, and the merchant’s answers |
| `src/apps/merchant/` | Merchant tablet: new orders, the offer, accepted orders |
| `src/components/ui/` | shadcn/ui components |

Stack: Vite, React, TypeScript, Tailwind CSS v4, shadcn/ui (Radix), lucide icons.

## Notes on the numbers

- The 30% fee rate is illustrative. With a merchant-funded item promotion the fee is calculated on the discounted price, as in the NZ Merchant Service Terms §6.2(b).
- Whether the real Uber Eats merchant app already shows a net amount on the offer is not known from public guidance; Gao’s A2-D1 checks this in Stage 0.

## Earlier version

The git tag `four-solution-prototype` is the earlier draft that combined all four team proposals (merchant, customer and support views).
