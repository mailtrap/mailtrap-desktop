import React from 'react'

/* ───────────────────────────────────────────────────────────────────────── *
 *  MTUI Button — sourced from mtui/components/Button/index.js
 *
 *  Variants:  primary | outlined | ghost | danger | danger-outlined
 *             success | success-outlined | dark | dark-outline
 *  Sizes:     sm (4px 8px) | md (8px 16px, default) | big (12px 20px)
 *  Radius:    7px  (borderRadius.base)
 *  Font:      14px / 600  line-height 1.15
 *
 *  All colors below are dark-theme values from semanticColors/dark.js
 * ───────────────────────────────────────────────────────────────────────── */

export type ButtonVariant =
  | 'primary'
  | 'outlined'
  | 'ghost'
  | 'danger'
  | 'danger-outlined'
  | 'success'
  | 'success-outlined'
  | 'dark'
  | 'dark-outline'

export type ButtonSize = 'sm' | 'md' | 'lg'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  icon?: React.ReactNode
  iconPosition?: 'left' | 'right'
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'btn-sm',
  md: '',
  lg: 'btn-lg'
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: [
    'bg-blue-neutral text-navy-air border border-blue-neutral',
    'hover:bg-blue-medium hover:border-blue-medium',
    'active:bg-blue-dark active:border-blue-dark',
    'focus-visible:ring-2 focus-visible:ring-blue-neutral/40',
    'disabled:bg-grey-shade disabled:border-grey-shade disabled:text-grey-deep'
  ].join(' '),

  outlined: [
    'bg-transparent text-blue-neutral border border-blue-neutral',
    'hover:bg-blue-medium hover:text-navy-air hover:border-blue-medium',
    'active:bg-blue-dark active:text-navy-air active:border-blue-dark',
    'focus-visible:ring-2 focus-visible:ring-blue-neutral/40',
    'disabled:bg-grey-shade disabled:border-grey-shade disabled:text-grey-deep'
  ].join(' '),

  ghost: [
    'bg-transparent text-blue-neutral border border-transparent',
    'hover:text-blue-medium hover:bg-grey-bold',
    'active:text-blue-medium active:bg-grey-shade',
    'focus-visible:ring-2 focus-visible:ring-blue-neutral/40',
    'disabled:bg-grey-shade disabled:border-grey-shade disabled:text-grey-deep'
  ].join(' '),

  danger: [
    'bg-transparent text-red-medium border border-red-medium',
    'hover:bg-red-soft hover:border-red-soft hover:text-navy-air',
    'active:bg-red-neutral active:border-red-neutral active:text-navy-air',
    'focus-visible:ring-2 focus-visible:ring-red-medium/40',
    'disabled:bg-grey-shade disabled:border-grey-shade disabled:text-grey-deep'
  ].join(' '),

  'danger-outlined': [
    'bg-transparent text-red-medium border border-red-medium',
    'hover:bg-red-soft hover:text-navy-air hover:border-red-soft',
    'active:bg-red-neutral active:text-navy-air active:border-red-neutral',
    'focus-visible:ring-2 focus-visible:ring-red-medium/40',
    'disabled:bg-grey-shade disabled:border-grey-shade disabled:text-grey-deep'
  ].join(' '),

  success: [
    'bg-green-medium text-navy-air border border-green-medium',
    'hover:bg-green-soft hover:border-green-soft',
    'active:bg-green-neutral active:border-green-neutral',
    'focus-visible:ring-2 focus-visible:ring-green-medium/40',
    'disabled:bg-grey-shade disabled:border-grey-shade disabled:text-grey-deep'
  ].join(' '),

  'success-outlined': [
    'bg-transparent text-green-medium border border-green-medium',
    'hover:bg-green-soft hover:text-navy-air hover:border-green-soft',
    'active:bg-green-neutral active:text-navy-air active:border-green-neutral',
    'focus-visible:ring-2 focus-visible:ring-green-medium/40',
    'disabled:bg-grey-shade disabled:border-grey-shade disabled:text-grey-deep'
  ].join(' '),

  dark: [
    'bg-white text-grey-void border border-white',
    'hover:bg-grey-neutral hover:border-grey-neutral',
    'active:bg-navy-muted active:border-navy-muted',
    'focus-visible:ring-2 focus-visible:ring-grey-neutral/40',
    'disabled:bg-grey-shade disabled:border-grey-shade disabled:text-grey-deep'
  ].join(' '),

  'dark-outline': [
    'bg-transparent text-navy-air border border-white',
    'hover:bg-grey-neutral hover:text-grey-void hover:border-grey-neutral',
    'active:bg-navy-muted active:text-grey-void active:border-navy-muted',
    'focus-visible:ring-2 focus-visible:ring-grey-neutral/40',
    'disabled:bg-grey-shade disabled:border-grey-shade disabled:text-grey-deep'
  ].join(' ')
}

const baseClasses =
  'inline-flex items-center justify-center gap-2 rounded-mtui font-semibold transition-colors duration-mtui ease-mtui focus:outline-none disabled:cursor-not-allowed disabled:pointer-events-none'

function Spinner({ className = '' }: { className?: string }) {
  return (
    <svg
      className={`h-4 w-4 animate-spin ${className}`}
      viewBox="0 0 24 24"
      fill="none"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="3"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  )
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      disabled,
      icon,
      iconPosition = 'left',
      children,
      className = '',
      ...rest
    },
    ref
  ) => {
    const isDisabled = disabled || loading

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
        style={{ padding: size === 'sm' ? '4px 8px' : size === 'lg' ? '12px 20px' : '8px 16px', lineHeight: '1.15' }}
        {...rest}
      >
        {loading && <Spinner />}
        {!loading && icon && iconPosition === 'left' && icon}
        {children}
        {!loading && icon && iconPosition === 'right' && icon}
      </button>
    )
  }
)

Button.displayName = 'Button'

export default Button
