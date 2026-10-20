import {
  actionIcon,
  groupServicesByState,
  groupsInOrder,
  hasOutstandingFulfillment,
  servicePending,
  type Channel,
  type LineItem,
  type ReturnRecord,
  type Sale,
  type Tone,
} from '../data/sales'

/** stepKey -> the furthest fulfillment step recorded for that group this session. */
export type StepMap = Record<number, 'done' | 'packed' | undefined>

export interface Chip {
  label: string
  icon: string
  visible: boolean
  tone: Tone
}

const chip = (label: string, tone: Tone, icon = ''): Chip => ({
  label,
  icon,
  visible: !!label,
  tone,
})

/** A chip that only repeats what the heading already says is dropped. */
const SAME: Record<string, string[]> = {
  collected: ['collected', 'picked up'],
  shipped: ['shipped', 'sent'],
  'taken in store': ['taken'],
  refunded: ['refunded'],
}

function chipFor(title: string, c: Chip): Chip {
  if (!c || !c.label) return c
  const t = String(title || '').toLowerCase()
  const words = SAME[c.label.toLowerCase()] || [c.label.toLowerCase()]
  return words.some((w) => t.includes(w)) ? { ...c, visible: false } : c
}

const A = {
  ship: { label: 'Mark as shipped', icon: 'local_shipping' },
  pack: { label: 'Mark as packed', icon: 'inventory_2' },
  pickup: { label: 'Record customer pickup', icon: 'how_to_reg' },
  printDocs: { label: 'Print packing slip', icon: 'print' },
  continueReturn: { label: 'Continue return', icon: 'redo' },
}

const CHIP: Record<Channel, { done: Chip; packed?: Chip; open: Chip }> = {
  delivery: {
    done: chip('Shipped', 'success'),
    packed: chip('Packed', 'go'),
    open: chip('Not started', 'warning'),
  },
  pickup: {
    done: chip('Collected', 'success', 'check_circle'),
    packed: chip('Packed', 'go'),
    open: chip('Not started', 'warning'),
  },
  takeNow: { done: chip('', 'success'), open: chip('', 'go') },
  return: {
    done: chip('Refunded', 'success', 'check_circle'),
    open: chip('Parked', 'warning', 'pause_circle'),
  },
}

/**
 * Simplified from the source: "Split fulfillment" and "Buy shipping label" are dropped —
 * neither had a working handler in the design file, so every action here is real.
 */
const ACTS: Record<Channel, { label: string; icon: string }[]> = {
  delivery: [A.ship, A.printDocs],
  pickup: [A.pickup, A.printDocs],
  takeNow: [A.printDocs],
  return: [A.continueReturn, A.printDocs],
}

const PICK_KIND: Record<string, 'pack' | 'ship' | 'pickup'> = {
  'mark as packed': 'pack',
  'mark as shipped': 'ship',
  'record customer pickup': 'pickup',
}

export const stepKindFor = (label: string): 'pack' | 'ship' | 'pickup' | undefined =>
  PICK_KIND[String(label || '').toLowerCase()]

/* ---------------- money breakdown for the per-item popover ---------------- */

export interface MoneyRow {
  label: string
  value: string
}

function itemMoney(it: LineItem, qty: number) {
  const amount = (s: string | undefined) => {
    const m = String(s || '').match(/(-|\u2212)?\$?\s*([0-9][0-9,]*(?:\.[0-9]{2})?)/)
    return m ? (m[1] ? -1 : 1) * parseFloat(m[2].replace(/,/g, '')) : 0
  }
  const fmt = (v: number) => (v < 0 ? '\u2212$' : '$') + Math.abs(v).toFixed(2)
  const net = amount(it.price)
  const taxMag =
    /tax/i.test(it.unit || '') && !/no tax/i.test(it.unit || '') ? Math.abs(amount(it.unit)) : 0
  const tax = (net < 0 ? -1 : 1) * taxMag
  const rows: MoneyRow[] = [{ label: 'Price per item', value: fmt(net / qty) }]
  if (qty > 1) rows.push({ label: 'Amount', value: String(qty) })
  rows.push({ label: 'Subtotal', value: fmt(net) })
  rows.push({ label: 'Tax', value: tax ? fmt(tax) : '$0.00' })
  return { rows, withTax: fmt(net + tax), unitPrice: fmt(net / qty) }
}

function qtyLabel(q: string, negative: boolean): string {
  const total = parseInt(String(q || '').split('/')[1], 10) || 0
  return total ? (negative ? '\u2212' : '') + total : '\u2013'
}

function fillQty(q: string): string {
  const parts = String(q ?? '').split('/')
  const total = parts.length > 1 ? parts[1] : parts[0]
  return total + '/' + total
}

/* ---------------- view-model group shapes ---------------- */

interface StagedGroup {
  stepKey: number
  channel: Channel
  title: string
  chip: Chip
  actions: { label: string; icon: string }[]
  done: boolean
  packed: boolean
  visible: number
  totalQty: string
  canSplit: boolean
  /** "Shipment 1" etc. for delivery groups; empty otherwise. */
  shipment: string
  outlet: string
  carrier: string
  tracking: string
  items: LineItem[]
}

export interface ViewItem extends LineItem {
  note: string
  itemNote: string
  moneyKey: string
  moneyRows: MoneyRow[]
  moneyWithTax: string
}

export interface ViewGroup extends Omit<StagedGroup, 'items'> {
  items: ViewItem[]
  overflow: GroupAction[]
  barActions: GroupAction[]
  hasMore: boolean
  hasOutlet: boolean
  hasTracking: boolean
}

export interface GroupAction {
  label: string
  icon: string
  stepKey: number
  order: number
  lead: boolean
}

/** Applies session steps on top of the staged groups. */
function applySteps(groups: StagedGroup[], steps: StepMap): StagedGroup[] {
  return groups.map((g, i) => {
    const step = steps[g.stepKey ?? i]
    if (!step) return g
    const done = step === 'done'
    const ch = g.channel || 'delivery'
    const items = done ? g.items.map((it) => ({ ...it, qty: fillQty(it.qty) })) : g.items
    const table = CHIP[ch] || CHIP.delivery
    const EVENT: Record<Channel, string> = {
      delivery: 'Shipped',
      pickup: 'Picked up',
      takeNow: 'Taken in store',
      return: 'Returned',
    }
    /* A numbered shipment keeps its name; only its chip changes once sent. */
    const title = done && !g.shipment ? (EVENT[ch] || 'Fulfilled') + ' just now' : g.title
    const chipNow = done ? table.done : (table.packed ?? table.open)
    const acts = done ? [A.printDocs] : ACTS[ch] || ACTS.delivery
    return {
      ...g,
      items,
      done,
      packed: true,
      title,
      chip: chipFor(title, chipNow),
      canSplit: g.canSplit && !done,
      actions: acts.map((a) => ({ label: a.label, icon: a.icon })),
      totalQty: done ? fillQty(g.totalQty) : g.totalQty,
    }
  })
}

const NEXT_STEP = /^(mark as packed|mark as shipped|record customer pickup|continue return)$/i

function actionBar(g: StagedGroup, i: number, from?: number): GroupAction[] {
  const vis = g.visible ?? 2
  const list = from == null ? g.actions.slice(0, vis) : g.actions.slice(from)
  return list.map((x, k) => ({
    label: x.label,
    icon: x.icon,
    order: 10 - k,
    stepKey: g.stepKey ?? i,
    lead: k === 0 && !g.done && NEXT_STEP.test(String(x.label || '').trim()),
  }))
}

/**
 * Names every shipped parcel "Shipment N" in data order and surfaces its
 * Shipped chip. Runs after steps are applied, so a group marked as shipped
 * during the session is numbered exactly like one that arrived shipped.
 */
function numberShipments(groups: StagedGroup[]): StagedGroup[] {
  let n = 0
  const names = new Map<number, string>()
  groups
    .slice()
    .sort((a, b) => a.stepKey - b.stepKey)
    .forEach((g) => {
      if (g.done && g.channel === 'delivery') names.set(g.stepKey, `Shipment ${++n}`)
    })
  return groups.map((g) => {
    const name = names.get(g.stepKey)
    if (!name) return g
    return { ...g, shipment: name, title: name, chip: chipFor(name, CHIP.delivery.done) }
  })
}

function withOverflow(groupsIn: StagedGroup[], steps: StepMap): ViewGroup[] {
  const groups = numberShipments(groupsInOrder(applySteps(groupsIn, steps)))
  return groups.map((g, i) => ({
    ...g,
    totalQty: qtyLabel(g.totalQty, g.channel === 'return'),
    items: g.items.map((it, j) => {
      const qty = parseInt(String(it.qty).split('/').pop() || '', 10) || 1
      const m = itemMoney(it, qty)
      const outstanding = Math.max(
        0,
        (parseInt(String(it.qty).split('/')[1], 10) || 0) -
          (parseInt(String(it.qty).split('/')[0], 10) || 0),
      )
      const short =
        g.channel === 'return' || g.done || outstanding === 0 ? 0 : Number(it.short) || 0
      const avail = qty - short
      return {
        ...it,
        note: short > 0 ? (avail <= 0 ? 'Out of stock' : `${avail} available`) : '',
        itemNote: it.note || '',
        moneyKey: `${i}-${j}`,
        qty: qtyLabel(it.qty, g.channel === 'return'),
        price: m.unitPrice,
        moneyRows: m.rows,
        moneyWithTax: m.withTax,
      }
    }),
    barActions: actionBar(g, i),
    overflow: actionBar(g, i, g.visible ?? 2),
    hasMore: g.actions.length > (g.visible ?? 2),
    hasOutlet: !!g.outlet,
    hasTracking: !!g.tracking,
  }))
}

/* ---------------- returns: shaped like a fulfillment group ---------------- */

export interface ViewReturn {
  /** "Return #R-204" — the reference, without the date that follows it. */
  title: string
  /** "Jun 26, 2026", shown as the section subtitle. */
  when: string
  chip: Chip
  reason: string
  /** Where the money went, e.g. "Cash". */
  refundedTo: string
  items: { qty: string; name: string }[]
  totalQty: string
  refundTotal: string
}

function buildReturn(r: ReturnRecord): ViewReturn {
  const [title, when] = String(r.label || '').split('\u00b7')
  const items = String(r.items || '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const m = part.match(/^(\d+)\s*[\u00d7x]\s*(.+)$/i)
      return m ? { qty: m[1], name: m[2].trim() } : { qty: '1', name: part }
    })
  /* "$90.00 to cash" -> the amount and its destination. */
  const money = String(r.refunded || '').match(/^(\S+)\s+to\s+(.+)$/i)
  return {
    title: (title || 'Return').trim(),
    when: (when || '').trim(),
    chip: chip('Refunded', 'success'),
    reason: r.reason,
    refundedTo: money ? money[2].charAt(0).toUpperCase() + money[2].slice(1) : '\u2013',
    items,
    totalQty: String(items.reduce((n, it) => n + (parseInt(it.qty, 10) || 0), 0)),
    refundTotal: money ? money[1] : String(r.refunded || ''),
  }
}

/* ---------------- edit-sale form helpers ---------------- */

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** Every record in this prototype sits in 2026; `when` omits the year. */
const SALE_YEAR = 2026

export interface SaleWhen {
  date: Date
  hour: string
  minute: string
  meridiem: string
}

/** "Aug 21, 10:12 AM" -> the parts the edit form binds to. */
export function parseSaleWhen(when: string): SaleWhen {
  const m = String(when || '').match(/^(\w{3})\s+(\d{1,2}),\s*(\d{1,2}):(\d{2})\s*(AM|PM)$/i)
  if (!m) return { date: new Date(SALE_YEAR, 0, 1), hour: '12', minute: '00', meridiem: 'PM' }
  const month = Math.max(0, MONTH_NAMES.indexOf(m[1]))
  return {
    date: new Date(SALE_YEAR, month, Number(m[2])),
    hour: String(Number(m[3])),
    minute: m[4],
    meridiem: m[5].toUpperCase(),
  }
}

/** The inverse of `parseSaleWhen`, so a saved edit matches the stored format. */
export function formatSaleWhen(d: Date, hour: string, minute: string, meridiem: string): string {
  return `${MONTH_NAMES[d.getMonth()]} ${d.getDate()}, ${hour}:${minute} ${meridiem}`
}

/** Splits a payment stamp like "Aug 21, 2026, 10:14 AM" into its date and time halves. */
export function splitStamp(stamp: string): { date: string; time: string } {
  const m = String(stamp || '').match(/^(.*),\s*(\d{1,2}:\d{2}\s*(?:AM|PM))$/i)
  return m ? { date: m[1].trim(), time: m[2].trim() } : { date: String(stamp || ''), time: '' }
}

/* ---------------- activity timeline: flat events -> day-grouped rail ---------------- */

export interface ActivityEvent {
  actor: string
  initials: string
  avatarBg: string
  time: string
  action: string
}

export interface ActivityDay {
  date: string
  events: ActivityEvent[]
  hasNext: boolean
}

function activityDays(list: { text: string; meta: string }[]): ActivityDay[] {
  const PALETTE = ['#A800B3', '#3A1AFE', '#A95F22', '#365B85', '#4B1FA0']
  const days: ActivityDay[] = []
  list.forEach((ev) => {
    const meta = String(ev.meta || '')
    const actor = meta.includes('\u00b7') ? meta.split('\u00b7').pop()!.trim() : ''
    const stamp = meta.split('\u00b7')[0].trim()
    const m = stamp.match(/^(.*?\d{4}),?\s*(.*)$/)
    const date = m ? m[1] : stamp
    const time = m ? m[2] : ''
    const initials = actor
      .split(/\s+/)
      .map((w) => w[0])
      .join('')
      .slice(0, 2)
      .toUpperCase()
    const seed = actor.split('').reduce((n, c) => n + c.charCodeAt(0), 0)
    let day = days.find((d) => d.date === date)
    if (!day) {
      day = { date, events: [], hasNext: false }
      days.push(day)
    }
    day.events.push({
      actor,
      initials: initials || '\u2014',
      avatarBg: PALETTE[seed % PALETTE.length] || '#4B1FA0',
      time,
      action: ev.text,
    })
  })
  days.reverse().forEach((d) => d.events.reverse())
  days.forEach((d, i) => {
    d.hasNext = i < days.length - 1
  })
  return days
}

/* ---------------- top action bar assembly + overflow dedupe ---------------- */

export interface OverflowItem {
  label: string
  icon: string
  danger: boolean
  divider: boolean
}

function splitActions(
  secondary: { label: string; icon: string }[],
  menu: { label: string; icon: string; danger: boolean; divider?: boolean }[],
  opts: { owes: boolean; continuePaidSale: boolean; canReturn: boolean; canVoid: boolean },
) {
  const bar = opts.continuePaidSale
    ? [
        { label: 'Edit', icon: 'edit' },
        { label: 'Continue sale', icon: 'redo' },
      ]
    : [
        { label: 'Print or email receipt', icon: 'receipt_long' },
        { label: 'Edit', icon: 'edit' },
      ]
  const barLabels = new Set(bar.map((a) => a.label))
  const drop = new Set(
    ['Fulfill sale', 'Fulfill items', 'Fulfill', 'Edit']
      .concat(opts.owes ? ['Continue', 'Continue sale'] : [])
      .concat([...barLabels]),
  )
  const extra: OverflowItem[] = secondary.map((a) => ({
    label: a.label,
    icon: a.icon || actionIcon(a.label),
    danger: false,
    divider: false,
  }))
  const tail: OverflowItem[] = []
  if (opts.continuePaidSale)
    tail.push({ label: 'Print or email receipt', icon: 'receipt_long', danger: false, divider: false })
  if (opts.canReturn)
    tail.push({ label: 'Return items', icon: 'assignment_return', danger: false, divider: false })
  if (opts.canVoid) tail.push({ label: 'Void', icon: 'block', danger: true, divider: true })

  const seen = new Set<string>()
  const overflowMenu = extra
    .concat(menu.map((m) => ({ ...m, divider: !!m.divider })))
    .concat(tail)
    .filter((m) => {
      if (drop.has(m.label)) return false
      const k = /^(void|discard)/i.test(m.label) ? 'void' : /^return/i.test(m.label) ? 'return' : m.label
      if (seen.has(k)) return false
      seen.add(k)
      return true
    })

  return { barSecondary: bar, overflowMenu, hasMenu: overflowMenu.length > 0 }
}

/* ---------------- the per-sale view model ---------------- */

export function buildOrderView(sale: Sale, steps: StepMap) {
  const moneyIn = sale.money
  const groupsRaw = (sale.groups || []).map((g, gi) => ({ ...g, stepKey: gi }))

  const groups: StagedGroup[] = groupsInOrder(groupsRaw).map((g) => {
    const ch = g.channel || 'delivery'
    const total = g.items.reduce((n, it) => n + (parseInt(it.qty, 10) || 0), 0)
    const short = g.items.some((it) => (Number(it.short) || 0) > 0)
    const canPack = ch === 'delivery' || ch === 'pickup'
    const chipNow = g.done
      ? CHIP[ch].done
      : short
        ? chip('Not started', 'warning')
        : g.packed && CHIP[ch].packed
          ? CHIP[ch].packed
          : CHIP[ch].open
    const baseActs = ACTS[ch] || ACTS.delivery
    const acts =
      g.done || g.readOnly
        ? [A.printDocs]
        : canPack && (short || !g.packed)
          ? [baseActs[0], A.pack, ...baseActs.slice(1)]
          : baseActs
    return {
      stepKey: g.stepKey,
      channel: ch,
      title: g.label,
      chip: chipFor(g.label, chipNow),
      actions: acts.map((a) => ({ label: a.label, icon: a.icon })),
      done: !!g.done,
      packed: !!g.packed,
      visible: !g.done && ch !== 'return' && (short || !g.packed) ? 2 : 1,
      totalQty: (g.done ? total : 0) + '/' + total,
      /* Filled in by numberShipments once the group counts as shipped. */
      shipment: '',
      /* Only open, non-return work can be split, and only when there is more than one line. */
      canSplit:
        !g.done && !g.readOnly && ch !== 'return' && ch !== 'takeNow' && g.items.length > 1,
      outlet: g.outlet || '',
      carrier: g.carrier || '',
      tracking: g.tracking || '',
      items: g.items.map((it) => ({ ...it, qty: (g.done ? it.qty : '0') + '/' + it.qty })),
    }
  })

  const fulfilGroups = applySteps(groups, steps).filter(
    (g) => g.channel === 'delivery' || g.channel === 'pickup',
  )
  const units = fulfilGroups.reduce(
    (n, g) => n + (parseInt(String(g.totalQty).split('/').pop() || '', 10) || 0),
    0,
  )
  const doneUnits = fulfilGroups
    .filter((g) => g.done)
    .reduce((n, g) => n + (parseInt(String(g.totalQty).split('/').pop() || '', 10) || 0), 0)
  const chans = Array.from(new Set(groups.map((g) => g.channel)))
  const resolved = units > 0 && doneUnits === units
  const showContinueFulfilNotice =
    sale.payState === 'paid' && (hasOutstandingFulfillment(fulfilGroups) || servicePending(sale))

  const owes = !!sale.pay && sale.pay.label !== 'Paid'
  const leftStore = groups.some((g) => g.done || g.channel === 'takeNow')
  /* A sale with anything returned against it can no longer be voided. */
  const hasReturns =
    (sale.returns || []).length > 0 || groups.some((g) => g.channel === 'return')
  const canVoid = !hasReturns

  const returns = (sale.returns || []).map(buildReturn)
  const services = sale.services || []

  const activity = [
    { text: 'created this sale', meta: `${sale.when}, 2026 \u00b7 ${sale.soldBy.name}` },
    {
      text:
        sale.payState === 'paid'
          ? `paid in full \u2014 ${moneyIn.total}`
          : sale.payState === 'partial'
            ? `collected a deposit \u2014 balance ${moneyIn.balance} outstanding`
            : 'did not collect payment',
      meta: `${sale.when}, 2026 \u00b7 ${sale.soldBy.name}`,
    },
  ]

  const actions = splitActions(
    (sale.actions.secondary || []).map((a) => ({ label: a.label, icon: actionIcon(a.label) })),
    (sale.actions.more || []).map((a) => ({
      label: a.label,
      icon: a.icon || 'bolt',
      danger: !!a.danger,
    })),
    { owes, continuePaidSale: showContinueFulfilNotice, canReturn: leftStore, canVoid },
  )

  return {
    docTitle: `Sale ${sale.receipt}`,
    ...actions,
    showContinueFulfilNotice,
    serviceGroups: groupServicesByState(services),
    showServices: services.length > 0,
    showFulfilNote: !services.length && groups.some((g) => g.channel !== 'return'),
    hasItems: groups.length > 0,
    noteBody: sale.note || '\u2013',
    returns,
    hasReturns: returns.length > 0,
    showAddresses: groups.some((g) => g.channel === 'delivery'),
    fulfilNote:
      units === 0 && !chans.length
        ? '\u2013'
        : chans.includes('pickup')
          ? `Hold at the ${sale.soldBy.location} counter until the customer collects.`
          : chans.includes('delivery')
            ? 'Deliver to the address on file; signature required.'
            : 'Customer took everything in store \u2014 nothing to ship.',
    payChip: sale.pay
      ? chip(sale.pay.label, sale.pay.tone, sale.payState === 'paid' ? 'payments' : 'credit_card_off')
      : chip(sale.status.label, sale.status.tone, sale.status.icon),
    showFulfilChip:
      units > 0 && !!sale.pay && chans.some((c) => c !== 'return') && !services.length,
    /* Mirrors the All sales status column, which reads "Service · Pending". */
    serviceChip: services.some((sv) => sv.state !== 'Completed') ? chip('Service pending', 'warning') : null,
    fulfilChip:
      units === 0
        ? chip('', 'neutral')
        : resolved
          ? chip('Fulfilled', 'success', 'check_circle')
          : chip(`${doneUnits} of ${units} fulfilled`, 'warning', 'pending'),
    money: {
      totalLabel: 'Sale total',
      dueLabel: 'Balance',
      total: moneyIn.total,
      subtotal: moneyIn.subtotal,
      showDiscounts: moneyIn.showDiscounts,
      discounts: moneyIn.discounts,
      taxLabel: moneyIn.taxLabel,
      tax: moneyIn.tax,
      showExtra: moneyIn.showExtra,
      extraLabel: moneyIn.extraLabel,
      extra: moneyIn.extra,
      paymentLines: moneyIn.payments || [],
      showDueNotice: owes,
      dueHead: (moneyIn.payments || []).length
        ? `Partially paid \u00b7 ${moneyIn.balance || ''} due`
        : `${moneyIn.total} unpaid`,
      showBalance: moneyIn.showBalance,
      dueRowValue: moneyIn.showBalance ? moneyIn.balance : '$0.00',
    },
    /* Products bought alongside a service are handed over at the till — nothing to fulfil or print. */
    groups: withOverflow(groups, steps).map((g) =>
      services.length && g.channel === 'takeNow'
        ? { ...g, actions: [], barActions: [], overflow: [], hasMore: false }
        : g,
    ),
    activityDays: activityDays(activity),
    customer: sale.customer,
    soldBy: sale.soldBy,
  }
}

export type OrderView = ReturnType<typeof buildOrderView>
