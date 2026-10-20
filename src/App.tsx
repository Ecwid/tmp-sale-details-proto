import { useEffect, useState } from 'react'
import { AppShell, AppToaster, notify, ThemeSwitch } from './components/AppShell'
import type { TrackingEdit } from './components/AddTrackingDialog'
import type { SaleEdit } from './components/EditSaleDialog'
import { salesInListOrder, splitGroup, withServicesCompleted, type Group, type Sale } from './data/sales'
import { SalesHistory } from './pages/SalesHistory'
import { OrderDetails } from './pages/OrderDetails'
import { stepForLabel, type StepMap as ListSteps } from './lib/salesHistory'
import { stepKindFor, type StepMap as GroupSteps } from './lib/orderDetails'

type Route = { name: 'sales-history' } | { name: 'order-details'; index: number }

const SALES_ORDER = salesInListOrder()

/** `#/order/88` deep-links to a receipt; anything else lands on the list. */
function readHash(): Route {
  const m = window.location.hash.match(/^#\/order\/(.+)$/)
  if (!m) return { name: 'sales-history' }
  const idx = SALES_ORDER.findIndex((s) => s.receipt === '#' + decodeURIComponent(m[1]).replace('#', ''))
  return idx >= 0 ? { name: 'order-details', index: idx } : { name: 'sales-history' }
}

export default function App() {
  const [route, setRoute] = useState<Route>(readHash)
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')

  /** Sales history records one step per sale; Order details records one per group. */
  const [listSteps, setListSteps] = useState<ListSteps>({})
  const [groupSteps, setGroupSteps] = useState<GroupSteps>({})

  /** Sale-level edits made through the Edit dialog, keyed by sale id. */
  const [saleEdits, setSaleEdits] = useState<Record<string, SaleEdit>>({})

  /** Fulfillment groups after any splits, keyed by sale id. */
  const [saleGroups, setSaleGroups] = useState<Record<string, Group[]>>({})

  /** Sales whose services were marked as completed this session. */
  const [servicesDone, setServicesDone] = useState<Record<string, true>>({})

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  useEffect(() => {
    const onHash = () => setRoute(readHash())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  function flash(message: string) {
    notify(message)
  }

  function go(next: Route) {
    setRoute(next)
    window.location.hash =
      next.name === 'order-details' ? `#/order/${SALES_ORDER[next.index].receipt.replace('#', '')}` : ''
  }

  /* -------- Sales history: one step per sale -------- */
  function handleCompleteService(sale: Sale) {
    setServicesDone((prev) => ({ ...prev, [sale.id]: true }))
    flash(`Service on sale ${sale.receipt} marked as completed`)
  }

  function handleListAction(sale: Sale, label: string) {
    if (label === 'Mark as completed') return handleCompleteService(sale)
    const step = stepForLabel(label)
    if (!step) return
    setListSteps((prev) => ({ ...prev, [sale.id]: step }))
    flash(
      step === 'packed'
        ? `Sale ${sale.receipt} marked as packed`
        : /pickup/i.test(label)
          ? `Pickup recorded for sale ${sale.receipt}`
          : `Sale ${sale.receipt} marked as shipped`,
    )
  }

  /* -------- Order details: one step per fulfillment group -------- */
  function handleOrderAction(stepKey: number | null, label: string) {
    const kind = stepKindFor(label)
    if (!kind || stepKey == null) return
    setGroupSteps((prev) => ({ ...prev, [stepKey]: kind === 'pack' ? 'packed' : 'done' }))
    flash(
      kind === 'pack' ? 'Marked as packed' : kind === 'pickup' ? 'Pickup recorded' : 'Marked as shipped',
    )
  }

  function navigateSale(index: number) {
    setGroupSteps({})
    go({ name: 'order-details', index })
  }

  function handleEditSale(sale: Sale, edit: SaleEdit) {
    setSaleEdits((prev) => ({ ...prev, [sale.id]: edit }))
    flash(`Sale ${sale.receipt} updated`)
  }

  function handleSplitGroup(sale: Sale, stepKey: number, picked: number[]) {
    setSaleGroups((prev) => ({
      ...prev,
      [sale.id]: splitGroup(prev[sale.id] ?? sale.groups, stepKey, picked),
    }))
    /* Step keys shift once a group is inserted, so recorded steps no longer apply. */
    setGroupSteps({})
    flash(`Fulfillment split into two on sale ${sale.receipt}`)
  }

  function handleSetTracking(sale: Sale, stepKey: number, edit: TrackingEdit) {
    setSaleGroups((prev) => {
      const groups = (prev[sale.id] ?? sale.groups).slice()
      const target = groups[stepKey]
      if (!target) return prev
      groups[stepKey] = { ...target, tracking: edit.tracking, carrier: edit.carrier }
      return { ...prev, [sale.id]: groups }
    })
    flash(
      edit.notifyCustomer
        ? 'Tracking number added and emailed to the customer'
        : `Tracking number added to sale ${sale.receipt}`,
    )
  }

  return (
    <>
      <AppShell>
        {route.name === 'sales-history' ? (
          <SalesHistory
            steps={listSteps}
            servicesDone={servicesDone}
            onStep={handleListAction}
            onOpenSale={(sale) =>
              navigateSale(SALES_ORDER.findIndex((s) => s.id === sale.id))
            }
          />
        ) : (
          <OrderDetailsRoute
            index={route.index}
            steps={groupSteps}
            edits={saleEdits}
            groupOverrides={saleGroups}
            servicesDone={servicesDone}
            onCompleteService={handleCompleteService}
            onAction={handleOrderAction}
            onEditSale={handleEditSale}
            onSplitGroup={handleSplitGroup}
            onSetTracking={handleSetTracking}
            onNavigate={navigateSale}
            onBack={() => go({ name: 'sales-history' })}
          />
        )}
      </AppShell>

      <AppToaster />
      <ThemeSwitch theme={theme} onChange={setTheme} />
    </>
  )
}

interface OrderDetailsRouteProps {
  index: number
  steps: GroupSteps
  edits: Record<string, SaleEdit>
  groupOverrides: Record<string, Group[]>
  servicesDone: Record<string, true>
  onCompleteService: (sale: Sale) => void
  onAction: (stepKey: number | null, label: string) => void
  onEditSale: (sale: Sale, edit: SaleEdit) => void
  onSplitGroup: (sale: Sale, stepKey: number, picked: number[]) => void
  onSetTracking: (sale: Sale, stepKey: number, edit: TrackingEdit) => void
  onNavigate: (index: number) => void
  onBack: () => void
}

function OrderDetailsRoute({
  index,
  steps,
  edits,
  groupOverrides,
  servicesDone,
  onCompleteService,
  onAction,
  onEditSale,
  onSplitGroup,
  onSetTracking,
  onNavigate,
  onBack,
}: OrderDetailsRouteProps) {
  const i = Math.max(0, Math.min(index, SALES_ORDER.length - 1))
  const prev = SALES_ORDER[i - 1]
  const next = SALES_ORDER[i + 1]
  const base = SALES_ORDER[i]
  const edit = edits[base.id]
  const groups = groupOverrides[base.id] ?? base.groups
  const merged = { ...base, groups, ...(edit ? { when: edit.when, note: edit.note } : {}) }
  const sale = servicesDone[base.id] ? withServicesCompleted(merged) : merged

  return (
    <OrderDetails
      sale={sale}
      steps={steps}
      atFirst={!prev}
      atLast={!next}
      prevLabel={prev ? `Previous sale · ${prev.receipt}` : 'No earlier sale in the list'}
      nextLabel={next ? `Next sale · ${next.receipt}` : 'No later sale in the list'}
      onPrev={() => prev && onNavigate(i - 1)}
      onNext={() => next && onNavigate(i + 1)}
      onBack={onBack}
      onAction={onAction}
      onCompleteService={() => onCompleteService(base)}
      onEditSale={(e) => onEditSale(base, e)}
      onSplitGroup={(stepKey, picked) => onSplitGroup(base, stepKey, picked)}
      onSetTracking={(stepKey, edit) => onSetTracking(base, stepKey, edit)}
    />
  )
}
