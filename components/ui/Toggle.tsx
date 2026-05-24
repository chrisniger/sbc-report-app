'use client'

interface ToggleProps {
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
  label?: string
}

export default function Toggle({ checked, onChange, disabled = false, label }: ToggleProps) {
  return (
    <label className={`inline-flex items-center gap-2 ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors duration-200 focus:outline-none ${
          checked ? 'bg-sbc-red' : 'bg-gray-200 dark:bg-zinc-600'
        }`}
      >
        <span
          className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform duration-200 ${
            checked ? 'translate-x-[18px]' : 'translate-x-[2px]'
          }`}
        />
      </button>
      {label && (
        <span className="text-sm text-sbc-black dark:text-white select-none">{label}</span>
      )}
    </label>
  )
}
