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
      <rect width="32" height="32" rx="7" fill="#FFDE00" />
      <path
        d="M9.3 22.57h.63c.32 0 .53-.21.53-.54V8.18c0-.33-.21-.54-.53-.54H9.3V5.53h4.56c2.45 0 4.39 1.27 4.39 3.69 0 2.43-1.94 3.7-4.39 3.7h-1.57v2.15c0 .33.2.54.55.54h1.28v1.65H9.3v-1.64zm4.43-8.7c1.62 0 2.55-.7 2.55-1.96 0-1.3-.93-2-2.55-2h-1.43v3.94h1.43z"
        fill="#1A1A2E"
      />
    </svg>
  )
})

export default PostmarkLogo
