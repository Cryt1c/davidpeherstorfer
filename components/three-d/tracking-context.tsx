'use client'

import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'

/**
 * Modes for the 3D illusion:
 * - 'off':   no 3D effect, scene is static
 * - 'mouse': parallax driven by the pointer position
 * - 'eye':   parallax driven by head/eye position from the webcam
 *            (camera only starts after the user explicitly opted in)
 */
export type TrackingMode = 'off' | 'mouse' | 'eye'

export type EyeStatus = 'idle' | 'loading' | 'running' | 'no-face' | 'denied' | 'error'

interface TrackingContextValue {
  mode: TrackingMode
  setMode: (mode: TrackingMode) => void
  eyeStatus: EyeStatus
  setEyeStatus: (status: EyeStatus) => void
}

const TrackingContext = createContext<TrackingContextValue | null>(null)

const STORAGE_KEY = 'dp-3d-tracking-mode'

export function TrackingProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<TrackingMode>('off')
  const [eyeStatus, setEyeStatus] = useState<EyeStatus>('idle')

  // Restore persisted preference after hydration (avoids SSR mismatch)
  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (stored === 'mouse' || stored === 'eye') setModeState(stored)
  }, [])

  const setMode = useCallback((next: TrackingMode) => {
    setModeState(next)
    if (next === 'eye') setEyeStatus('loading')
    else setEyeStatus('idle')
    try {
      window.localStorage.setItem(STORAGE_KEY, next)
    } catch {
      /* storage unavailable (private mode etc.) — feature still works, just not persisted */
    }
  }, [])

  return (
    <TrackingContext.Provider value={{ mode, setMode, eyeStatus, setEyeStatus }}>
      {children}
    </TrackingContext.Provider>
  )
}

export function useTracking(): TrackingContextValue {
  const ctx = useContext(TrackingContext)
  if (!ctx) throw new Error('useTracking must be used within TrackingProvider')
  return ctx
}
