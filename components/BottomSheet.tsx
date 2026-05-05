'use client'

import { useEffect } from 'react'

interface BottomSheetProps {
  open: boolean
  onClose: () => void
  children: React.ReactNode
  title?: string
}

export default function BottomSheet({
  open,
  onClose,
  children,
  title,
}: BottomSheetProps) {
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal>
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="absolute bottom-0 left-0 right-0 bg-zinc-900 rounded-t-3xl px-5 pt-4 pb-10 max-h-[90dvh] overflow-y-auto">
        <div className="w-9 h-1 bg-zinc-700 rounded-full mx-auto mb-5" />
        {title && (
          <h2 className="text-white font-bold text-lg mb-5">{title}</h2>
        )}
        {children}
      </div>
    </div>
  )
}
