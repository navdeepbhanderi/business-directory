'use client'

import * as SwitchPrimitive from '@radix-ui/react-switch'
import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

export function Switch({ className, ...props }: ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      className={cn(
        'peer rounded-pill inline-flex h-6 w-11 shrink-0 cursor-pointer items-center border-2 border-transparent',
        'transition-colors duration-(--duration-hover)',
        'data-[state=checked]:bg-accent data-[state=unchecked]:bg-line-strong',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        className={cn(
          'rounded-pill bg-surface shadow-card pointer-events-none block size-5 ring-0',
          'transition-transform duration-(--duration-hover)',
          'data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0',
          'rtl:data-[state=checked]:-translate-x-5',
        )}
      />
    </SwitchPrimitive.Root>
  )
}
