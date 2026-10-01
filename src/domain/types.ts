export type Role = 'merchant' | 'customer' | 'support'

/** Whose A2-D1 proposal a feature comes from. */
export type Proposal = 'julia' | 'huiyu' | 'manu' | 'aabhas'

/** Demo clock: minutes since midnight on the demo day (Fri 16 Oct 2026). */
export type Minute = number

export interface Merchant {
  id: string
  name: string
  suburb: string
  /** Illustrative marketplace fee rate, not an Uber figure. */
  feeRate: number
}

export interface ForecastSlot {
  label: string
  expected: number
  typical: number
}

export interface PeakPlan {
  extraStaff: number
  prepAhead: boolean
  prepBufferMin: number
}

export interface PeakForecast {
  merchantId: string
  window: string
  expectedOrders: number
  typicalOrders: number
  confidence: 'Medium' | 'High'
  drivers: string[]
  suggestions: string[]
  slots: ForecastSlot[]
  plan?: PeakPlan
}

export interface OrderItem {
  name: string
  qty: number
  unitPrice: number
  /** Merchant-funded discount on this line, as a fraction of list price. */
  merchantDiscount?: number
}

/** 'scheduled' orders are not visible yet; the demo releases them. */
export type OrderStatus = 'scheduled' | 'offered' | 'declined' | 'preparing' | 'on_the_way' | 'delivered'

export interface Order {
  id: string
  merchantId: string
  customerName: string
  customerSuburb: string
  items: OrderItem[]
  status: OrderStatus
  placedAt: Minute
  etaAt: Minute
  delayMin: number
  courierId: string
  /** Snapshot of the expected payout shown when the merchant accepted. */
  payoutShownAtAcceptance?: number
}

export interface Courier {
  id: string
  name: string
  vehicle: 'bike' | 'scooter' | 'car'
  /** 0 = at merchant, 1 = at customer. */
  progress: number
  lastPingSec: number
  note: string
}

export type IssueType = 'late' | 'missing_item' | 'wrong_item' | 'not_delivered'

export type CaseStatus =
  | 'voucher_offered'
  | 'open'
  | 'awaiting_info'
  | 'with_specialist'
  | 'resolved'
  | 'merchant_challenge'
  | 'closed'

export type Actor = 'customer' | 'system' | 'owner' | 'merchant' | 'courier' | 'specialist'

export interface CaseEvent {
  at: Minute
  actor: Actor
  text: string
  /** Hidden from the customer (merchant, courier and specialist exchanges). */
  internal?: boolean
}

export type Fault = 'merchant' | 'courier' | 'platform' | 'none'

export interface Resolution {
  kind: 'voucher' | 'refund' | 'no_action'
  amount: number
  fault: Fault
  note: string
}

export interface InfoRequest {
  id: string
  caseId: string
  party: 'merchant' | 'courier'
  question: string
  askedAt: Minute
  answer?: string
  answeredAt?: Minute
}

export interface Case {
  id: string
  orderId: string
  type: IssueType
  detail: string
  status: CaseStatus
  ownerId?: string
  openedAt: Minute
  closedAt?: Minute
  autoVerified: boolean
  voucherOffer?: number
  customerContacts: number
  ownershipTransfers: number
  escalated: boolean
  reopened: boolean
  events: CaseEvent[]
  resolution?: Resolution
}

export interface AdjustmentLine {
  label: string
  amount: number
}

export type AdjustmentStatus = 'open' | 'challenged' | 'upheld' | 'reversed'

export interface Adjustment {
  id: string
  caseId: string
  orderId: string
  merchantId: string
  amount: number
  reason: string
  lines: AdjustmentLine[]
  createdAt: Minute
  /** Official rule: disputes within 30 days of the order date. */
  respondBy: string
  /** Proposed ATRR rule: status update by day seven. */
  decisionDueBy: string
  status: AdjustmentStatus
  merchantResponse?: string
  decisionNote?: string
}

export interface Agent {
  id: string
  name: string
  team: string
  refundLimit: number
  voucherLimit: number
}

/** A past case, used only to make the KPI page look populated. */
export interface PastCase {
  resolutionMin: number
  contacts: number
  escalatedOrReopened: boolean
  autoVerified: boolean
}

/** A completed order this week, for payout predictability (MPPR). */
export interface PastPayout {
  orderId: string
  shown: number
  paid: number
}

export interface PeakOrderStat {
  completed: boolean
  onTime: boolean
}

export interface MerchantScreen {
  name: 'home' | 'orders' | 'payouts' | 'requests'
}
export interface CustomerScreen {
  name: 'tracking' | 'help' | 'case'
  caseId?: string
}
export interface SupportScreen {
  name: 'queue' | 'case' | 'insights'
  caseId?: string
}

export interface UiState {
  role: Role
  merchant: MerchantScreen
  customer: CustomerScreen
  support: SupportScreen
  showProposalTags: boolean
  guideOpen: boolean
}

export interface DemoState {
  clock: Minute
  merchants: Merchant[]
  /** The merchant whose tablet is shown. */
  merchantId: string
  forecast: PeakForecast
  orders: Order[]
  couriers: Courier[]
  cases: Case[]
  requests: InfoRequest[]
  adjustments: Adjustment[]
  agents: Agent[]
  currentAgentId: string
  heroOrderId: string
  pastCases: PastCase[]
  pastPayouts: PastPayout[]
  peakStats: PeakOrderStat[]
  ui: UiState
  seq: number
}
