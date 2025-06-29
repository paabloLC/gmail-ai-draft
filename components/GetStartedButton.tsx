'use client'

import { signIn } from "next-auth/react"
import { useState } from "react"

interface GetStartedButtonProps {
  className?: string
  children: React.ReactNode
  variant?: 'header' | 'hero' | 'cta'
}

export default function GetStartedButton({ className, children, variant = 'header' }: GetStartedButtonProps) {
  const [showTooltip, setShowTooltip] = useState(false)
  
  // Check if we're in demo mode
  const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true'

  const handleClick = (e: React.MouseEvent) => {
    if (isDemoMode) {
      e.preventDefault()
      setShowTooltip(true)
      setTimeout(() => setShowTooltip(false), 3000)
      return
    }
    signIn("google")
  }

  return (
    <div className="relative inline-block">
      <button
        onClick={handleClick}
        className={className}
      >
        {children}
      </button>
      
      {/* Demo mode tooltip */}
      {isDemoMode && showTooltip && (
        <div className="absolute z-50 px-3 py-2 text-sm text-white bg-gray-900 rounded-lg shadow-lg whitespace-nowrap top-full mt-2 left-1/2 transform -translate-x-1/2">
          <div className="absolute w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[6px] border-b-gray-900 left-1/2 transform -translate-x-1/2 -top-1.5"></div>
          This is a demo. Authentication is disabled.
        </div>
      )}
    </div>
  )
}