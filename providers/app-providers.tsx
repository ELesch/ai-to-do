/**
 * App Providers
 * Client-side wrapper that provides all context providers
 */

'use client'

import { type FC, type ReactNode } from 'react'
import { SessionProvider } from 'next-auth/react'
import { KeyboardProvider } from './keyboard-provider'
import { ThemeProvider } from './theme-provider'

interface AppProvidersProps {
  children: ReactNode
}

/**
 * Combines all client-side providers into a single wrapper
 */
export const AppProviders: FC<AppProvidersProps> = ({ children }) => {
  return (
    <ThemeProvider>
      <SessionProvider>
        <KeyboardProvider>{children}</KeyboardProvider>
      </SessionProvider>
    </ThemeProvider>
  )
}
