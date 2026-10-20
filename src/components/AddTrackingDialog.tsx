import { useEffect, useState } from 'react'
import {
  ActionDialogLayout,
  Button,
  Checkbox,
  Dialog,
  Field,
  IconButton,
  Input,
  NativeSelect,
} from '@lightspeed/unified-components-backoffice-theme/react'
import { MaterialIcon } from './MaterialIcon'

/** Carriers offered for the optional tracking link. */
const CARRIERS = ['UPS', 'FedEx', 'USPS', 'DHL Express', 'Canada Post']

export interface TrackingEdit {
  tracking: string
  carrier: string
  notifyCustomer: boolean
}

interface AddTrackingDialogProps {
  /** Shown in the title, e.g. "Shipment 1". */
  shipment: string
  tracking: string
  carrier: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (edit: TrackingEdit) => void
}

export function AddTrackingDialog({
  shipment,
  tracking,
  carrier,
  open,
  onOpenChange,
  onSave,
}: AddTrackingDialogProps) {
  const [number, setNumber] = useState(tracking)
  const [via, setVia] = useState(carrier)
  const [notify, setNotify] = useState(false)

  /* Re-seed on open so the form always reflects what is on the shipment. */
  useEffect(() => {
    if (!open) return
    setNumber(tracking)
    setVia(carrier)
    setNotify(false)
  }, [open, tracking, carrier])

  return (
    <Dialog
      open={open}
      size="medium"
      closeControlAriaLabel="Close add tracking number"
      onChange={onOpenChange}
      customClasses={{ content: 'md:!w-full md:!max-w-[620px]' }}
      closeControlSlot={
        <IconButton appearance="ghost" ariaLabel="Close add tracking number">
          <MaterialIcon name="close" size={22} />
        </IconButton>
      }
    >
      <ActionDialogLayout
        titleSlot={`Add tracking number to ${shipment}`}
        subtitleSlot="Add tracking number"
        footerSlot={
          <>
            <Button
              disabled={!number.trim()}
              onClick={() => {
                onSave({ tracking: number.trim(), carrier: via, notifyCustomer: notify })
                onOpenChange(false)
              }}
            >
              Add tracking number
            </Button>
            <Button appearance="secondary" onClick={() => onOpenChange(false)}>
              Discard
            </Button>
          </>
        }
      >
        <div className="od-track-form">
          <Field labelSlot="Tracking number">
            <Input
              value={number}
              inputMode="numeric"
              autocomplete="off"
              placeholder="4444 2000 0000 0000 0000 00"
              onChange={setNumber}
            />
          </Field>

          <Field labelSlot="Select carrier (Optional)" hintSlot="Select carrier to generate link">
            <NativeSelect
              value={via}
              placeholder="No carrier"
              options={CARRIERS.map((c) => ({ value: c, label: c }))}
              onChange={(option) => setVia(option?.value ?? '')}
            />
          </Field>

          <Checkbox
            checked={notify}
            labelSlot="Send tracking number through email to customer"
            onChange={setNotify}
          />
        </div>
      </ActionDialogLayout>
    </Dialog>
  )
}
