import React from 'react'

/* ───────────────────────────────────────────────────────────────────────── *
 *  MTUI Button — Figma-faithful implementation
 *
 *  Figma source:  MTUI Library → Button → base-button
 *  Variants:      primary | outlined | ghost | danger | danger-outlined
 *                 success | success-outlined | dark | dark-outline
 *  Sizes:         sm (27 px) | md (35 px — default) | lg (43 px)
 *  Radius:        7 px  (rounded-mtui)
 *  Font:          14/600 Inter  -0.28 ls  (text-button-label)
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

/* ── size → padding / height ─────────────────────────────────────────── */
const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-2 py-1 text-button-label min-h-[27px]',
  md: 'px-4 py-2 text-button-label min-h-[35px]',
  lg: 'px-5 py-3 text-button-label min-h-[43px]'
}

/* ── variant → colors  (dark-mode-adapted from Figma light tokens) ─── */
const variantClasses: Record<ButtonVariant, string> = {
  // Figma: bg=#4C83EE  hover=#5D93FC  disabled=#EEEEEE/#A3ABB4
  primary: [
    'bg-blue-400 text-white border border-blue-400',
    'hover:bg-blue-300 hover:border-blue-300',
    'active:bg-blue-500 active:border-blue-500',
    'focus-visible:ring-2 focus-visible:ring-blue-400/40',
    'disabled:bg-navy-400 disabled:border-navy-400 disabled:text-navy-100'
  ].join(' '),

  // Figma: transparent/stroke=#4C83EE  hover=bg#5D93FC/white  disabled=#EEEEEE/#A3ABB4
  outlined: [
    'bg-transparent text-blue-400 border border-blue-400',
    'hover:bg-blue-300 hover:text-white hover:border-blue-300',
    'active:bg-blue-500 active:text-white active:border-blue-500',
    'focus-visible:ring-2 focus-visible:ring-blue-400/40',
    'disabled:bg-navy-400 disabled:border-navy-400 disabled:text-navy-100'
  ].join(' '),

  // Figma: transparent/no-stroke  text=#4C83EE  hover=text#5D93FC  disabled=#EEEEEE/#A3ABB4
  ghost: [
    'bg-transparent text-blue-400 border border-transparent',
    'hover:text-blue-300 hover:bg-navy-500',
    'active:text-blue-500 active:bg-navy-400',
    'focus-visible:ring-2 focus-visible:ring-blue-400/40',
    'disabled:bg-navy-400 disabled:border-navy-400 disabled:text-navy-100'
  ].join(' '),

  // Figma: bg=#FB5151  hover=#FF7171  disabled=#EEEEEE/#A3ABB4
  danger: [
    'bg-red-300 text-white border border-red-300',
    'hover:bg-red-200 hover:border-red-200',
    'active:bg-red-400 active:border-red-400',
    'focus-visible:ring-2 focus-visible:ring-red-300/40',
    'disabled:bg-navy-400 disabled:border-navy-400 disabled:text-navy-100'
  ].join(' '),

  // Figma: transparent/stroke=#FB5151  hover=bg#FF7171/white  disabled=#EEEEEE/#A3ABB4
  'danger-outlined': [
    'bg-transparent text-red-300 border border-red-300',
    'hover:bg-red-200 hover:text-white hover:border-red-200',
    'active:bg-red-400 active:text-white active:border-red-400',
    'focus-visible:ring-2 focus-visible:ring-red-300/40',
    'disabled:bg-navy-400 disabled:border-navy-400 disabled:text-navy-100'
  ].join(' '),

  // Figma: bg=#22D172  hover=#45E890  disabled=#EEEEEE/#A3ABB4
  success: [
    'bg-green-300 text-white border border-green-300',
    'hover:bg-green-200 hover:border-green-200',
    'active:bg-green-400 active:border-green-400',
    'focus-visible:ring-2 focus-visible:ring-green-300/40',
    'disabled:bg-navy-400 disabled:border-navy-400 disabled:text-navy-100'
  ].join(' '),

  // Figma: transparent/stroke=#22D172  hover=bg#45E890/white  disabled=#EEEEEE/#A3ABB4
  'success-outlined': [
    'bg-transparent text-green-300 border border-green-300',
    'hover:bg-green-200 hover:text-white hover:border-green-200',
    'active:bg-green-400 active:text-white active:border-green-400',
    'focus-visible:ring-2 focus-visible:ring-green-300/40',
    'disabled:bg-navy-400 disabled:border-navy-400 disabled:text-navy-100'
  ].join(' '),

  // Figma: bg=#1A2E44  hover=#38445E  disabled=#EEEEEE/#A3ABB4
  dark: [
    'bg-[#1A2E44] text-white border border-[#1A2E44]',
    'hover:bg-[#38445E] hover:border-[#38445E]',
    'active:bg-navy-300 active:border-navy-300',
    'focus-visible:ring-2 focus-visible:ring-navy-300/40',
    'disabled:bg-navy-400 disabled:border-navy-400 disabled:text-navy-100'
  ].join(' '),

  // Figma: transparent/stroke=#1A2E44  hover=bg#38445E/white  disabled=#EEEEEE/#A3ABB4
  'dark-outline': [
    'bg-transparent text-[#FBFCFC] border border-navy-300',
    'hover:bg-[#38445E] hover:text-white hover:border-[#38445E]',
    'active:bg-navy-300 active:text-white active:border-navy-300',
    'focus-visible:ring-2 focus-visible:ring-navy-300/40',
    'disabled:bg-navy-400 disabled:border-navy-400 disabled:text-navy-100'
  ].join(' ')
}

const baseClasses =
  'inline-flex items-center justify-center gap-2 rounded-mtui font-semibold transition-colors focus:outline-none disabled:cursor-not-allowed'

/* ── spinner ─────────────────────────────────────────────────────────── */
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

/* ── component ───────────────────────────────────────────────────────── */
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
