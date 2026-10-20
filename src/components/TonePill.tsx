import { Badge } from '@lightspeed/unified-components-backoffice-theme/react'
import type { Tone } from '../data/sales'
import { badgeAppearance } from '../lib/tone'
import { MaterialIcon } from './MaterialIcon'

interface TonePillProps {
  label: string
  tone: Tone
  icon?: string
}

/** Status pill — a Unified Components `Badge` mapped from the prototype's tone names. */
export function TonePill({ label, tone, icon }: TonePillProps) {
  return (
    <Badge
      appearance={badgeAppearance(tone)}
      prefixSlot={icon ? <MaterialIcon name={icon} size={14} /> : undefined}
    >
      {label}
    </Badge>
  )
}
