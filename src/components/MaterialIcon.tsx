interface MaterialIconProps {
  name: string
  size?: number
  className?: string
  style?: React.CSSProperties
}

/**
 * Material Symbols glyph. The Unified Components icon set covers the common cases,
 * but these prototypes lean on a wider set of product glyphs, so the icon font is
 * used directly and sized against the surrounding type.
 */
export function MaterialIcon({ name, size = 18, className, style }: MaterialIconProps) {
  return (
    <span
      className={`material-symbols-outlined ${className ?? ''}`}
      aria-hidden="true"
      style={{ fontSize: size, ...style }}
    >
      {name}
    </span>
  )
}
