import type { Tone } from '../data/sales'

/**
 * Status tones map to semantic Unified Components token variables, so pills stay
 * correct in both light and dark themes without any per-theme rules.
 */
export interface ToneColors {
  fg: string
  bg: string
}

export const TONE: Record<Tone, ToneColors> = {
  success: {
    fg: 'var(--ls-color-fg-success-default)',
    bg: 'var(--ls-color-bg-success-highlight-default)',
  },
  warning: {
    fg: 'var(--ls-color-fg-warning-default)',
    bg: 'var(--ls-color-bg-warning-highlight-default)',
  },
  no: {
    fg: 'var(--ls-color-fg-no-default)',
    bg: 'var(--ls-color-bg-no-highlight-default)',
  },
  go: {
    fg: 'var(--ls-color-fg-go-default)',
    bg: 'var(--ls-color-bg-go-highlight-default)',
  },
  neutral: {
    fg: 'var(--ls-color-fg-neutral-default)',
    bg: 'var(--ls-color-bg-neutral-inert-softer)',
  },
}

/** Maps a prototype tone onto the closest Unified Components `Badge` appearance. */
export const badgeAppearance = (tone: Tone): 'neutral' | 'info' | 'success' | 'warning' | 'danger' =>
  tone === 'success' ? 'success' : tone === 'warning' ? 'warning' : tone === 'no' ? 'danger' : tone === 'go' ? 'info' : 'neutral'
