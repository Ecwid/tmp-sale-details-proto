import { useMemo, useState } from 'react'
import {
  Button,
  IconButton,
  Input,
  Link,
  PageHeader,
  Tab,
  TabBar,
} from '@lightspeed/unified-components-backoffice-theme/react'
import { salesInListOrder, withServicesCompleted, type Person, type Sale } from '../data/sales'
import {
  computeRow,
  type MenuEntry,
  type RowGroup,
  type RowModel,
  type StepMap,
} from '../lib/salesHistory'
import { notify } from '../components/AppShell'
import { Avatar } from '../components/Avatar'
import { CustomerDialog } from '../components/CustomerDialog'
import { MaterialIcon } from '../components/MaterialIcon'
import { ProductLink } from '../components/ProductDialog'
import { TonePill } from '../components/TonePill'

const TABS = ['All', 'Process return', 'Continue sale']
const FILTERS = ['Customer', 'Date', 'Outlet', 'Sale status']

interface SalesHistoryProps {
  steps: StepMap
  servicesDone: Record<string, true>
  onStep: (sale: Sale, label: string) => void
  onOpenSale: (sale: Sale) => void
}

export function SalesHistory({ steps, servicesDone, onStep, onOpenSale }: SalesHistoryProps) {
  // `s89` matches the design's default expanded row.
  const [open, setOpen] = useState<string | null>('s89')
  const [track, setTrack] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState(TABS[0])
  const [customer, setCustomer] = useState<Person | null>(null)

  const filtered = useMemo(() => {
    const sales = salesInListOrder()
    const q = search.trim().toLowerCase()
    if (!q) return sales
    return sales.filter(
      (s) =>
        s.receipt.toLowerCase().includes(q) ||
        s.customer.name.toLowerCase().includes(q) ||
        s.soldBy.name.toLowerCase().includes(q) ||
        (s.note || '').toLowerCase().includes(q),
    )
  }, [search])

  function exportCsv() {
    const header = ['Sale', 'Customer', 'Sold by', 'Note', 'Sale total', 'Fulfillment']
    const rows = filtered.map((s) => {
      const r = computeRow(s, steps)
      return [s.receipt, s.customer.name, s.soldBy.name, s.note || '', s.total, r.fulfil?.label ?? '']
    })
    const csv = [header, ...rows]
      .map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""').replace(/\n/g, ' ')}"`).join(','),
      )
      .join('\r\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = url
    a.download = 'all-sales.csv'
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  return (
    <>
      <PageHeader
        titleSlot="All sales"
        descriptionSlot={
          <>
            View, edit and manage your sales all in one place. <Link href="#">Need help?</Link>
          </>
        }
      />

      <div className="sh-tabs">
        <TabBar value={tab} onChange={setTab}>
          {TABS.map((t) => (
            <Tab key={t} value={t}>
              {t}
            </Tab>
          ))}
        </TabBar>
      </div>

      <div className="sh-body">
        <div className="sh-body__shell">
          <div className="sh-filterrow">
            <Input
              value={search}
              placeholder="Search by receipt, customer, user or note"
              prefixSlot={<MaterialIcon name="search" size={20} />}
              onChange={setSearch}
            />
            <div className="sh-filters">
              {FILTERS.map((f) => (
                <Button
                  key={f}
                  appearance="secondary"
                  size="small"
                  suffixSlot={<MaterialIcon name="expand_more" />}
                >
                  {f}
                </Button>
              ))}
              <Button
                appearance="secondary"
                size="small"
                prefixSlot={<MaterialIcon name="filter_list" size={17} />}
              >
                Filters
              </Button>
            </div>
          </div>

          <div className="sh-listmeta">
            <span className="sh-listmeta__count">
              Displaying {filtered.length} sale{filtered.length === 1 ? '' : 's'}
            </span>
            <Button
              appearance="ghost"
              size="small"
              prefixSlot={<MaterialIcon name="download" />}
              onClick={exportCsv}
            >
              Export list
            </Button>
          </div>

          <div className="sh-tablewrap">
            <div className="sh-table">
              <div className="sh-thead">
                <span />
                <span>Sale</span>
                <span>Customer</span>
                <span>Sold by</span>
                <span>Note</span>
                <span>Sale total</span>
                <span>Fulfillment</span>
                <span />
              </div>
              {filtered.length === 0 ? (
                <div className="typography-body-sm p-10 text-center text-neutral-soft">
                  No sales match “{search}.”
                </div>
              ) : (
                filtered.map((s) => (
                  <Row
                    key={s.id}
                    model={computeRow(servicesDone[s.id] ? withServicesCompleted(s) : s, steps)}
                    expanded={open === s.id}
                    track={track}
                    onToggle={() => {
                      setOpen(open === s.id ? null : s.id)
                      setTrack(null)
                    }}
                    onTrack={(key) => setTrack(track === key ? null : key)}
                    onAction={(label) => onStep(s, label)}
                    onOpenSale={() => onOpenSale(s)}
                    onOpenCustomer={() => setCustomer(s.customer)}
                  />
                ))
              )}
            </div>
          </div>

          <div className="sh-footer">
            <Button appearance="secondary" size="small" disabled>
              Load more sales
            </Button>
          </div>
        </div>
      </div>
      <CustomerDialog customer={customer} onOpenChange={(o) => !o && setCustomer(null)} />
    </>
  )
}

/* ------------------------------------------------------------------ */

interface RowProps {
  model: RowModel
  expanded: boolean
  track: string | null
  onToggle: () => void
  onTrack: (key: string) => void
  onAction: (label: string) => void
  onOpenSale: () => void
  onOpenCustomer: () => void
}

function Row({ model, expanded, track, onToggle, onTrack, onAction, onOpenSale, onOpenCustomer }: RowProps) {
  const { sale, rowPrimary, fulfil, payChip } = model

  return (
    <div className="sh-row">
      <div
        className="sh-row__accent"
        style={{ background: expanded ? 'var(--ls-color-border-go-soft)' : 'transparent' }}
      />
      <div className={`sh-row__body${expanded ? ' is-expanded' : ''}`}>
        <div className="sh-rowmain">
          <button className="sh-rowopen" onClick={onToggle} aria-label="Toggle row" />

          <div className="sh-chevron">
            <IconButton
              appearance="ghost"
              ariaLabel={expanded ? 'Collapse' : 'Expand for context'}
              onClick={onToggle}
            >
              <MaterialIcon name={expanded ? 'keyboard_arrow_down' : 'chevron_right'} size={22} />
            </IconButton>
          </div>

          <div className="sh-cell-sale">
            <button className="sh-linkish tnum" onClick={onOpenSale}>
              {sale.receipt}
            </button>
            <span className="sh-when">{sale.when}</span>
          </div>

          <div className="sh-person">
            <Avatar initials={sale.customer.initials} color={sale.customer.color} />
            <div className="sh-person__info">
              <button className="sh-linkish" onClick={onOpenCustomer}>
                {sale.customer.name}
              </button>
              <span className="sh-person__sub">{sale.customer.contact}</span>
            </div>
          </div>

          <div className="sh-person">
            <Avatar initials={sale.soldBy.initials} color={sale.soldBy.color} />
            <div className="sh-person__info">
              <span className="typography-body-sm truncate">{sale.soldBy.name}</span>
              <span className="sh-person__sub">{sale.soldBy.location}</span>
            </div>
          </div>

          <div className="sh-cell-note">{sale.note || '–'}</div>

          <div className="sh-cell-total">
            <span className="amt tnum">{sale.total}</span>
            {payChip && <TonePill label={payChip.label} tone={payChip.tone} />}
          </div>

          <div className="sh-cell-fulfil">
            <span className="type">{fulfil ? fulfil.type : '–'}</span>
            {fulfil && <TonePill label={fulfil.label} tone={fulfil.tone} />}
          </div>

          <div className="sh-rowactions">
            <IconButton
              appearance="ghost"
              ariaLabel={rowPrimary.label}
              onClick={() => onAction(rowPrimary.label)}
            >
              <MaterialIcon name={rowPrimary.icon} />
            </IconButton>
          </div>
        </div>

        {expanded && (
          <Detail
            model={model}
            track={track}
            onTrack={onTrack}
            onAction={onAction}
            onOpenSale={onOpenSale}
          />
        )}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */

interface DetailProps {
  model: RowModel
  track: string | null
  onTrack: (key: string) => void
  onAction: (label: string) => void
  onOpenSale: () => void
}

function Detail({ model, track, onTrack, onAction, onOpenSale }: DetailProps) {
  const { sale, groups, railActions, rowPrimary } = model
  const services = sale.services || []
  const isEmpty = groups.length === 0 && services.length === 0
  const m = sale.money

  return (
    <div className="sh-detail">
      <div className="sh-detail__grid">
        <div className="sh-groups">
          {groups.map((g) => (
            <GroupBlock
              key={g.key}
              group={g}
              open={track === g.key}
              onTrack={() => onTrack(g.key)}
            />
          ))}

          {isEmpty && (
            <div className="sh-empty">
              <MaterialIcon name="inventory_2" />
              This sale has no products.
            </div>
          )}
        </div>

        <div className="sh-note-money">
          <div className="sh-note">
            <span className="sh-note__label">Note</span>
            <span>{sale.note || '–'}</span>
          </div>

          <div className="sh-money">
            <div className="sh-money__line">
              <span>Subtotal</span>
              <span>{m.subtotal}</span>
            </div>
            {m.showDiscounts && (
              <div className="sh-money__line">
                <span>Discounts</span>
                <span>{m.discounts}</span>
              </div>
            )}
            <div className="sh-money__line">
              <span>{m.taxLabel}</span>
              <span>{m.tax}</span>
            </div>
            {m.showExtra && (
              <div className="sh-money__line">
                <span>{m.extraLabel}</span>
                <span>{m.extra}</span>
              </div>
            )}
            <div className="sh-money__total">
              <span>Sale total</span>
              <span>{m.total}</span>
            </div>
            {m.payments.map((p) => (
              <div key={p.method + p.when} className="sh-money__payment">
                <span>{p.method}</span>
                <span className="amt">{p.amount}</span>
                <span className="when">{p.when}</span>
              </div>
            ))}
            <div className="sh-money__balance">
              <span>Balance</span>
              <span>{m.showBalance ? m.balance : '$0.00'}</span>
            </div>
          </div>
        </div>

        <div className="sh-rail-actions">
          <Button
            block
            prefixSlot={rowPrimary.icon ? <MaterialIcon name={rowPrimary.icon} /> : undefined}
            onClick={() => onAction(rowPrimary.label)}
          >
            {rowPrimary.label}
          </Button>
          {railActions.map((a: MenuEntry) => (
            <Button
              key={a.label}
              block
              appearance={a.danger ? 'danger-secondary' : 'secondary'}
              onClick={() => onAction(a.label)}
            >
              {a.label}
            </Button>
          ))}
          <Button block appearance="secondary" onClick={onOpenSale}>
            Open sale details
          </Button>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */

/** Tracking number styled as a link; clicking copies it to the clipboard. */
function CopyTracking({ value }: { value: string }) {
  return (
    <Link
      href="#"
      size="inherit"
      appearance="secondary"
      customClasses={{ root: 'tnum' }}
      onClick={(e: MouseEvent) => {
        e.preventDefault()
        void navigator.clipboard?.writeText(value)
        notify('Copied')
      }}
    >
      {value}
    </Link>
  )
}

function GroupBlock({
  group,
}: {
  group: RowGroup
  open: boolean
  onTrack: () => void
}) {
  return (
    <div className="sh-group">
      <div className="sh-group__head">
        <div className="sh-group__title-row">
          <span className="sh-group__title">{group.head}</span>
          {group.tracking && (
            <>
              {group.carrier && (
                <>
                  <span className="sh-group__title" aria-hidden="true">·</span>
                  <span className="sh-group__title sh-group__title--plain">{group.carrier}</span>
                </>
              )}
              <span className="sh-group__title sh-group__title--plain">
                <CopyTracking value={group.tracking} />
              </span>
            </>
          )}
        </div>
        {group.serviceLabel && <span className="sh-group__service">{group.serviceLabel}</span>}
      </div>

      {group.items.map((it, i) => (
        <div key={`${it.name}-${i}`} className="sh-item">
          <span className="sh-item__qty">{it.qty}</span>
          <div className="sh-item__info">
            <ProductLink item={it}>{it.name}</ProductLink>
            <span className="sh-item__meta">{it.meta}</span>
          </div>
          <span className="sh-item__price">{it.price}</span>
        </div>
      ))}
    </div>
  )
}
