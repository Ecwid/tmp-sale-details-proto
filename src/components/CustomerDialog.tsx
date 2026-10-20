import { useEffect, useState } from 'react'
import {
  Button,
  Dialog,
  IconButton,
  Link,
  Tab,
  TabBar,
} from '@lightspeed/unified-components-backoffice-theme/react'
import type { Person } from '../data/sales'
import { MaterialIcon } from './MaterialIcon'

const TABS = ['Details', 'Store credit', 'Loyalty', 'Account', 'Notes', 'Custom fields']
const BALANCES = ['Account balance', 'Loyalty', 'Store credit']

interface CustomerDialogProps {
  customer: Person | null
  onOpenChange: (open: boolean) => void
}

/** Splits the "email · phone" contact line into labelled rows. */
function contactRows(contact = '') {
  return contact
    .split('·')
    .map((p) => p.trim())
    .filter(Boolean)
    .map((value) => {
      if (value.includes('@')) return { label: 'Email', value, href: `mailto:${value}` }
      if (/^[\d\s+()-]+$/.test(value)) return { label: 'Phone', value, href: `tel:${value.replace(/\s/g, '')}` }
      return { label: 'Code', value }
    })
}

export function CustomerDialog({ customer, onOpenChange }: CustomerDialogProps) {
  const [tab, setTab] = useState(TABS[0])
  useEffect(() => {
    if (customer) setTab(TABS[0])
  }, [customer])

  const rows = contactRows(customer?.contact)
  const profile = rows.filter((r) => r.label === 'Code')
  const contact = rows.filter((r) => r.label !== 'Code')

  return (
    <Dialog
      open={!!customer}
      size="large"
      closeControlAriaLabel="Close customer"
      onChange={onOpenChange}
      customClasses={{ content: 'md:!w-full md:!max-w-[900px]' }}
      closeControlSlot={
        <IconButton appearance="ghost" ariaLabel="Close customer">
          <MaterialIcon name="close" size={22} />
        </IconButton>
      }
    >
      {customer && (
        <div className="cd-body">
          <header className="cd-head">
            <h2 className="typography-heading-lg">{customer.name}</h2>
            <span className="typography-body-sm">All customers</span>
          </header>

          <div className="cd-balances">
            {BALANCES.map((b) => (
              <div key={b}>
                <span className="typography-body-sm">{b}</span>
                <span className="cd-amount tnum">$0.00</span>
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

          {tab === 'Details' && (
            <div className="cd-details">
              {profile.length > 0 && <Section title="Profile" rows={profile} />}
              {contact.length > 0 && <Section title="Contact information" rows={contact} />}
            </div>
          )}

          <footer className="cd-foot">
            <Button appearance="secondary" onClick={() => onOpenChange(false)}>
              View customer sales
            </Button>
            <Button onClick={() => onOpenChange(false)}>Edit customer</Button>
          </footer>
        </div>
      )}
    </Dialog>
  )
}

function Section({ title, rows }: { title: string; rows: { label: string; value: string; href?: string }[] }) {
  return (
    <section>
      <h3 className="cd-section">{title}</h3>
      <dl className="cd-rows">
        {rows.map((r) => (
          <div key={r.label}>
            <dt>{r.label}</dt>
            <dd>{r.href ? <Link href={r.href}>{r.value}</Link> : r.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
