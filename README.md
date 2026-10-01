# Order Care: prototype for Uber Eats NZ

A clickable front-end prototype for our INFOSYS 704 group (A3). It shows how the four A2-D1 proposals work together on **one order**, from tonight’s peak forecast to a challenged deduction.

> Student prototype for a university course. All people, merchants, orders and numbers are fictional or illustrative. Not affiliated with Uber.
>
> **This is a design draft, not the A3 submission.** A3 must be built and exported from SAP Build Apps (AppGyver). We use this React version to agree on screens, flow and data before rebuilding it there.

## The four proposals in the app

| Proposal (A2-D1) | Domain | Where it appears |
|---|---|---|
| Lin: peak-demand forecast for merchants | Strategic | Merchant tablet → Home: “Busy night ahead” forecast, reasons, suggestions, confirm a plan |
| Gao: net payout before acceptance; same-day challenge route | Financial | Merchant tablet → order offer shows expected payout and fee basis; Payouts shows each deduction on the day it happens, with the reason, deadlines and a “Challenge” button |
| Manu: live courier data verifies issues; auto voucher | Operational | Customer phone → Get help → “My order is late”: verified from live courier data, voucher offered with no agent. Support console → live order panel (no phone calls) |
| Janbandhu: one accountable case owner, shared case record | Organisational | Support console → every case has one owner; merchant, courier and specialist give input without taking the case; decision rights; a challenge returns to the same owner |

The **Insights** page in the support console shows the KPIs each proposal is measured by. Turn **Proposal tags** on or off in the top bar to show or hide which proposal each feature comes from.

## The demo flow

Open the **Demo guide** (top right) and press the green button at each step. The guide switches between the three devices and fast-forwards the order when needed.

1. Merchant plans for tonight’s peak (Lin)
2. Merchant accepts an order after seeing the net payout (Gao)
3. Courier runs late; the customer asks for help (Manu)
4. System verifies the delay with live courier data and offers a voucher (Manu)
5. Order arrives with a drink missing; the customer reports it (Janbandhu)
6. One case owner checks the facts and asks the merchant (Janbandhu, Manu)
7. Merchant answers inside the same case (Janbandhu)
8. Owner resolves within their authority (Janbandhu)
9. Merchant sees the deduction the same day and challenges it (Gao)
10. The same owner reviews the challenge (Janbandhu, Gao)
11. Results across all four proposals (all)

**Reset** in the top bar starts again. Progress is saved in your browser only.

## Run it locally

Needs Node 22 or later.

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build in dist/
npm run e2e      # with the dev server running: clicks through all 11 steps in headless Chrome, screenshots in e2e/shots/
```

## Deploy to Cloudflare

Either option works; the site is static.

- **Cloudflare Pages** (simplest): Workers & Pages → Create → Pages → Connect to Git → pick this repo. Framework preset: *React (Vite)*. Build command `npm run build`, output directory `dist`.
- **Cloudflare Workers**: import the repo as a Worker. `wrangler.jsonc` already points at `dist`. Build command `npm run build`, deploy command `npx wrangler deploy`.

## Where things are

| Path | What it holds |
|---|---|
| `src/domain/mock.ts` | All demo data: merchant, orders, couriers, cases, forecast, KPI baselines and targets |
| `src/domain/types.ts` | Data model |
| `src/state/reducer.ts` | Every action in the demo (accept order, report issue, resolve case, challenge deduction…) |
| `src/demo/steps.ts` | The 11 guided steps |
| `src/apps/merchant/` | Merchant tablet |
| `src/apps/customer/` | Customer phone |
| `src/apps/support/` | Support console and Insights |
| `src/components/ui/` | shadcn/ui components |

Stack: Vite, React, TypeScript, Tailwind CSS v4, shadcn/ui (Radix), lucide icons.

## Notes on the numbers

- The 30% fee rate is illustrative. With a merchant-funded item promotion the fee is calculated on the discounted price, as in the NZ Merchant Service Terms §6.2(b).
- Deduction deadlines: challenges within 30 days of the order date (Uber’s published rule); “notice the same day” and “decision by day 7” are the rules proposed in Gao’s A2-D1.
- KPI “before” values are assumptions for the prototype. Lin’s 90% and 80% are the assumed baselines in her A2-D1.
