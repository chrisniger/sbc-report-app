interface HoverButtonProps {
  onClick?: () => void
  children: React.ReactNode
  className?: string
  type?: 'button' | 'submit' | 'reset'
}

export default function HoverButton({
  onClick,
  children,
  className = '',
  type = 'button',
}: HoverButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      className={`opacity-0 group-hover:opacity-100 bg-zinc-800 hover:bg-zinc-700 text-white text-xs px-3 py-1.5 rounded transition-all duration-150 ${className}`}
    >
      {children}
    </button>
  )
}
