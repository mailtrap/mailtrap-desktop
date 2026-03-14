import React from 'react'

interface LogoProps {
  className?: string
}

const MailtrapLogo = React.memo(function MailtrapLogo({ className = 'h-5 w-5' }: LogoProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Mailtrap"
    >
      <rect width="32" height="32" rx="6" fill="#22C55E" />
      <path
        d="M7 12l9 6 9-6M7 12v10h18V12M7 12l9-4 9 4"
        stroke="#fff"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
})

export default MailtrapLogo
