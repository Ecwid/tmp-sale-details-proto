import { useState, type ReactNode } from 'react'
import { Dialog, IconButton, Link, Tab, TabBar } from '@lightspeed/unified-components-backoffice-theme/react'
import type { LineItem } from '../data/sales'
import { MaterialIcon } from './MaterialIcon'

const TABS = ['Inventory', 'Pricing', 'History', 'Details']
const OUTLETS = ['Carlsbad', 'Encinitas', 'Solana Beach']
const COLUMNS: [string, string?][] = [
  ['Special order demand'],
  ['Available to sell'],
  ['Inbound inventory'],
  ['Items sold', 'Last 30 days'],
]

/** Unit retail price derived from the line total and quantity. */
function unitPrice(it: LineItem) {
  const total = parseFloat(it.price.replace(/[^\d.-]/g, ''))
  const qty = parseFloat(it.qty) || 1
  if (Number.isNaN(total)) return '–'
  return `$${(total / qty).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

interface ProductDialogProps {
  item: LineItem | null
  onOpenChange: (open: boolean) => void
}

export function ProductDialog({ item, onOpenChange }: ProductDialogProps) {
  const [tab, setTab] = useState(TABS[0])

  const stats = item
    ? [
        ['Brand', '–'],
        ['Supplier', '–'],
        ['Total available to sell', '–'],
        ['Retail price', unitPrice(item)],
      ]
    : []

  return (
    <Dialog
      open={!!item}
      size="large"
      closeControlAriaLabel="Close product"
      onChange={(o) => {
        if (!o) setTab(TABS[0])
        onOpenChange(o)
      }}
      customClasses={{ content: 'md:!w-full md:!max-w-[1040px]' }}
      closeControlSlot={
        <IconButton appearance="ghost" ariaLabel="Close product">
          <MaterialIcon name="close" size={22} />
        </IconButton>
      }
    >
      {item && (
        <div className="pd-wrap">
          <div className="pd-image">
            <MaterialIcon name="inventory_2" size={56} />
          </div>
          <div className="cd-body">
            <header className="cd-head">
              <h2 className="typography-heading-lg">{item.name}</h2>
              <span className="typography-body-sm">{item.meta}</span>
            </header>

            <div className="cd-balances pd-stats">
              {stats.map(([label, value]) => (
                <div key={label}>
                  <span className="typography-body-sm">{label}</span>
                  <span className="pd-stat tnum">{value}</span>
                </div>
              ))}
            </div>

            <TabBar value={tab} onChange={setTab}>
              {TABS.map((t) => (
                <Tab key={t} value={t}>
                  {t}
                </Tab>
              ))}
            </TabBar>

            {tab === 'Inventory' && (
              <table className="pd-table">
                <thead>
                  <tr>
                    <th>Outlet</th>
                    {COLUMNS.map(([h, sub]) => (
                      <th key={h}>
                        {h}
                        {sub && <span className="pd-sub">{sub}</span>}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {OUTLETS.map((o) => (
                    <tr key={o}>
                      <td>{o}</td>
                      {COLUMNS.map(([h]) => (
                        <td key={h} className="tnum">–</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </Dialog>
  )
}

/** Neutral product-name link that opens the product modal. */
export function ProductLink({ item, size, children }: { item: LineItem; size?: 'small' | 'inherit'; children: ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Link
        href="#"
        size={size}
        appearance="secondary"
        onClick={(e: MouseEvent) => {
          e.preventDefault()
          e.stopPropagation()
          setOpen(true)
        }}
      >
        {children}
      </Link>
      <ProductDialog item={open ? item : null} onOpenChange={setOpen} />
    </>
  )
}
