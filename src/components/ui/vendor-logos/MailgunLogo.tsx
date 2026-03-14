import React from 'react'

interface LogoProps {
  className?: string
}

const MailgunLogo = React.memo(function MailgunLogo({ className = 'h-5 w-5' }: LogoProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Mailgun"
    >
      <rect width="32" height="32" rx="6" fill="#F06B54" />
      <path
        d="M16 8c-4.4 0-8 3.6-8 8s3.6 8 8 8 8-3.6 8-8-3.6-8-8-8zm0 12c-2.2 0-4-1.8-4-4s1.8-4 4-4 4 1.8 4 4-1.8 4-4 4z"
        fill="#fff"
      />
      <circle cx="16" cy="16" r="2" fill="#fff" />
    </svg>
  )
})

export default MailgunLogo
