/**
 * Shared sales database — the single source for Sales history and Order details.
 * Ported verbatim from the source prototypes; the two pages read the same records.
 */

export type Tone = 'success' | 'warning' | 'no' | 'go' | 'neutral'
export type Channel = 'delivery' | 'pickup' | 'takeNow' | 'return'
export type PayState = 'paid' | 'partial' | 'unpaid'

export interface Person {
  initials: string
  name: string
  color: string
  contact?: string
  location?: string
  link?: boolean
}

export interface LineItem {
  qty: string
  name: string
  meta: string
  price: string
  /** Optional unit-level tax caption, e.g. "+ $36.00 tax" or "no tax". */
  unit?: string
  /** Units that cannot be fulfilled yet (drives the "N available" warning). */
  short?: number
  note?: string
}

export interface Group {
  label: string
  channel: Channel
  done: boolean
  /** Whether the products in this group include a service. */
  serviceIncluded?: boolean
  packed?: boolean
  /** Outlet the stock for this group ships or is collected from. */
  outlet?: string
  /**
   * The group cannot be acted on from here — typically because it belongs to
   * another outlet. Hides the pack/ship steps and the split action alike.
   */
  readOnly?: boolean
  carrier?: string
  tracking?: string
  items: LineItem[]
}

/** The states a service moves through, in workflow order. */
export const SERVICE_STATES = [
  'New',
  'Ready To Start',
  'In Progress',
  'Awaiting Customer',
  'Awaiting Part',
  'Completed',
] as const

export type ServiceState = (typeof SERVICE_STATES)[number]

/** Tone per service state, so a state and its pill colour can never drift apart. */
export const SERVICE_TONE: Record<ServiceState, Tone> = {
  New: 'warning',
  'Ready To Start': 'go',
  'In Progress': 'warning',
  'Awaiting Customer': 'warning',
  'Awaiting Part': 'warning',
  Completed: 'success',
}

export interface Service {
  name: string
  price: string
  qty: string
  /** Outlet performing the service. */
  outlet: string
  /** Booked date, or "–" when the customer has not booked a slot yet. */
  scheduled: string
  state: ServiceState
}

export interface Payment {
  method: string
  when: string
  amount: string
}

export interface Money {
  subtotal: string
  showDiscounts: boolean
  discounts: string
  taxLabel: string
  tax: string
  showExtra: boolean
  extraLabel: string
  extra: string
  total: string
  payments: Payment[]
  showBalance: boolean
  balance: string
}

export interface ActionRef {
  label: string
  icon?: string
  danger?: boolean
}

export interface ReturnRecord {
  label: string
  items: string
  reason: string
  refunded: string
}

export interface Sale {
  id: string
  receipt: string
  when: string
  customer: Person
  soldBy: Person
  note: string
  total: string
  status: { label: string; tone: Tone; icon: string; rank: number }
  payState: PayState
  pay: { label: string; tone: Tone }
  groups: Group[]
  emptyItems: boolean
  services?: Service[]
  returns?: ReturnRecord[]
  money: Money
  actions: {
    primary: ActionRef
    secondary: ActionRef[]
    more: ActionRef[]
  }
}

export const SALES_DB: Sale[] = [
{
id: 's94', receipt: '#94', when: 'Aug 21, 10:12 AM',
customer: { initials: 'AD', name: 'Amara Diallo', contact: 'a.diallo@example.com · 619 441 2075', color: '#365B85', link: true },
soldBy: { initials: 'ES', name: 'Ecwid Support', location: 'Solana Beach', color: '#E3B23C' },
note: 'Stock pulled from three outlets. Beanies ship once Solana Beach restocks; the Carlsbad parcel goes out same day.',
total: '$637.36',
status: { label: 'Delivery,\npartly fulfilled', tone: 'warning', icon: 'local_shipping', rank: 2 },
payState: 'paid',
pay: { label: 'Paid', tone: 'success' },
groups: [
{
label: 'Shipped Aug 21', channel: 'delivery', done: true, outlet: 'Encinitas',
carrier: 'UPS Ground', tracking: '1Z999AA10987654321',
items: [
{ qty: '2', name: 'Canvas tote / navy', meta: 'TOT-CNV', price: '$130.00' },
{ qty: '1', name: 'Leather card holder', meta: 'WAL-LCH', price: '$45.00' }
]
},
{
label: 'For delivery', channel: 'delivery', done: false, outlet: 'Solana Beach',
items: [
{ qty: '3', name: 'Wool beanie / grey', meta: 'HAT-WBG', price: '$135.00', short: 1 },
{ qty: '1', name: 'Silk pillowcase', meta: 'HOM-SPC', price: '$90.00' }
]
},
{
label: 'For delivery', channel: 'delivery', done: false, outlet: 'Carlsbad', readOnly: true,
items: [
{ qty: '2', name: 'Ceramic mug / white', meta: 'HOM-CMW', price: '$64.00' },
{ qty: '1', name: 'Linen scarf / sand', meta: 'SCF-LIN', price: '$50.00' }
]
}
],
emptyItems: false,
money: {
subtotal: '$514.00', showDiscounts: false, discounts: '', taxLabel: 'Total tax (1 tax)', tax: '$123.36',
showExtra: false, extraLabel: '', extra: '', total: '$637.36',
payments: [{ method: 'Card · Visa ···· 2219', when: 'Aug 21, 2026, 10:14 AM', amount: '$637.36' }],
showBalance: false, balance: ''
},
actions: {
primary: { label: 'Fulfill', icon: 'check' },
secondary: [{ label: 'Edit' }],
more: [{ label: 'Print or email receipt', icon: 'receipt_long' }]
}
},
{
id: 's91', receipt: '#91', when: 'Aug 20, 9:48 AM',
customer: { initials: 'HK', name: 'Hanne Kvist', contact: 'h.kvist@example.com · 312 550 7781', color: '#5B58F7', link: true },
soldBy: { initials: 'LE', name: 'Lightspeed eCom', location: 'Encinitas', color: '#EA6A45' },
note: 'Wholesale order for Kvist Studio. Deliver to the loading dock, weekdays before 4 PM.',
total: '$1,026.72',
status: { label: 'Delivery,\nunfulfilled', tone: 'warning', icon: 'local_shipping', rank: 1 },
payState: 'paid',
pay: { label: 'Paid', tone: 'success' },
groups: [{
label: 'For delivery', channel: 'delivery', done: false,
items: [
{ qty: '6', name: 'Linen scarf / sand', meta: 'SCF-LIN', price: '$300.00' },
{ qty: '4', name: 'Canvas tote / navy', meta: 'TOT-CNV', price: '$260.00' },
{ qty: '5', name: 'Wool beanie / grey', meta: 'HAT-WBG', price: '$225.00', short: 2 },
{ qty: '3', name: 'Leather card holder', meta: 'WAL-LCH', price: '$135.00' }
]
}],
emptyItems: false,
money: {
subtotal: '$920.00', showDiscounts: true, discounts: '−$92.00', taxLabel: 'Total tax (1 tax)', tax: '$198.72',
showExtra: false, extraLabel: '', extra: '', total: '$1,026.72', payments: [{ method: 'Card · Visa ···· 3308', when: 'Aug 20, 2026, 9:50 AM', amount: '$1,026.72' }], showBalance: false, balance: ''
},
actions: {
primary: { label: 'Fulfill', icon: 'check' },
secondary: [{ label: 'Edit' }],
more: [{ label: 'Print or email receipt', icon: 'receipt_long' }]
}
},
{
id: 's86', receipt: '#86', when: 'Aug 8, 3:12 PM',
customer: { initials: 'RO', name: 'Rafael Ortiz', contact: 'r.ortiz@example.com · 786 220 3390', color: '#A83AB5', link: true },
soldBy: { initials: 'ES', name: 'Ecwid Support', location: 'Encinitas', color: '#E3B23C' },
note: 'Customer collects on Saturday, call 30 minutes ahead.',
total: '$558.00',
status: { label: 'Pickup,\nunfulfilled', tone: 'warning', icon: 'storefront', rank: 1 },
payState: 'partial',
pay: { label: 'Partially paid', tone: 'warning' },
groups: [{
label: 'For pickup', channel: 'pickup', done: false,
items: [
{ qty: '3', name: 'Ceramic mug / white', meta: 'HOM-CMW', price: '$96.00', short: 3 },
{ qty: '2', name: 'Silk pillowcase', meta: 'HOM-SPC', price: '$180.00' },
{ qty: '2', name: 'Gloves / m / red', meta: 'GLV-M-RED', price: '$174.00', short: 1 }
]
}],
emptyItems: false,
money: {
subtotal: '$450.00', showDiscounts: false, discounts: '', taxLabel: 'Total tax (1 tax)', tax: '$108.00',
showExtra: false, extraLabel: '', extra: '', total: '$558.00',
payments: [{ method: 'Cash · deposit', when: 'Aug 8, 2026, 3:14 PM', amount: '$200.00' }],
showBalance: true, balance: '$358.00'
},
actions: {
primary: { label: 'Fulfill', icon: 'check' },
secondary: [{ label: 'Edit' }],
more: [{ label: 'Print or email receipt', icon: 'receipt_long' }]
}
},
{
id: 's90', receipt: '#90', when: 'Aug 18, 12:35 PM',
customer: { initials: 'SW', name: 'Sofia Wren', contact: 's.wren@example.com · 917 640 1188', color: '#E63FEC', link: true },
soldBy: { initials: 'ES', name: 'Ecwid Support', location: 'Encinitas', color: '#E3B23C' },
note: 'Split into two shipments. Customer took the mugs home the same day; call before delivering the rest.',
total: '$1,021.76',
status: { label: 'Delivery,\npartly fulfilled', tone: 'warning', icon: 'local_shipping', rank: 2 },
payState: 'partial',
pay: { label: 'Partially paid', tone: 'warning' },
groups: [
{
label: 'Shipped Aug 19', channel: 'delivery', done: true,
carrier: 'UPS Ground', tracking: '1Z999AA10123456812',
items: [
{ qty: '2', name: 'Oversized Weekender Bag', meta: 'BAG-OWK', price: '$300.00' },
{ qty: '1', name: 'Stainless Steel Chronograph', meta: 'WCH-SSC', price: '$180.00' }
]
},
{
label: 'For delivery', channel: 'delivery', done: false,
items: [
{ qty: '2', name: 'Silk pillowcase', meta: 'HOM-SPC', price: '$180.00', short: 1 },
{ qty: '2', name: 'Linen scarf / sand', meta: 'SCF-LIN', price: '$100.00' }
]
},
{
label: 'Taken at the time of sale', channel: 'takeNow', done: true,
items: [
{ qty: '2', name: 'Ceramic mug / white', meta: 'HOM-CMW', price: '$64.00' }
]
}
],
emptyItems: false,
money: {
subtotal: '$824.00', showDiscounts: false, discounts: '', taxLabel: 'Total tax (1 tax)', tax: '$197.76',
showExtra: false, extraLabel: '', extra: '', total: '$1,021.76',
payments: [{ method: 'Card · Visa ···· 1104', when: 'Aug 18, 2026, 12:36 PM', amount: '$667.36' }],
showBalance: true, balance: '$354.40'
},
actions: {
primary: { label: 'Fulfill', icon: 'check' },
secondary: [{ label: 'Edit' }],
more: [{ label: 'Print or email receipt', icon: 'receipt_long' }]
}
},
{
id: 's93', receipt: '#93', when: 'Aug 15, 10:40 AM',
customer: { initials: 'LM', name: 'Lena Moreau', contact: 'l.moreau@example.com · 415 662 3318', color: '#5B58F7', link: true },
soldBy: { initials: 'ES', name: 'Ecwid Support', location: 'Encinitas', color: '#E3B23C' },
note: 'Customer dropping the watch off Thursday morning.',
total: '$99.20',
status: { label: 'Completed', tone: 'success', icon: 'check_circle', rank: 5 },
payState: 'paid',
pay: { label: 'Paid', tone: 'success' },
groups: [
{
label: 'Taken at the time of sale', channel: 'takeNow', done: true,
serviceIncluded: true,
items: [
{ qty: '1', name: 'Leather watch strap / brown', meta: 'ACC-LWS', price: '$35.00' }
]
}
], emptyItems: false,
services: [
{ name: 'Watch strap fitting', price: '$45.00', qty: '1',
  outlet: 'Encinitas', scheduled: 'Aug 20, 9:00 AM', state: 'New' }
],
money: {
subtotal: '$80.00', showDiscounts: false, discounts: '', taxLabel: 'Total tax (1 tax)', tax: '$19.20',
showExtra: false, extraLabel: '', extra: '', total: '$99.20',
payments: [{ method: 'Card · Visa ···· 4417', when: 'Sat, Aug 15, 2026, 11:30 AM', amount: '$99.20' }],
showBalance: false, balance: ''
},
actions: {
primary: { label: 'Print or email receipt', icon: 'receipt_long' },
secondary: [{ label: 'Edit' }],
more: []
}
},
{
id: 's95', receipt: '#95', when: 'Aug 19, 2:05 PM',
customer: { initials: 'PN', name: 'Priya Nair', contact: 'p.nair@example.com · 408 332 9014', color: '#4B1FA0', link: true },
soldBy: { initials: 'ES', name: 'Ecwid Support', location: 'Encinitas', color: '#E3B23C' },
note: 'Frame fitting booked at Encinitas.',
total: '$173.60',
status: { label: 'In progress', tone: 'warning', icon: 'build', rank: 3 },
payState: 'paid',
pay: { label: 'Paid', tone: 'success' },
groups: [
{
label: 'Taken at the time of sale', channel: 'takeNow', done: true,
serviceIncluded: true,
items: [
{ qty: '1', name: 'Optical frame / tortoise', meta: 'EYE-OFT', price: '$80.00' }
]
}
], emptyItems: false,
services: [
{ name: 'Frame fitting', price: '$60.00', qty: '1',
  outlet: 'Encinitas', scheduled: 'Aug 22, 11:00 AM', state: 'In Progress' }
],
money: {
subtotal: '$140.00', showDiscounts: false, discounts: '', taxLabel: 'Total tax (1 tax)', tax: '$33.60',
showExtra: false, extraLabel: '', extra: '', total: '$173.60',
payments: [{ method: 'Card · Visa ···· 7781', when: 'Aug 19, 2026, 2:07 PM', amount: '$173.60' }],
showBalance: false, balance: ''
},
actions: {
primary: { label: 'Print or email receipt', icon: 'receipt_long' },
secondary: [{ label: 'Edit' }],
more: []
}
},
{
id: 's92', receipt: '#92', when: 'Aug 13, 7:28 AM',
customer: { initials: 'T', name: 'test', contact: 'veta+loyaltty3@ecwid.com · 191111282', color: '#E3B23C', link: true },
soldBy: { initials: 'LE', name: 'Lightspeed eCom', location: 'Encinitas', color: '#EA6A45' },
note: 'Gift, no price on the slip.',
total: '$120.00',
status: { label: 'Completed', tone: 'success', icon: 'check_circle', rank: 5 },
payState: 'paid',
pay: { label: 'Paid', tone: 'success' },
groups: [{
label: 'Picked up', channel: 'pickup', done: true,
items: [{ qty: '1', name: 'Gloves / m / red', meta: 'GLV-M-RED', price: '$120.00', unit: 'no tax' }]
}],
emptyItems: false,
money: {
subtotal: '$120.00', showDiscounts: false, discounts: '', taxLabel: 'Total tax (no tax)', tax: '$0.00',
showExtra: false, extraLabel: '', extra: '', total: '$120.00', payments: [{ method: 'Cash', when: 'Aug 13, 2026, 7:29 AM', amount: '$120.00' }], showBalance: false, balance: ''
},
actions: {
primary: { label: 'Print or email receipt', icon: 'receipt_long' },
secondary: [{ label: 'Return items' }],
more: [{ label: 'Print or email receipt', icon: 'receipt_long' }, { label: 'Edit', icon: 'edit' }]
}
},
{
id: 's88', receipt: '#88', when: 'Aug 12, 4:15 PM',
customer: { initials: 'MR', name: 'Marina Ruiz', contact: 'm.ruiz@example.com · 415 220 8891', color: '#5B58F7', link: true },
soldBy: { initials: 'LE', name: 'Lightspeed eCom', location: 'Encinitas', color: '#EA6A45' },
note: 'Split shipment. Customer notified about the backordered bag. Watch is a gift, no price on the slip.',
total: '$412.40',
status: { label: 'Delivery,\npartly fulfilled', tone: 'warning', icon: 'local_shipping', rank: 2 },
payState: 'paid',
pay: { label: 'Paid', tone: 'success' },
groups: [
{
label: 'Shipped Aug 13', channel: 'delivery', done: true,
items: [
{ qty: '1', name: 'Oversized Weekender Bag', meta: 'BAG-OWK', price: '$150.00', unit: '+ $36.00 tax' },
{ qty: '1', name: 'Stainless Steel Chronograph', meta: 'WCH-SSC', price: '$180.00', unit: '+ $43.20 tax' }
]
},
{
label: 'For delivery', channel: 'delivery', done: false,
items: [
{ qty: '1', name: 'Minimalist Bag', meta: 'BAG-MIN', price: '$150.00', unit: 'no tax' },
{ qty: '1', name: 'Gloves / m / red', meta: 'GLV-M-RED', price: '$3.20', unit: 'no tax', short: 1 }
]
}
],
emptyItems: false,
money: {
subtotal: '$483.20', showDiscounts: true, discounts: '−$150.00', taxLabel: 'Total tax (1 tax)', tax: '$79.20',
showExtra: false, extraLabel: '', extra: '', total: '$412.40', payments: [{ method: 'Card · Mastercard ···· 5521', when: 'Aug 12, 2026, 4:17 PM', amount: '$412.40' }], showBalance: false, balance: ''
},
actions: {
primary: { label: 'Fulfill', icon: 'check' },
secondary: [{ label: 'Edit' }],
more: [{ label: 'Print or email receipt', icon: 'receipt_long' }]
}
},
{
id: 's89', receipt: '#89', when: 'Aug 10, 6:10 PM',
customer: { initials: 'TE', name: 'T. Est', contact: 'sever@test.com · 123 123 123', color: '#E63FEC', link: true },
soldBy: { initials: 'LE', name: 'Lightspeed eCom', location: 'Encinitas', color: '#EA6A45' },
note: 'Leave with the building concierge. Do not ring the bell.',
total: '$98.33',
status: { label: 'Delivery,\nunfulfilled', tone: 'warning', icon: 'local_shipping', rank: 1 },
payState: 'unpaid',
pay: { label: 'Unpaid', tone: 'no' },
groups: [{
label: 'For delivery', channel: 'delivery', done: false,
items: [
{ qty: '1', name: 'Gloves / m / red', meta: 'GLV-M-RED', price: '$60.00', unit: 'no tax' },
{ qty: '1', name: 'Shipping — standard (1ship)', meta: '17bee4bf-e2ee-47c8-bc1e-330548b01cbb', price: '$25.50', unit: 'no tax' }
]
}],
emptyItems: false,
money: {
subtotal: '$85.50', showDiscounts: false, discounts: '', taxLabel: 'Total tax (no tax)', tax: '$0.00',
showExtra: true, extraLabel: 'Tip', extra: '$12.83', total: '$98.33',
payments: [], showBalance: true, balance: '$98.33'
},
actions: {
primary: { label: 'Continue', icon: 'redo' },
secondary: [{ label: 'Edit' }],
more: [
{ label: 'Fulfill sale', icon: 'check' },
{ label: 'Print or email receipt', icon: 'receipt_long' },
{ label: 'Void', icon: 'block', danger: true }
]
}
},
{
id: 's84', receipt: '#84', when: 'Aug 6, 11:20 AM',
customer: { initials: 'JB', name: 'Jonas Brekke', contact: 'j.brekke@example.com · 206 771 4402', color: '#4B1FA0', link: true },
soldBy: { initials: 'ES', name: 'Ecwid Support', location: 'Encinitas', color: '#E3B23C' },
note: 'Staff restock order, invoice to head office.',
total: '$272.80',
status: { label: 'Completed', tone: 'success', icon: 'check_circle', rank: 5 },
payState: 'paid',
pay: { label: 'Paid', tone: 'success' },
groups: [{
label: 'Picked up', channel: 'pickup', done: true,
items: [
{ qty: '1', name: 'Ruffle tiered mini dress in smoky blue', meta: 'DRS-RTM', price: '$20.00' },
{ qty: '1', name: 'Minimalist Bag', meta: 'BAG-MIN', price: '$20.00' },
{ qty: '1', name: 'Gloves / m / red', meta: 'GLV-M-RED', price: '$20.00' },
{ qty: '1', name: 'Stainless Steel Chronograph', meta: 'WCH-SSC', price: '$20.00' },
{ qty: '1', name: 'Oversized Weekender Bag', meta: 'BAG-OWK', price: '$20.00' },
{ qty: '1', name: 'Linen scarf / sand', meta: 'SCF-LIN', price: '$20.00' },
{ qty: '1', name: 'Canvas tote / navy', meta: 'TOT-CNV', price: '$20.00' },
{ qty: '1', name: 'Leather card holder', meta: 'WAL-LCH', price: '$20.00' },
{ qty: '1', name: 'Wool beanie / grey', meta: 'HAT-WBG', price: '$20.00' },
{ qty: '1', name: 'Silk pillowcase', meta: 'HOM-SPC', price: '$20.00' },
{ qty: '1', name: 'Ceramic mug / white', meta: 'HOM-CMW', price: '$20.00' }
]
}],
emptyItems: false,
money: {
subtotal: '$220.00', showDiscounts: false, discounts: '', taxLabel: 'Total tax (1 tax)', tax: '$52.80',
showExtra: false, extraLabel: '', extra: '', total: '$272.80', payments: [{ method: 'Cash', when: 'Aug 6, 2026, 11:21 AM', amount: '$272.80' }], showBalance: false, balance: ''
},
actions: {
primary: { label: 'Print or email receipt', icon: 'receipt_long' },
secondary: [{ label: 'Return items' }],
more: [{ label: 'Print or email receipt', icon: 'receipt_long' }, { label: 'Edit', icon: 'edit' }]
}
},
{
id: 's79', receipt: '#79', when: 'Jun 24, 5:36 PM',
customer: { initials: 'N', name: 'Nikita', contact: 'Nikita-KVMT · 123 412 234', color: '#A83AB5', link: true },
soldBy: { initials: 'ES', name: 'Ecwid Support', location: 'Encinitas', color: '#E3B23C' },
note: '',
total: '$120.60',
status: { label: 'Delivery,\nunfulfilled', tone: 'warning', icon: 'local_shipping', rank: 1 },
payState: 'paid',
pay: { label: 'Paid', tone: 'success' },
groups: [
{
label: 'For delivery', channel: 'delivery', done: false,
items: [
{ qty: '1', name: 'Minimalist Bag', meta: 'BAG-MIN', price: '$200.00', unit: 'no tax' },
{ qty: '1', name: 'Oversized Weekender Bag', meta: 'BAG-OWK', price: '$150.00', unit: 'no tax' }
]
},
{
label: 'Returned', channel: 'return', done: true,
items: [{ qty: '1', name: 'Ruffle tiered mini dress in smoky blue', meta: 'DRS-RTM', price: '−$90.00', unit: '+ $30.60 tax' }]
},
{
label: 'Taken at the time of sale', channel: 'takeNow', done: true,
items: [{ qty: '1', name: 'Stainless Steel Chronograph', meta: 'WCH-SSC · Was: $350.00 · Disc: 100.00% / $350.00', price: '$350.00', unit: 'no tax' }]
}
],
emptyItems: false,
returns: [{ label: 'Return #R-204 · Jun 26, 2026', items: '1 × Ruffle tiered mini dress in smoky blue', reason: 'Customer changed mind', refunded: '$90.00 to cash' }],
money: {
subtotal: '$790.00', showDiscounts: true, discounts: '−$350.00', taxLabel: 'Total tax (2 taxes)', tax: '$30.60',
showExtra: true, extraLabel: 'Refunded (1 return)', extra: '−$120.60', total: '$350.00',
payments: [{ method: 'Card · Visa ···· 4417', when: 'Jun 24, 2026, 5:38 PM', amount: '$470.60' }],
showBalance: false, balance: ''
},
actions: {
primary: { label: 'Fulfill', icon: 'check' },
secondary: [{ label: 'Return items' }, { label: 'Edit' }],
more: [{ label: 'Print or email receipt', icon: 'receipt_long' }]
}
}
]

/** The order the list presents: outstanding work first, history last. Unpaid breaks ties within a rank. */
/** The sale with every service marked Completed. */
export const withServicesCompleted = (s: Sale): Sale =>
  s.services?.length ? { ...s, services: s.services.map((sv) => ({ ...sv, state: 'Completed' as const })) } : s

/** A service sale still has work to do until every service is Completed. */
export const servicePending = (s: Sale) => (s.services || []).some((sv) => sv.state !== 'Completed')

/** Delivery and pickup work that has not been fully completed yet. */
export const hasOutstandingFulfillment = (
  groups: Pick<Group, 'channel' | 'done'>[] | undefined,
) =>
  (groups || []).some((g) => (g.channel === 'delivery' || g.channel === 'pickup') && !g.done)

export const salesInListOrder = (): Sale[] =>
  SALES_DB.slice().sort((a, b) => {
    const r = (x: Sale) => (x.status.rank || 9) * 10 + (x.payState === 'unpaid' ? 0 : 1)
    return r(a) - r(b)
  })

/** Group order, shared by both pages: outstanding work first, history last. */
export function groupsInOrder<T extends { done?: boolean; packed?: boolean; channel?: Channel }>(
  groups: T[] | undefined,
): T[] {
  const rank = (g: T) => {
    if (g.done) return g.channel === 'takeNow' ? 5 : 4
    if (g.channel === 'return') return 3
    return g.packed ? 2 : 1
  }
  return (groups || []).slice().sort((a, b) => rank(a) - rank(b))
}

/**
 * Splits one fulfillment group in two: the picked item indices become their own
 * group, the remainder stays. Returns the list untouched when the split would
 * leave either side empty.
 */
export function splitGroup(groups: Group[], index: number, picked: number[]): Group[] {
  const target = groups[index]
  if (!target) return groups
  const set = new Set(picked)
  const taken = target.items.filter((_, j) => set.has(j))
  const rest = target.items.filter((_, j) => !set.has(j))
  if (!taken.length || !rest.length) return groups
  const next = groups.slice()
  next.splice(index, 1, { ...target, items: rest }, { ...target, items: taken })
  return next
}

export interface ServiceGroup {
  state: ServiceState
  outlets: string[]
  services: Service[]
}

/** Services split into one section per state, in workflow order. */
export function groupServicesByState(services: Service[]): ServiceGroup[] {
  const out: ServiceGroup[] = []
  ;(services || []).forEach((sv) => {
    let g = out.find((x) => x.state === sv.state)
    if (!g) {
      g = { state: sv.state, outlets: [], services: [] }
      out.push(g)
    }
    g.services.push(sv)
    if (!g.outlets.includes(sv.outlet)) g.outlets.push(sv.outlet)
  })
  return out.sort((a, b) => SERVICE_STATES.indexOf(a.state) - SERVICE_STATES.indexOf(b.state))
}

/** Icons for actions the data records by label only. */
const ACTION_ICONS: Record<string, string> = {
  Edit: 'edit',
  'Edit details': 'edit',
  'Return items': 'assignment_return',
  Continue: 'redo',
  'Continue sale': 'redo',
  'Continue return': 'redo',
  'Fulfill sale': 'check',
  'Mark as shipped': 'local_shipping',
  'Mark as packed': 'inventory_2',
  'Print or email receipt': 'receipt_long',
  'Share quote': 'ios_share',
  'Capture payment': 'payments',
}

export const actionIcon = (label: string): string => ACTION_ICONS[label] || 'bolt'
