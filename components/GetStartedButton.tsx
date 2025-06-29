'use client'

import { signIn } from "next-auth/react"

interface GetStartedButtonProps {
  className?: string
  children: React.ReactNode
  variant?: 'header' | 'hero' | 'cta'
}

export default function GetStartedButton({ className, children, variant = 'header' }: GetStartedButtonProps) {
  // Check if we're in demo mode
  const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true'

  const handleClick = (e: React.MouseEvent) => {
    if (isDemoMode) {
      e.preventDefault()
      return
    }
    signIn("google")
  }

  // Add disabled styling when in demo mode
  const buttonClassName = isDemoMode 
    ? `${className} opacity-60 cursor-not-allowed`
    : className

  return (
    <button
      onClick={handleClick}
      className={buttonClassName}
      disabled={isDemoMode}
    >
      {children}
    </button>
  )
}