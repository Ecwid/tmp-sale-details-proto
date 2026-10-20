import { useLayoutEffect, useRef, useState } from 'react'
import {
  Button,
  Checkbox,
  IconButton,
  Link,
  Menu,
  MenuItem,
  MenuList,
  MenuSeparator,
} from '@lightspeed/unified-components-backoffice-theme/react'
import { SERVICE_TONE, type Sale } from '../data/sales'
import {
  buildOrderView,
  type ActivityDay,
  type OrderView,
  type StepMap,
  type ViewGroup,
} from '../lib/orderDetails'
import { AddTrackingDialog, type TrackingEdit } from '../components/AddTrackingDialog'
import { Avatar } from '../components/Avatar'
import { CustomerDialog } from '../components/CustomerDialog'
import { EditSaleDialog, type SaleEdit } from '../components/EditSaleDialog'
import { MaterialIcon } from '../components/MaterialIcon'
import { ProductLink } from '../components/ProductDialog'
import { TonePill } from '../components/TonePill'

interface OrderDetailsProps {
  sale: Sale
  steps: StepMap
  atFirst: boolean
  atLast: boolean
  prevLabel: string
  nextLabel: string
  onPrev: () => void
  onNext: () => void
  onBack: () => void
  onAction: (stepKey: number | null, label: string) => void
  onCompleteService: () => void
  onEditSale: (edit: SaleEdit) => void
  onSplitGroup: (stepKey: number, picked: number[]) => void
  onSetTracking: (stepKey: number, edit: TrackingEdit) => void
}

export function OrderDetails(props: OrderDetailsProps) {
  const { sale, steps, onAction, onEditSale, onSplitGroup, onSetTracking } = props
  const v = buildOrderView(sale, steps)
  const [moneyKey, setMoneyKey] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)

  return (
    <>
      <div className="od-header">
        <div className="od-header__inner">
          <div className="od-header__left">
            <IconButton appearance="secondary" ariaLabel="Back to sales history" onClick={props.onBack}>
              <MaterialIcon name="arrow_back" size={22} />
            </IconButton>
            <h1>{v.docTitle}</h1>
            <div className="od-chips">
              <TonePill label={v.payChip.label} tone={v.payChip.tone} />
              {v.serviceChip && (
                <TonePill label={v.serviceChip.label} tone={v.serviceChip.tone} />
              )}
              {v.showFulfilChip && (
                <TonePill label={v.fulfilChip.label} tone={v.fulfilChip.tone} />
              )}
            </div>
          </div>

          <div className="od-header__right">
            {v.hasMenu && (
              <Menu
                placement="bottom-start"
                onSelect={({ value }) => onAction(null, value)}
                triggerSlot={
                  <IconButton appearance="secondary" ariaLabel="More actions">
                    <MaterialIcon name="more_horiz" size={22} />
                  </IconButton>
                }
              >
                <MenuList>
                  {v.overflowMenu.map((mi) => (
                    <div key={mi.label}>
                      {mi.divider && <MenuSeparator />}
                      <MenuItem
                        value={mi.label}
                        label={mi.label}
                        prefixSlot={<MaterialIcon name={mi.icon} />}
                        customClasses={mi.danger ? { root: 'text-no-default' } : undefined}
                      />
                    </div>
                  ))}
                </MenuList>
              </Menu>
            )}

            {v.barSecondary.map((sa) => (
              <Button
                key={sa.label}
                appearance="secondary"
                prefixSlot={<MaterialIcon name={sa.icon} />}
                onClick={() => (sa.label === 'Edit' ? setEditing(true) : onAction(null, sa.label))}
              >
                {sa.label}
              </Button>
            ))}

            <span className="w-1.5" />

            <IconButton
              appearance="secondary"
              ariaLabel={props.prevLabel}
              disabled={props.atFirst}
              onClick={props.onPrev}
            >
              <MaterialIcon name="keyboard_arrow_up" size={22} />
            </IconButton>
            <IconButton
              appearance="secondary"
              ariaLabel={props.nextLabel}
              disabled={props.atLast}
              onClick={props.onNext}
            >
              <MaterialIcon name="keyboard_arrow_down" size={22} />
            </IconButton>
          </div>
        </div>
      </div>

      <div className="od-body">
        <div className="od-body__grid">
          <div className="od-main">
            {v.money.showDueNotice && (
              <div className="od-card od-due">
                <div
                  className="od-due__head"
                  style={{ color: 'var(--ls-color-fg-warning-default)' }}
                >
                  {v.money.dueHead}
                </div>
                <Button
                  size="small"
                  prefixSlot={<MaterialIcon name="redo" />}
                  onClick={() => onAction(null, 'Continue sale')}
                >
                  Continue sale
                </Button>
              </div>
            )}

            {v.showServices && <ServicesCard view={v} onComplete={props.onCompleteService} />}

            {v.hasItems && (
              <section className="flex flex-col gap-6">
                {v.groups.map((g) => (
                  <GroupCard
                    key={g.stepKey}
                    group={g}
                    moneyKey={moneyKey}
                    onMoney={(k) => setMoneyKey(moneyKey === k ? null : k)}
                    onAction={onAction}
                    onSplit={onSplitGroup}
                    onTrack={onSetTracking}
                  />
                ))}
              </section>
            )}

            {v.hasReturns && <ReturnsCard view={v} />}
            <TotalsCard view={v} />
            <ActivityCard days={v.activityDays} />
          </div>

          <aside className="od-aside">
            <Sidebar view={v} />
          </aside>
        </div>
      </div>

      <EditSaleDialog
        sale={sale}
        open={editing}
        onOpenChange={setEditing}
        onSave={onEditSale}
      />
    </>
  )
}

/* ------------------------------------------------------------------ */

interface GroupCardProps {
  group: ViewGroup
  moneyKey: string | null
  onMoney: (key: string) => void
  onAction: (stepKey: number, label: string) => void
  onSplit: (stepKey: number, picked: number[]) => void
  onTrack: (stepKey: number, edit: TrackingEdit) => void
}

const SPLIT = 'Split fulfillment'

/**
 * True when the group header has run out of room for its full action row.
 *
 * The full width is only ever sampled while expanded, so collapsing — which
 * shrinks the row and would otherwise look like "it fits again" — cannot
 * oscillate. Widening past the remembered full width expands it back.
 */
function useCrowdedHeader(headRef: React.RefObject<HTMLDivElement | null>, enabled: boolean) {
  const [crowded, setCrowded] = useState(false)
  /* Icon glyphs render as their literal name until the icon font loads, which
     would measure the buttons far too wide. Wait for it before sampling. */
  const [fontsReady, setFontsReady] = useState(false)
  const fullWidth = useRef(0)

  useLayoutEffect(() => {
    if (!document.fonts) return setFontsReady(true)
    let live = true
    document.fonts.ready.then(() => live && setFontsReady(true))
    return () => {
      live = false
    }
  }, [])

  useLayoutEffect(() => {
    const head = headRef.current
    if (!head || !enabled || !fontsReady) return

    const measure = () => {
      const title = head.querySelector<HTMLElement>('.od-group__title-wrap')
      const actions = head.querySelector<HTMLElement>('.od-group__actions')
      if (!title || !actions) return
      if (!crowded) fullWidth.current = actions.scrollWidth
      const gap = parseFloat(getComputedStyle(head).columnGap) || 0
      setCrowded(fullWidth.current > head.clientWidth - title.offsetWidth - gap)
    }

    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(head)
    return () => observer.disconnect()
  }, [headRef, enabled, fontsReady, crowded])

  return crowded
}

function GroupCard({ group: g, moneyKey, onMoney, onAction, onSplit, onTrack }: GroupCardProps) {
  const [splitting, setSplitting] = useState(false)
  const [picked, setPicked] = useState<number[]>([])
  const headRef = useRef<HTMLDivElement>(null)
  const [tracking, setTracking] = useState(false)

  /* Shipped parcels are where a tracking number gets attached. */
  const canTrack = g.done && g.channel === 'delivery' && !!g.shipment

  /* The lead action always stays on the bar; trailing ones fold into the menu. */
  const crowded = useCrowdedHeader(headRef, !splitting && g.barActions.length > 1)
  const collapse = crowded && !splitting && g.barActions.length > 1
  const barActions = collapse ? g.barActions.slice(0, -1) : g.barActions
  const collapsed = collapse ? g.barActions.slice(-1) : []
  const showMenu = g.hasMore || g.canSplit || collapsed.length > 0

  const total = g.items.length
  const allPicked = picked.length === total
  /* A split needs items on both sides, so all-or-nothing cannot be confirmed. */
  const canConfirm = picked.length > 0 && !allPicked

  function startSplit() {
    setPicked([])
    setSplitting(true)
  }

  function toggle(index: number) {
    setPicked((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index],
    )
  }

  return (
    <div className="od-group">
      <div className="od-group__head" ref={headRef}>
        <div className="od-group__title-wrap">
          <div className="od-group__title-row">
            <span className="od-group__title">{g.title}</span>
            {g.chip.visible && (
              <TonePill label={g.chip.label} tone={g.chip.tone} icon={g.chip.icon} />
            )}
          </div>
          {g.hasOutlet && <span className="od-group__outlet">{g.outlet}</span>}
        </div>

        <div className="od-group__actions">
          {splitting ? (
            <>
              <Button size="small" appearance="secondary" onClick={() => setSplitting(false)}>
                Cancel
              </Button>
              <Button
                size="small"
                disabled={!canConfirm}
                prefixSlot={<MaterialIcon name="call_split" />}
                onClick={() => {
                  onSplit(g.stepKey, picked)
                  setSplitting(false)
                }}
              >
                {SPLIT}
              </Button>
            </>
          ) : (
            <>
              {showMenu && (
                <Menu
                  placement="bottom-start"
                  onSelect={({ value }) =>
                    value === SPLIT ? startSplit() : onAction(g.stepKey, value)
                  }
                  triggerSlot={
                    <IconButton appearance="secondary" size="small" ariaLabel="More actions">
                      <MaterialIcon name="more_horiz" />
                    </IconButton>
                  }
                >
                  <MenuList>
                    {collapsed.concat(g.overflow).map((a) => (
                      <MenuItem
                        key={a.label}
                        value={a.label}
                        label={a.label}
                        prefixSlot={<MaterialIcon name={a.icon} />}
                      />
                    ))}
                    {g.canSplit && (
                      <MenuItem
                        value={SPLIT}
                        label={SPLIT}
                        prefixSlot={<MaterialIcon name="call_split" />}
                      />
                    )}
                  </MenuList>
                </Menu>
              )}
              {canTrack && (
                <div style={{ order: 20 }}>
                  <Button
                    size="small"
                    prefixSlot={<MaterialIcon name={g.tracking ? 'edit' : 'barcode_reader'} />}
                    onClick={() => setTracking(true)}
                  >
                    {g.tracking ? 'Edit tracking number' : 'Add tracking number'}
                  </Button>
                </div>
              )}
              {barActions.map((a) => (
                <div key={a.label} style={{ order: a.order }}>
                  <Button
                    size="small"
                    appearance={a.lead ? 'primary' : 'secondary'}
                    prefixSlot={<MaterialIcon name={a.icon} />}
                    onClick={() => onAction(a.stepKey, a.label)}
                  >
                    {a.label}
                  </Button>
                </div>
              ))}
            </>
          )}
        </div>
      </div>

      {g.hasTracking && (
        <div className="od-tracking">
          <div>
            <span>Carrier</span>
            <span>{g.carrier}</span>
          </div>
          <div>
            <span>Tracking number</span>
            <Link href="#" size="inherit" appearance="secondary" customClasses={{ root: 'tnum' }}>
              {g.tracking}
            </Link>
          </div>
        </div>
      )}
      <div className={`od-itemtable${splitting ? ' od-itemtable--split' : ''}`}>
        {splitting ? (
          <div className="od-split-bar">
            <Checkbox
              checked={allPicked}
              indeterminate={picked.length > 0 && !allPicked}
              ariaLabel="Select every item in this fulfillment"
              onChange={(checked) => setPicked(checked ? g.items.map((_, i) => i) : [])}
            />
            <span>
              {picked.length} item{picked.length === 1 ? '' : 's'} selected
            </span>
          </div>
        ) : (
          <div className="od-itemtable-head">
            <span>Item</span>
            <span>Unit price</span>
            <span>Amount</span>
          </div>
        )}

        {g.items.map((it, index) => (
          <div key={it.moneyKey} className="od-item-row">
            {splitting && (
              <span className="od-item-check">
                <Checkbox
                  checked={picked.includes(index)}
                  ariaLabel={`Include ${it.name} in the new fulfillment`}
                  onChange={() => toggle(index)}
                />
              </span>
            )}
            <div className="od-item-info">
              <span className="od-item-thumb">
                <MaterialIcon name="inventory_2" size={20} />
              </span>
              <div className="od-item-text">
                <ProductLink item={it} size="inherit">
                  {it.name}
                </ProductLink>
                <span className="od-item-meta">{it.meta}</span>
              </div>
            </div>

            <div className="od-item-price-cell">
              <button
                className="od-item-price-btn"
                title="Show the money breakdown"
                onClick={() => onMoney(it.moneyKey)}
              >
                {it.price}
              </button>
              {moneyKey === it.moneyKey && (
                <div className="od-money-pop">
                  {it.moneyRows.map((r) => (
                    <div key={r.label} className="od-money-pop-row">
                      <span className="text-neutral-soft">{r.label}</span>
                      <span>{r.value}</span>
                    </div>
                  ))}
                  <div className="od-money-pop-total">
                    <span>With tax</span>
                    <span>{it.moneyWithTax}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="od-item-qty-cell">
              <span className="qty">{it.qty}</span>
              {it.note && <span className="note">{it.note}</span>}
            </div>

            {it.itemNote && (
              <div className="od-item-note">
                <div className="od-item-note-inner">
                  <MaterialIcon name="sticky_note_2" size={15} className="mt-0.5 text-neutral-soft" />
                  <span>{it.itemNote}</span>
                </div>
              </div>
            )}

          </div>
        ))}

        {!splitting && (
          <div className="od-itemtable-foot">
            <span>Total</span>
            <span />
            <span>{g.totalQty}</span>
          </div>
        )}
      </div>

      {canTrack && (
        <AddTrackingDialog
          shipment={g.shipment}
          tracking={g.tracking}
          carrier={g.carrier}
          open={tracking}
          onOpenChange={setTracking}
          onSave={(edit) => onTrack(g.stepKey, edit)}
        />
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
function ServicesCard({ view: v, onComplete }: { view: OrderView; onComplete: () => void }) {
  return (
    <>
      {v.serviceGroups.map((sg) => (
        <section key={sg.state} className="od-group">
          <div className="od-group__head">
            <div className="od-group__title-wrap">
              <div className="od-group__title-row">
                <span className="od-group__title">Services</span>
                <TonePill label={sg.state} tone={SERVICE_TONE[sg.state]} />
              </div>
              <span className="od-group__outlet">{sg.outlets.join(', ')}</span>
            </div>
            {sg.state !== 'Completed' && (
              <div className="od-group__actions">
                <Button size="small" prefixSlot={<MaterialIcon name="check" />} onClick={onComplete}>
                  Mark as completed
                </Button>
              </div>
            )}
          </div>

          <div className="od-itemtable od-services">
            <div className="od-itemtable-head">
              <span>Date scheduled</span>
              <span />
            </div>
            {sg.services.map((sv) => (
              <div key={sv.name} className="od-item-row">
                <div className="od-item-info">
                  <span className="typography-body-sm tnum">{sv.scheduled}</span>
                </div>
                <span className="od-service-cell od-service-cell--action">
                  <Link href="#" size="small">
                    View service
                  </Link>
                </span>
              </div>
            ))}
          </div>
        </section>
      ))}
    </>
  )
}

function ReturnsCard({ view: v }: { view: OrderView }) {
  return (
    <>
      {v.returns.map((r) => (
        <section key={r.title} className="od-group">
          <div className="od-group__head">
            <div className="od-group__title-wrap">
              <div className="od-group__title-row">
                <span className="od-group__title">{r.title}</span>
                <TonePill label={r.chip.label} tone={r.chip.tone} icon="assignment_return" />
              </div>
              {r.when && <span className="od-group__outlet">{r.when}</span>}
            </div>
          </div>

          <div className="od-tracking">
            <div>
              <span>Reason</span>
              <span>{r.reason}</span>
            </div>
            <div>
              <span>Refunded to</span>
              <span>{r.refundedTo}</span>
            </div>
          </div>

          <div className="od-itemtable">
            <div className="od-itemtable-head">
              <span>Item</span>
              <span>Refund</span>
              <span>Amount</span>
            </div>
            {r.items.map((it) => (
              <div key={it.name} className="od-item-row">
                <div className="od-item-info">
                  <span className="od-item-thumb">
                    <MaterialIcon name="inventory_2" size={20} />
                  </span>
                  <div className="od-item-text">
                    <ProductLink item={{ ...it, meta: '', price: r.refundTotal }} size="inherit">
                      {it.name}
                    </ProductLink>
                  </div>
                </div>
                <div className="od-item-price-cell">
                  <span className="od-item-refund">{r.refundTotal}</span>
                </div>
                <div className="od-item-qty-cell">
                  <span className="qty">{it.qty}</span>
                </div>
              </div>
            ))}
            <div className="od-itemtable-foot">
              <span>Total</span>
              <span />
              <span>{r.totalQty}</span>
            </div>
          </div>
        </section>
      ))}
    </>
  )
}

function TotalsCard({ view: v }: { view: OrderView }) {
  const m = v.money
  const lines = [
    ['Subtotal', m.subtotal],
    ...(m.showDiscounts ? [['Discounts', m.discounts]] : []),
    [m.taxLabel, m.tax],
    ...(m.showExtra ? [[m.extraLabel, m.extra]] : []),
  ]
  return (
    <section className="od-card od-totals">
      <div className="od-totals__group">
        {lines.map(([label, value]) => (
          <div key={label} className="od-totals__row">
            <span>{label}</span>
            <span className="tnum">{value}</span>
          </div>
        ))}
      </div>
      <div className="od-totals__row od-totals__row--strong od-totals__sep">
        <span className="uppercase">{m.totalLabel}</span>
        <span className="tnum">{m.total}</span>
      </div>
      {m.paymentLines.length > 0 && (
        <div className="od-totals__group od-totals__sep">
          {m.paymentLines.map((p) => (
            <div key={p.method + p.when} className="od-totals__row od-totals__row--pay">
              <span>{p.method}</span>
              <span>{p.when}</span>
              <span className="tnum">{p.amount}</span>
            </div>
          ))}
        </div>
      )}
      <div className="od-totals__row od-totals__sep">
        <span className="font-bold">{m.dueLabel}</span>
        <span className="tnum">{m.dueRowValue}</span>
      </div>
    </section>
  )
}

function ActivityCard({ days }: { days: ActivityDay[] }) {
  return (
    <section className="od-card">
      <h2 className="od-history-title">History</h2>
      {days.map((day) => (
        <div key={day.date} className="od-day-row">
          <div className="od-day-rail">
            <span className="od-day-dot" />
            {day.hasNext && <span className="od-day-line" />}
          </div>
          <div className="od-day-body">
            <span className="od-day-date">{day.date}</span>
            {day.events.map((ev, i) => (
              <div key={`${ev.action}-${i}`} className="od-event">
                <Avatar initials={ev.initials} color={ev.avatarBg} size={26} />
                <span className="od-event__action">
                  {ev.actor || 'Someone'} {ev.action}
                </span>
                <span className="od-event__time">{ev.time}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </section>
  )
}

function Sidebar({ view: v }: { view: OrderView }) {
  const [customerOpen, setCustomerOpen] = useState(false)
  const ADDRESS = '2140 Folsom St, San Francisco 94110 CA, US'
  return (
    <>
      <div className="od-card flex flex-col gap-2.5">
        <h2>Notes</h2>
        <span className="od-side-body">{v.noteBody}</span>
      </div>

      <div className="od-card flex flex-col gap-2.5">
        <h2>Customer</h2>
        <div className="od-side-row">
          <div className="od-side-name">
            <Link
              href="#"
              appearance="secondary"
              onClick={(e: MouseEvent) => {
                e.preventDefault()
                setCustomerOpen(true)
              }}
            >
              {v.customer.name}
            </Link>
            <span className="od-side-sub">{v.customer.contact}</span>
          </div>
          <Avatar initials={v.customer.initials} color={v.customer.color} size={40} />
        </div>
        {v.showAddresses && (
          <>
            <span className="od-side-divider" />
            <span className="od-side-label">Shipping address</span>
            <span className="od-side-body">{ADDRESS}</span>
          </>
        )}
        <span className="od-side-divider" />
        <span className="od-side-label">Billing address</span>
        <span className="od-side-body">{ADDRESS}</span>
      </div>
      <CustomerDialog customer={customerOpen ? v.customer : null} onOpenChange={setCustomerOpen} />

      {v.showFulfilNote && (
        <div className="od-card flex flex-col gap-2.5">
          <h2>Fulfillment notes</h2>
          <span className="od-side-body">{v.fulfilNote}</span>
        </div>
      )}

      <div className="od-card flex flex-col gap-2.5">
        <h2>Assigned user</h2>
        <div className="od-side-row">
          <div className="od-side-name">
            <span className="name">Dana Reyes</span>
            <span className="od-side-sub">dana@support.com</span>
          </div>
          <Avatar initials="DR" color="#A83AB5" size={40} />
        </div>
        <span className="od-side-divider" />
        <span className="od-side-label">Sold by</span>
        <div className="od-side-row">
          <div className="od-side-name">
            <span className="name">{v.soldBy.name}</span>
            {v.soldBy.location && <span className="od-side-sub">{v.soldBy.location}</span>}
          </div>
          <Avatar initials={v.soldBy.initials} color={v.soldBy.color} size={40} />
        </div>
      </div>
    </>
  )
}
