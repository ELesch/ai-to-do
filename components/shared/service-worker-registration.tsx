/**
 * Service Worker Registration Component
 * Registers the service worker for PWA functionality
 */

'use client'

import { useEffect } from 'react'

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      // Register service worker
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('Service Worker registered:', registration.scope)

          // Check for updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (
                  newWorker.state === 'installed' &&
                  navigator.serviceWorker.controller
                ) {
                  // New content available, prompt user to refresh
                  console.log('New content available, refresh to update.')
                }
              })
            }
          })
        })
        .catch((error) => {
          console.error('Service Worker registration failed:', error)
        })
    }
  }, [])

  return null
}
