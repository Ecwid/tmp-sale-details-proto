interface AvatarProps {
  initials: string
  color: string
  size?: number
}

/** Square initials tile used for customers, staff and activity actors. */
export function Avatar({ initials, color, size = 32 }: AvatarProps) {
  return (
    <span
      className="ls-avatar"
      style={{ width: size, height: size, background: color, fontSize: Math.round(size * 0.375) }}
    >
      {initials}
    </span>
  )
}
