import { useEffect, useState } from 'react'
import {
  ActionDialogLayout,
  Button,
  ButtonAsLink,
  DatePicker,
  Dialog,
  Field,
  IconButton,
  NativeSelect,
  Textarea,
} from '@lightspeed/unified-components-backoffice-theme/react'
import type { Sale } from '../data/sales'
import { formatSaleWhen, parseSaleWhen, splitStamp } from '../lib/orderDetails'
import { Avatar } from './Avatar'
import { MaterialIcon } from './MaterialIcon'

const HOURS = Array.from({ length: 12 }, (_, i) => String(i + 1))
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'))
const MERIDIEM = ['AM', 'PM']

const options = (values: string[]) => values.map((v) => ({ value: v, label: v }))

export interface SaleEdit {
  when: string
  note: string
}

interface EditSaleDialogProps {
  sale: Sale
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (edit: SaleEdit) => void
}

/** Edits the sale-level fields: when it happened, who it was for, and the note. */
export function EditSaleDialog({ sale, open, onOpenChange, onSave }: EditSaleDialogProps) {
  const seed = parseSaleWhen(sale.when)
  const [date, setDate] = useState<Date>(seed.date)
  const [hour, setHour] = useState(seed.hour)
  const [minute, setMinute] = useState(seed.minute)
  const [meridiem, setMeridiem] = useState(seed.meridiem)
  const [note, setNote] = useState(sale.note)
  const [hasCustomer, setHasCustomer] = useState(true)

  /* Re-seed on open so the form always reflects the sale as last saved. */
  useEffect(() => {
    if (!open) return
    const next = parseSaleWhen(sale.when)
    setDate(next.date)
    setHour(next.hour)
    setMinute(next.minute)
    setMeridiem(next.meridiem)
    setNote(sale.note)
    setHasCustomer(true)
  }, [open, sale])

  const payments = sale.money.payments || []

  return (
    <Dialog
      open={open}
      size="large"
      closeControlAriaLabel="Close edit sale"
      onChange={onOpenChange}
      /* `size` only caps the width; the theme's own `md:w-auto` otherwise
         shrink-wraps the surface, so the cap is never reached. */
      customClasses={{ content: 'md:!w-full md:!max-w-[960px]' }}
      closeControlSlot={
        <IconButton appearance="ghost" ariaLabel="Close edit sale">
          <MaterialIcon name="close" size={22} />
        </IconButton>
      }
    >
      <ActionDialogLayout
        titleSlot={`Edit sale on receipt ${sale.receipt.replace('#', '')}`}
        subtitleSlot="Any changes made on this sale will automatically update your sales and payments reports."
        footerSlot={
          <Button
            onClick={() => {
              onSave({ when: formatSaleWhen(date, hour, minute, meridiem), note })
              onOpenChange(false)
            }}
          >
            Save changes
          </Button>
        }
      >
        <div className="od-edit">
          <Field labelSlot="Sale date">
            <div className="od-edit__date">
              <DatePicker
                mode="single"
                selected={date}
                placeholder="Pick a date"
                onSelect={(value) => value instanceof Date && setDate(value)}
              />
              <NativeSelect
                ariaLabel="Hour"
                value={hour}
                options={options(HOURS)}
                onChange={(o) => o && setHour(o.value)}
              />
              <NativeSelect
                ariaLabel="Minute"
                value={minute}
                options={options(MINUTES)}
                onChange={(o) => o && setMinute(o.value)}
              />
              <NativeSelect
                ariaLabel="AM or PM"
                value={meridiem}
                options={options(MERIDIEM)}
                onChange={(o) => o && setMeridiem(o.value)}
              />
            </div>
          </Field>

          <div className="od-edit__block">
            <span className="od-edit__label">Customer</span>
            {hasCustomer ? (
              <div className="od-edit__customer">
                <Avatar initials={sale.customer.initials} color={sale.customer.color} size={40} />
                <div className="od-edit__customer-text">
                  <span className="od-edit__customer-name">{sale.customer.name}</span>
                  <span className="od-edit__customer-sub">{sale.customer.contact}</span>
                </div>
                <IconButton
                  appearance="ghost"
                  ariaLabel={`Remove ${sale.customer.name} from this sale`}
                  onClick={() => setHasCustomer(false)}
                >
                  <MaterialIcon name="delete" size={20} />
                </IconButton>
              </div>
            ) : (
              <span className="od-edit__empty">No customer on this sale.</span>
            )}
          </div>

          <Field labelSlot="Sale note" hintSlot="2000 characters max">
            <Textarea adaptive value={note} maxLength={2000} onChange={setNote} />
          </Field>

          <div className="od-edit__payments">
            <div className="od-edit__payrow od-edit__payrow--head">
              <span>Payment type</span>
              <span>Date</span>
              <span />
              <span>Amount</span>
            </div>
            {payments.map((p) => {
              const stamp = splitStamp(p.when)
              return (
                <div key={p.method + p.when} className="od-edit__payrow">
                  <span>{p.method}</span>
                  <span>{stamp.date}</span>
                  <span>{stamp.time}</span>
                  <span className="tnum">{p.amount}</span>
                </div>
              )
            })}
            {payments.length === 0 && (
              <div className="od-edit__payrow od-edit__payrow--empty">
                No payments recorded on this sale.
              </div>
            )}
            <div className="od-edit__addpay">
              <ButtonAsLink prefixSlot={<MaterialIcon name="add_box" size={18} />}>
                Add another payment
              </ButtonAsLink>
            </div>
          </div>
        </div>
      </ActionDialogLayout>
    </Dialog>
  )
}
