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
      <rect width="32" height="32" rx="7" fill="#1A82E2" />
      <path
        d="M5.87 25.33h9.07c.59 0 1.07-.48 1.07-1.07v-3.2c0-.59-.48-1.07-1.07-1.07H10.4c-.59 0-1.07-.48-1.07-1.07v-4.53c0-.59-.48-1.07-1.07-1.07H5.07c-.59 0-1.07.48-1.07 1.07v9.87c0 .37.3.67.67.67h1.2zM26.13 6.67h-9.07c-.59 0-1.07.48-1.07 1.07v3.2c0 .59.48 1.07 1.07 1.07h4.53c.59 0 1.07.48 1.07 1.07v4.53c0 .59.48 1.07 1.07 1.07h3.2c.59 0 1.07-.48 1.07-1.07V7.47c0-.37-.3-.67-.67-.67h-1.2z"
        fill="#fff"
      />
    </svg>
  )
})

export default SendGridLogo
