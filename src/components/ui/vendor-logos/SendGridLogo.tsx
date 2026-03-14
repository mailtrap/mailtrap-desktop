import React from 'react'

interface LogoProps {
  className?: string
}

const SendGridLogo = React.memo(function SendGridLogo({ className = 'h-5 w-5' }: LogoProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="SendGrid"
    >
      <rect width="32" height="32" rx="6" fill="#1A82E2" />
      <rect x="6" y="6" width="8" height="8" rx="1" fill="#fff" opacity="0.9" />
      <rect x="14" y="6" width="8" height="8" rx="1" fill="#fff" opacity="0.5" />
      <rect x="14" y="14" width="8" height="8" rx="1" fill="#fff" opacity="0.9" />
      <rect x="22" y="14" width="4" height="8" rx="1" fill="#fff" opacity="0.5" />
      <rect x="6" y="14" width="8" height="4" rx="1" fill="#fff" opacity="0.5" />
      <rect x="14" y="22" width="8" height="4" rx="1" fill="#fff" opacity="0.5" />
    </svg>
  )
})

export default SendGridLogo
