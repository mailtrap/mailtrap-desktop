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
      <rect width="32" height="32" rx="7" fill="#1A2233" />
      <g transform="translate(2.7 2.7) scale(1.11)">
        {/* Bottom chevron — white */}
        <path
          d="M5.37 17.61l-2.04 1.2c-.28.18-.15.5 0 .56l7.91 4.43c.47.26 1.04.26 1.51 0l8.01-4.49c.24-.14.2-.44 0-.53l-2.15-1.16c-.18-.12-.59-.08-.73.02l-5.13 2.87c-.47.26-1.04.26-1.51 0l-5.18-2.9c-.19-.12-.5-.11-.7 0z"
          fill="#FBFCFC"
        />
        {/* Top crown — white */}
        <path
          d="M11.24.2c.47-.26 1.04-.26 1.51 0l6.37 3.57c.25.13.28.47 0 .63-.42.23-.98.55-1.45.81-.55.3-1.21.3-1.76 0L12.75 3.44c-.47-.26-1.04-.26-1.51 0L8.07 5.21c-.55.31-1.21.31-1.76 0-.49-.27-1.08-.6-1.5-.84-.24-.1-.28-.4 0-.57L11.24.2z"
          fill="#FBFCFC"
        />
        {/* M body — green */}
        <path
          d="M21.97 5.57c.47.26.76.75.76 1.27V17.16c0 .51-.32.6-.66.43l-2.36-1.27V9.38l-6.95 3.89c-.47.26-1.04.26-1.51 0L4.3 9.38v6.94l-2.15 1.17c-.26.16-.88.21-.88-.43V6.84c0-.52.29-1.01.76-1.27.75-.39 1.53 0 1.53 0l8.44 4.74 8.43-4.74s.75-.45 1.54 0z"
          fill="#22D172"
        />
      </g>
    </svg>
  )
})

export default MailtrapLogo
