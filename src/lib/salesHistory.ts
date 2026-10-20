import {
  actionIcon,
  groupsInOrder,
  hasOutstandingFulfillment,
  servicePending,
  type Group,
  type LineItem,
  type Sale,
  type Tone,
} from '../data/sales'

const MONTHS = 'Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec'

/** saleId -> the furthest fulfillment step recorded in this session. */
export type StepMap = Record<string, 'done' | 'packed' | undefined>

/**
 * The design strips SKUs and internal ids from item captions — recognition cues
 * survive (e.g. "Was: $350.00"), inventory codes don't.
 */
export function cleanMeta(meta: string | undefined): string {
  return String(meta || '')
    .split(' · ')
    .filter((p) => {
      const t = p.trim()
      if (/^(SKU\s+)?[A-Z]{3}-[A-Z0-9-]+$/.test(t)) return false
      if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(t)) return false
      return true
    })
    .join(' · ')
}

/** A trailing date reads as a chip of its own, split off the group heading. */
export function splitGroupHead(label: string): { head: string; when: string } {
  const m = String(label).match(new RegExp('^(.*?)\\s((?:' + MONTHS + ')\\s\\d{1,2})$'))
  return m ? { head: m[1], when: m[2] } : { head: label, when: '' }
}

export interface Fulfilment {
  type: string
  label: string
  tone: Tone
}

export function deriveFulfil(s: Sale, steps: StepMap): Fulfilment | null {
  const parts = String(s.status.label || '')
    .replace(/\n/g, ' ')
    .split(',')
    .map((p) => p.trim())
  const fulfilChans = (s.groups || [])
    .map((g) => g.channel)
    .filter((c) => c === 'delivery' || c === 'pickup' || c === 'takeNow')

  if ((s.services || []).length)
    return servicePending(s)
      ? { type: 'Service', label: 'Pending', tone: 'warning' }
      : { type: 'Service', label: 'Completed', tone: 'success' }
  if (!fulfilChans.length) return null

  const channel =
    parts.length > 1
      ? parts[0]
      : (() => {
          const chans = (s.groups || []).map((g) => g.channel)
          if (chans.includes('pickup')) return 'Pickup'
          if (chans.includes('takeNow') && !chans.includes('delivery')) return 'In store'
          return 'Delivery'
        })()

  const STATE_WORD: Record<string, string> = {
    unfulfilled: 'Unfulfilled',
    'partly fulfilled': 'Partially fulfilled',
  }
  const stepped = steps[s.id]
  const stateWord =
    stepped === 'done'
      ? 'Fulfilled'
      : parts.length > 1
        ? STATE_WORD[parts[1].toLowerCase()] || parts[1]
        : 'Fulfilled'
  return {
    type: channel,
    label: stateWord,
    tone: stateWord === 'Fulfilled' ? 'success' : 'warning',
  }
}

export interface MenuEntry {
  label: string
  icon: string
  danger: boolean
}

export interface SaleActions {
  menuItems: MenuEntry[]
  rowPrimary: { label: string; icon: string }
  railActions: MenuEntry[]
}

/**
 * Ports the design's single ordering rule ("one order for every row") into plain
 * data: the same list drives the row menu, the row's primary button and the rail.
 */
export function computeActions(s: Sale, steps: StepMap): SaleActions {
  const owesMoney = !!s.pay && s.pay.label !== 'Paid'
  const canContinue =
    (owesMoney && s.actions.primary.label !== 'Continue') ||
    (s.payState === 'paid' &&
      ((steps[s.id] !== 'done' && hasOutstandingFulfillment(s.groups)) || servicePending(s)))

  const chans = (s.groups || []).map((g) => g.channel)
  const handover =
    chans.includes('pickup') && !chans.includes('delivery')
      ? { label: 'Record customer pickup', icon: 'how_to_reg' }
      : { label: 'Mark as shipped', icon: 'local_shipping' }
  const fulfilSteps = [handover]

  const steppedDone = steps[s.id] === 'done'
  const canFulfil = !steppedDone && (s.groups || []).some((g) => !g.done && g.channel !== 'return')

  const PRIMARY_TWIN: Record<string, string> = {
    Fulfill: 'Fulfill sale',
    Continue: 'Continue sale',
  }
  const lead = PRIMARY_TWIN[s.actions.primary.label] || null

  const entries: MenuEntry[] = []
  if (servicePending(s)) entries.push({ label: 'Mark as completed', icon: 'check', danger: false })
  const rowAction = lead || s.actions.primary.label
  if (rowAction && rowAction !== 'Fulfill sale') {
    entries.push({
      label: rowAction,
      icon: s.actions.primary.icon || actionIcon(rowAction),
      danger: false,
    })
  }
  if (canFulfil) fulfilSteps.forEach((a) => entries.push({ ...a, danger: false }))
  if (canContinue) entries.push({ label: 'Continue sale', icon: 'redo', danger: false })
  ;(s.actions.secondary || [])
    .filter((a) => !/^(fulfill|return|void|discard|edit|split)/i.test(a.label || ''))
    .forEach((a) => entries.push({ label: a.label, icon: actionIcon(a.label), danger: false }))
  ;(s.actions.more || [])
    .filter((m) => !/^(fulfill|return|void|discard|edit|split)/i.test(m.label || ''))
    .forEach((m) => entries.push({ label: m.label, icon: m.icon || 'bolt', danger: !!m.danger }))

  const ORDER = [
    'Mark as completed',
    'Continue return',
    'Mark as shipped',
    'Record customer pickup',
    'Mark as packed',
    'Continue sale',
    'Print or email receipt',
  ]
  const rank = (label: string) => {
    if (/^(void|discard)/i.test(label)) return ORDER.length + 1
    const i = ORDER.indexOf(label)
    return i < 0 ? ORDER.length : i
  }
  const seen = new Set<string>()
  const menuItems = entries
    .filter((e) => {
      if (seen.has(e.label)) return false
      seen.add(e.label)
      return true
    })
    .sort((a, b) => rank(a.label) - rank(b.label))

  const rowPrimary = (() => {
    if (s.pay && s.pay.label === 'Unpaid') {
      const cont = menuItems.find((mi) => /^continue/i.test(mi.label))
      if (cont) return { label: cont.label, icon: cont.icon }
    }
    const NEXT = /^(mark as completed|mark as shipped|record customer pickup)$/i
    const sorted = menuItems
      .slice()
      .sort((a, b) => (NEXT.test(a.label) ? -1 : 0) - (NEXT.test(b.label) ? -1 : 0))
    return sorted[0]
      ? { label: sorted[0].label, icon: sorted[0].icon }
      : { label: s.actions.primary.label, icon: s.actions.primary.icon || 'bolt' }
  })()

  const railActions = menuItems
    .filter((mi) => mi.label !== rowPrimary.label)
    .slice()
    .sort((a, b) => {
      const NEXT =
        s.pay && s.pay.label === 'Unpaid'
          ? /^continue/i
          : /^(mark as shipped|record customer pickup)$/i
      return (NEXT.test(a.label) ? -1 : 0) - (NEXT.test(b.label) ? -1 : 0)
    })

  return {
    menuItems: menuItems.filter((mi) => mi.label !== rowPrimary.label),
    rowPrimary,
    railActions,
  }
}

export interface RowGroup extends Group {
  head: string
  when: string
  key: string
  serviceLabel: string | null
  items: LineItem[]
}

export interface RowModel {
  sale: Sale
  menuItems: MenuEntry[]
  rowPrimary: { label: string; icon: string }
  railActions: MenuEntry[]
  groups: RowGroup[]
  fulfil: Fulfilment | null
  payChip: { label: string; tone: Tone } | null
}

export function computeRow(s: Sale, steps: StepMap): RowModel {
  const { menuItems, rowPrimary, railActions } = computeActions(s, steps)
  const rows = groupsInOrder(s.groups).map((g, gi) => {
    const { head, when } = splitGroupHead(g.label)
    return {
      ...g,
      head,
      when,
      serviceLabel: (s.services || []).length
        ? g.serviceIncluded
          ? servicePending(s)
            ? 'Service pending'
            : 'Service completed'
          : 'No service'
        : null,
      items: g.items.map((it) => ({ ...it, meta: cleanMeta(it.meta) })),
      key: `${s.id}-${gi}`,
    }
  })
  /* Outlets aren't shown here, so open groups of the same kind read as one list. */
  const groups: RowGroup[] = []
  rows.forEach((g) => {
    const twin = !g.done && groups.find((x) => !x.done && x.channel === g.channel && x.head === g.head)
    if (twin) twin.items = [...twin.items, ...g.items]
    else groups.push(g)
  })
  const fulfil = deriveFulfil(s, steps)
  const payChip = s.pay && s.pay.label !== 'Paid' ? { label: s.pay.label, tone: s.pay.tone } : null
  return { sale: s, menuItems, rowPrimary, railActions, groups, fulfil, payChip }
}

/** "Mark as shipped" / "Record customer pickup" close a sale; "Mark as packed" advances it. */
export function stepForLabel(label: string): 'done' | 'packed' | null {
  const l = String(label || '').toLowerCase()
  if (/^(mark as shipped|record customer pickup)$/.test(l)) return 'done'
  if (/^mark as packed$/.test(l)) return 'packed'
  return null
}
