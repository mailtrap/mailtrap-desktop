import React from 'react'

interface LogoProps {
  className?: string
}

const MailerSendLogo = React.memo(function MailerSendLogo({ className = 'h-5 w-5' }: LogoProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="MailerSend"
    >
      <rect width="32" height="32" rx="6" fill="#2563EB" />
      <path
        d="M8 16l4 4 8-8"
        stroke="#fff"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M14 22l2 2 8-10"
        stroke="#fff"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.5"
      />
    </svg>
  )
})

export default MailerSendLogo
