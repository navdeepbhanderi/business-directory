'use client'

import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { cva, type VariantProps } from 'class-variance-authority'
import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

/**
 * Edge-anchored panel. Used for mobile navigation and the filter drawer.
 *
 * Sides are logical (`start`/`end`), not physical, so the panel enters from the
 * correct edge in a right-to-left locale without a second implementation.
 */
const sheetVariants = cva(
  'fixed z-50 flex flex-col gap-4 bg-surface shadow-float duration-(--duration-overlay) ' +
    'data-[state=open]:animate-in data-[state=closed]:animate-out',
  {
    variants: {
      side: {
        start:
          'inset-y-0 start-0 h-full w-3/4 max-w-sm border-e border-line ' +
          'data-[state=open]:slide-in-from-left data-[state=closed]:slide-out-to-left ' +
          'rtl:data-[state=open]:slide-in-from-right rtl:data-[state=closed]:slide-out-to-right',
        end:
          'inset-y-0 end-0 h-full w-3/4 max-w-sm border-s border-line ' +
          'data-[state=open]:slide-in-from-right data-[state=closed]:slide-out-to-right ' +
          'rtl:data-[state=open]:slide-in-from-left rtl:data-[state=closed]:slide-out-to-left',
        bottom:
          'inset-x-0 bottom-0 max-h-[85dvh] rounded-t-card border-t border-line ' +
          'data-[state=open]:slide-in-from-bottom data-[state=closed]:slide-out-to-bottom',
      },
    },
    defaultVariants: { side: 'start' },
  },
)

export const Sheet = DialogPrimitive.Root
export const SheetTrigger = DialogPrimitive.Trigger
export const SheetClose = DialogPrimitive.Close

export function SheetContent({
  className,
  children,
  side,
  ...props
}: ComponentProps<typeof DialogPrimitive.Content> & VariantProps<typeof sheetVariants>) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay
        className={cn(
          'bg-ink/40 fixed inset-0 z-50 backdrop-blur-[2px]',
          'data-[state=open]:animate-in data-[state=open]:fade-in-0',
          'data-[state=closed]:animate-out data-[state=closed]:fade-out-0',
        )}
      />
      <DialogPrimitive.Content className={cn(sheetVariants({ side }), className)} {...props}>
        {children}
        <DialogPrimitive.Close
          className="rounded-control text-ink-muted hover:bg-surface-sunken hover:text-ink absolute end-4 top-4 p-1 transition-colors duration-(--duration-hover)"
          aria-label="Close"
        >
          <X className="size-4" />
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  )
}

export function SheetHeader({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div className={cn('border-line flex flex-col gap-1 border-b p-5', className)} {...props} />
  )
}

export function SheetTitle({ className, ...props }: ComponentProps<typeof DialogPrimitive.Title>) {
  return <DialogPrimitive.Title className={cn('text-lg', className)} {...props} />
}

export function SheetDescription({
  className,
  ...props
}: ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description className={cn('text-ink-muted text-sm', className)} {...props} />
  )
}
