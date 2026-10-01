/**
 * Seed data for the demo. Every person, merchant, order and number here is
 * fictional or an illustrative assumption; none of it is Uber data.
 *
 * Demo day: Friday 16 October 2026, Auckland. Clock values are minutes
 * since midnight (17:40 = 1060).
 */
import type {
  Agent,
  Case,
  Courier,
  DemoState,
  Merchant,
  Order,
  PastCase,
  PastPayout,
  PeakForecast,
  PeakOrderStat,
} from './types'

export const DEMO_DATE = 'Fri 16 Oct 2026'
export const ORDER_DATE_PLUS_30 = 'Sun 15 Nov 2026'
export const DAY_SEVEN = 'Fri 23 Oct 2026'

/** Times used by the guided demo. */
export const T = {
  start: 17 * 60 + 40,
  heroOffer: 18 * 60 + 22,
  heroEta: 18 * 60 + 55,
  courierLate: 18 * 60 + 58,
  delivered: 19 * 60 + 14,
}

/** Proposed rule from Manu's A2-D1: a verified delay over 15 minutes earns a voucher. */
export const AUTO_VOUCHER = { minDelayMin: 15, amount: 5 }

const merchants: Merchant[] = [
  { id: 'm1', name: 'Kōwhai Kitchen', suburb: 'Ponsonby', feeRate: 0.3 },
  { id: 'm2', name: 'Harbour Dumpling Co.', suburb: 'Auckland CBD', feeRate: 0.3 },
  { id: 'm3', name: 'Tāmaki Taco Bar', suburb: 'Kingsland', feeRate: 0.3 },
]

const forecast: PeakForecast = {
  merchantId: 'm1',
  window: '6:00–8:00 pm tonight',
  expectedOrders: 42,
  typicalOrders: 26,
  confidence: 'Medium',
  drivers: [
    'Rain expected from 5:30 pm',
    'Friday dinner pattern over the last 8 weeks',
    'Nearby event finishing at 7:30 pm',
  ],
  suggestions: [
    'Add 1 kitchen staff member from 5:45 pm',
    'Prep 20 katsu portions and a batch of fries before 6:00 pm',
    'Use a +5 min prep-time buffer instead of pausing orders',
  ],
  slots: [
    { label: '5:00', expected: 3, typical: 3 },
    { label: '5:30', expected: 6, typical: 5 },
    { label: '6:00', expected: 11, typical: 7 },
    { label: '6:30', expected: 13, typical: 8 },
    { label: '7:00', expected: 11, typical: 7 },
    { label: '7:30', expected: 7, typical: 4 },
    { label: '8:00', expected: 3, typical: 2 },
    { label: '8:30', expected: 2, typical: 2 },
  ],
}

const couriers: Courier[] = [
  { id: 'c1', name: 'Sam K.', vehicle: 'bike', progress: 0, lastPingSec: 20, note: 'Waiting for pickup' },
  { id: 'c2', name: 'Lena W.', vehicle: 'scooter', progress: 1, lastPingSec: 40, note: 'Delivered' },
  { id: 'c3', name: 'Tom R.', vehicle: 'car', progress: 0.6, lastPingSec: 15, note: 'On the way' },
  { id: 'c4', name: 'Ana P.', vehicle: 'bike', progress: 0, lastPingSec: 25, note: 'Waiting for pickup' },
]

const heroOrder: Order = {
  id: 'UE-4821',
  merchantId: 'm1',
  customerName: 'Mia T.',
  customerSuburb: 'Grey Lynn',
  items: [
    { name: 'Chicken katsu bowl', qty: 2, unitPrice: 19.5 },
    { name: 'Kūmara fries', qty: 1, unitPrice: 8.5, merchantDiscount: 0.2 },
    { name: 'Feijoa soda', qty: 2, unitPrice: 5 },
  ],
  status: 'scheduled',
  placedAt: T.heroOffer,
  etaAt: T.heroEta,
  delayMin: 0,
  courierId: 'c1',
}

const orders: Order[] = [
  heroOrder,
  {
    id: 'UE-4776',
    merchantId: 'm1',
    customerName: 'Rangi H.',
    customerSuburb: 'Herne Bay',
    items: [{ name: 'Teriyaki salmon bowl', qty: 1, unitPrice: 22 }],
    status: 'delivered',
    placedAt: 17 * 60 + 5,
    etaAt: 17 * 60 + 35,
    delayMin: 0,
    courierId: 'c2',
    payoutShownAtAcceptance: 15.4,
  },
  {
    id: 'UE-4795',
    merchantId: 'm1',
    customerName: 'Olivia S.',
    customerSuburb: 'Freemans Bay',
    items: [
      { name: 'Chicken katsu bowl', qty: 1, unitPrice: 19.5 },
      { name: 'Feijoa soda', qty: 1, unitPrice: 5 },
    ],
    status: 'on_the_way',
    placedAt: 17 * 60 + 22,
    etaAt: 17 * 60 + 52,
    delayMin: 0,
    courierId: 'c3',
    payoutShownAtAcceptance: 17.15,
  },
  {
    id: 'UE-4799',
    merchantId: 'm1',
    customerName: 'James L.',
    customerSuburb: 'Westmere',
    items: [
      { name: 'Tofu katsu bowl', qty: 2, unitPrice: 18.5 },
      { name: 'Kūmara fries', qty: 2, unitPrice: 8.5, merchantDiscount: 0.2 },
    ],
    status: 'preparing',
    placedAt: 17 * 60 + 36,
    etaAt: 18 * 60 + 10,
    delayMin: 0,
    courierId: 'c4',
    payoutShownAtAcceptance: 35.42,
  },
  {
    id: 'UE-4790',
    merchantId: 'm2',
    customerName: 'Hannah K.',
    customerSuburb: 'Parnell',
    items: [{ name: 'Pork & chive dumplings (12)', qty: 1, unitPrice: 18 }],
    status: 'delivered',
    placedAt: 16 * 60 + 50,
    etaAt: 17 * 60 + 20,
    delayMin: 0,
    courierId: 'c2',
  },
  {
    id: 'UE-4802',
    merchantId: 'm3',
    customerName: 'Wiremu P.',
    customerSuburb: 'Mt Albert',
    items: [{ name: 'Fish tacos (3)', qty: 2, unitPrice: 16 }],
    status: 'delivered',
    placedAt: 16 * 60 + 40,
    etaAt: 17 * 60 + 10,
    delayMin: 0,
    courierId: 'c3',
  },
]

const agents: Agent[] = [
  { id: 'a1', name: 'Aroha N.', team: 'Order Support NZ', refundLimit: 30, voucherLimit: 10 },
  { id: 'a2', name: 'Ben L.', team: 'Order Support NZ', refundLimit: 30, voucherLimit: 10 },
  { id: 'a3', name: 'Priya S.', team: 'Order Support NZ', refundLimit: 30, voucherLimit: 10 },
]

const cases: Case[] = [
  {
    id: 'CS-1032',
    orderId: 'UE-4790',
    type: 'wrong_item',
    detail: 'Received prawn dumplings instead of pork & chive.',
    status: 'awaiting_info',
    ownerId: 'a2',
    openedAt: 17 * 60 + 31,
    autoVerified: false,
    customerContacts: 1,
    ownershipTransfers: 0,
    escalated: false,
    reopened: false,
    events: [
      { at: 17 * 60 + 31, actor: 'customer', text: 'Reported a wrong item with a photo.' },
      { at: 17 * 60 + 31, actor: 'system', text: 'Case created and assigned to Ben L. as owner.' },
      { at: 17 * 60 + 36, actor: 'owner', text: 'Asked the merchant to confirm what was packed.' },
    ],
  },
  {
    id: 'CS-1033',
    orderId: 'UE-4802',
    type: 'not_delivered',
    detail: 'App says delivered but nothing arrived.',
    status: 'with_specialist',
    ownerId: 'a3',
    openedAt: 17 * 60 + 18,
    autoVerified: false,
    customerContacts: 1,
    ownershipTransfers: 0,
    escalated: true,
    reopened: false,
    events: [
      { at: 17 * 60 + 18, actor: 'customer', text: 'Reported the order as not delivered.' },
      { at: 17 * 60 + 18, actor: 'system', text: 'Case created and assigned to Priya S. as owner.' },
      { at: 17 * 60 + 25, actor: 'owner', text: 'Order over NZ$30: asked Specialist Review for a decision. Ownership stays with Priya S.' },
    ],
  },
]

/** Closed cases from the pilot period, for the KPI page only. */
const pastCases: PastCase[] = [
  { resolutionMin: 6, contacts: 1, escalatedOrReopened: false, autoVerified: true },
  { resolutionMin: 4, contacts: 1, escalatedOrReopened: false, autoVerified: true },
  { resolutionMin: 22, contacts: 1, escalatedOrReopened: false, autoVerified: false },
  { resolutionMin: 31, contacts: 2, escalatedOrReopened: false, autoVerified: false },
  { resolutionMin: 18, contacts: 1, escalatedOrReopened: false, autoVerified: false },
  { resolutionMin: 5, contacts: 1, escalatedOrReopened: false, autoVerified: true },
  { resolutionMin: 47, contacts: 2, escalatedOrReopened: true, autoVerified: false },
  { resolutionMin: 26, contacts: 1, escalatedOrReopened: false, autoVerified: false },
  { resolutionMin: 7, contacts: 1, escalatedOrReopened: false, autoVerified: true },
  { resolutionMin: 29, contacts: 1, escalatedOrReopened: false, autoVerified: false },
  { resolutionMin: 64, contacts: 3, escalatedOrReopened: true, autoVerified: false },
  { resolutionMin: 19, contacts: 1, escalatedOrReopened: false, autoVerified: false },
  { resolutionMin: 3, contacts: 1, escalatedOrReopened: false, autoVerified: true },
  { resolutionMin: 24, contacts: 1, escalatedOrReopened: false, autoVerified: false },
  { resolutionMin: 35, contacts: 2, escalatedOrReopened: false, autoVerified: false },
  { resolutionMin: 21, contacts: 1, escalatedOrReopened: false, autoVerified: false },
]

/** This week's completed orders at Kōwhai Kitchen: amount shown at acceptance vs paid. */
const pastPayouts: PastPayout[] = [
  ['UE-4602', 28.4, 28.4],
  ['UE-4611', 41.65, 41.65],
  ['UE-4619', 15.4, 15.4],
  ['UE-4630', 35.42, 35.42],
  ['UE-4644', 22.05, 22.05],
  ['UE-4652', 39.06, 34.06],
  ['UE-4660', 17.15, 17.15],
  ['UE-4671', 26.6, 26.6],
  ['UE-4683', 48.3, 48.3],
  ['UE-4690', 12.6, 12.6],
  ['UE-4702', 31.5, 31.5],
  ['UE-4711', 19.25, 19.25],
  ['UE-4719', 44.1, 44.1],
  ['UE-4728', 27.3, 27.3],
  ['UE-4736', 33.6, 33.6],
  ['UE-4744', 15.4, 15.4],
  ['UE-4751', 38.15, 38.15],
  ['UE-4759', 21.7, 21.7],
  ['UE-4766', 29.75, 29.75],
  ['UE-4770', 24.5, 24.5],
].map(([orderId, shown, paid]) => ({ orderId: orderId as string, shown: shown as number, paid: paid as number }))

/** Last Friday's 6–8 pm peak at Kōwhai Kitchen (38 orders). */
const peakStats: PeakOrderStat[] = Array.from({ length: 38 }, (_, i) => ({
  completed: i !== 7 && i !== 23,
  onTime: ![3, 7, 11, 19, 23].includes(i),
}))

export function createSeed(): DemoState {
  return {
    clock: T.start,
    merchants,
    merchantId: 'm1',
    forecast: structuredClone(forecast),
    orders: structuredClone(orders),
    couriers: structuredClone(couriers),
    cases: structuredClone(cases),
    requests: [
      {
        id: 'RQ-201',
        caseId: 'CS-1032',
        party: 'merchant',
        question: 'Which dumplings were packed for UE-4790?',
        askedAt: 17 * 60 + 36,
      },
    ],
    adjustments: [],
    agents,
    currentAgentId: 'a1',
    heroOrderId: heroOrder.id,
    pastCases,
    pastPayouts,
    peakStats,
    ui: {
      role: 'merchant',
      merchant: { name: 'home' },
      customer: { name: 'tracking' },
      support: { name: 'queue' },
      showProposalTags: true,
      guideOpen: true,
    },
    seq: 1040,
  }
}

/**
 * Illustrative "before" values for the KPI page. They are assumptions for
 * the prototype, not measurements; Julia's 90% / 80% are the assumed
 * baselines in her A2-D1.
 */
export const ILLUSTRATIVE_BASELINE = {
  medianResolutionMin: 38,
  contactsPerCase: 1.8,
  escalatedOrReopened: 0.28,
  autoVerifiedShare: 0,
  peakCompletion: 0.9,
  peakOnTime: 0.8,
  mppr: 0.88,
  pepc: 0,
}

export const TARGETS = {
  medianResolution: '−30% vs baseline (Janbandhu)',
  contactsPerCase: '−25% vs baseline (Janbandhu)',
  escalatedOrReopened: '−20% vs baseline (Janbandhu)',
  autoVerified: '60% of simple cases need no agent (Manu)',
  peakCompletion: 'Above 95% (Lin)',
  peakOnTime: 'Above 90% (Lin)',
  mppr: 'At least 95% (Gao)',
  pepc: '100% of offers nationally (Gao)',
}
