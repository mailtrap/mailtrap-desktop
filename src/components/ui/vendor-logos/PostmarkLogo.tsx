import React from 'react'

interface LogoProps {
  className?: string
}

const PostmarkLogo = React.memo(function PostmarkLogo({ className = 'h-5 w-5' }: LogoProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Postmark"
    >
      <rect width="32" height="32" rx="6" fill="#FFDE00" />
      <path
        d="M7 13l9 6 9-6"
        stroke="#1A1A2E"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <rect x="7" y="10" width="18" height="13" rx="2" stroke="#1A1A2E" strokeWidth="2" fill="none" />
    </svg>
  )
})

export default PostmarkLogo
