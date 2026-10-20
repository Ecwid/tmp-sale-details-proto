import { Fragment } from 'react'
import {
  createToaster,
  IconButton,
  NotificationToastLayout,
  SegmentedControlGroup,
  SegmentedControlItem,
  Toast,
  Toaster,
  Tooltip,
} from '@lightspeed/unified-components-backoffice-theme/react'
import { MaterialIcon } from './MaterialIcon'
import { BrandMark, RAIL_ITEMS, RAIL_SEPARATORS } from './navAssets'

export type Route = 'sales-history' | 'order-details'

const PANEL_ITEMS = [
  'Sell',
  'Open / Close',
  'All sales',
  'Cash management',
  'Status',
  'Settings',
  'Quotes',
]

interface AppShellProps {
  children: React.ReactNode
}

/**
 * Backoffice chrome: dark topbar, icon rail and section panel.
 *
 * Unified Components has no navigation-shell primitive, so this is bespoke
 * layout — but every colour is a `--ls-color-*` token, so it tracks the theme.
 */
export function AppShell({ children }: AppShellProps) {
  return (
    <>
      <header className="sh-topbar">
        <div className="sh-topbar__brand">
          <BrandMark />
        </div>
        <div className="sh-topbar__search">
          <label>
            <MaterialIcon name="search" size={20} />
            <input placeholder="Search" disabled />
            <kbd>⌘/</kbd>
          </label>
        </div>
        <div className="sh-topbar__right">
          <span className="txt">Help</span>
          <MaterialIcon
            name="campaign"
            size={22}
            style={{ color: 'var(--ls-color-fg-neutral-ondark-inert-default)' }}
          />
          <span className="txt">Ecwid Support</span>
          <span className="sh-topbar__ai">
            <MaterialIcon name="auto_awesome" size={20} />
          </span>
        </div>
      </header>

      <div className="sh-shell">
        <nav className="sh-rail" aria-label="Primary">
          {RAIL_ITEMS.map((item, i) => (
            <Fragment key={item.title}>
              <Tooltip
                placement="right"
                controlSlot={
                  <span
                    className={`sh-rail__item${item.active ? ' active' : ''}`}
                    tabIndex={0}
                    aria-label={item.title}
                  >
                    {item.icon}
                  </span>
                }
              >
                {item.title}
              </Tooltip>
              {RAIL_SEPARATORS.has(i) && <span className="sh-rail__sep" />}
            </Fragment>
          ))}
          <span className="sh-rail__spacer" />
          <Tooltip
            placement="right"
            controlSlot={
              <IconButton
                appearance="ghost"
                ariaLabel="Collapse navigation"
                customClasses={{ root: 'sh-rail__collapse' }}
              >
                <MaterialIcon name="keyboard_tab" size={22} />
              </IconButton>
            }
          >
            Collapse
          </Tooltip>
        </nav>

        <nav className="sh-panel" aria-label="Sell">
          {PANEL_ITEMS.map((label) => (
            <button
              key={label}
              className={`sh-panel__item${label === 'All sales' ? ' active' : ''}`}
            >
              {label}
            </button>
          ))}
        </nav>

        <main className="sh-main">{children}</main>
      </div>
    </>
  )
}

interface ThemeSwitchProps {
  theme: 'dark' | 'light'
  onChange: (theme: 'dark' | 'light') => void
}

/** Floating light/dark toggle — a prototype affordance, not part of the product design. */
export function ThemeSwitch({ theme, onChange }: ThemeSwitchProps) {
  return (
    <div className="sh-themeswitch">
      <SegmentedControlGroup
        size="small"
        ariaLabel="Theme"
        value={theme}
        onChange={(v: string | undefined) => v && onChange(v as 'dark' | 'light')}
      >
        <SegmentedControlItem value="dark">
          <MaterialIcon name="dark_mode" size={18} />
          <span className="sr-only">Dark theme</span>
        </SegmentedControlItem>
        <SegmentedControlItem value="light">
          <MaterialIcon name="light_mode" size={18} />
          <span className="sr-only">Light theme</span>
        </SegmentedControlItem>
      </SegmentedControlGroup>
    </div>
  )
}

const toaster = createToaster({ placement: 'bottom-center' })
const messages = new Map<string, string>()

/** Queues a success toast confirming a recorded step. */
export function notify(message: string) {
  const id = toaster.success({ duration: 4000 })
  messages.set(id, message)
}

export function AppToaster() {
  return (
    <Toaster toaster={toaster}>
      {(t) => (
        <Toast key={t.id} {...t}>
          <NotificationToastLayout titleSlot={messages.get(t.id)} />
        </Toast>
      )}
    </Toaster>
  )
}
