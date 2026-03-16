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
      <rect width="32" height="32" rx="7" fill="#4E48E0" />
      {/* Lightning bolt icon */}
      <path
        d="M22.4 12.27a.5.5 0 0 0-.43-.24h-6.28l3.14-5.03a.5.5 0 0 0-.43-.75h-5.42a1.5 1.5 0 0 0-1.28.77L6.07 17.7a.5.5 0 0 0 .43.75h6.28l-3.14 5.03a.5.5 0 0 0 .43.75l5.42-.01a1.5 1.5 0 0 0 1.29-.76l5.62-11.2z"
        fill="#fff"
      />
      <path
        d="M18.32 18.45l-3.58 5.78a1.5 1.5 0 0 1-1.29.76l-5.42.01a.5.5 0 0 1-.43-.75l3.14-5.03h6.28l1.3-2.15"
        fill="#B8B5F5"
      />
    </svg>
  )
})

export default MailerSendLogo
