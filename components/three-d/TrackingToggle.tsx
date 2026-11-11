'use client'

import { useTracking } from '@/components/three-d/tracking-context'
import type { TrackingMode } from '@/components/three-d/tracking-context'

const NEXT_MODE: Record<TrackingMode, TrackingMode> = {
  off: 'mouse',
  mouse: 'eye',
  eye: 'off',
}

const LABELS: Record<TrackingMode, string> = {
  off: '3D effect off — click for pointer parallax',
  mouse: '3D pointer parallax on — click for eye tracking',
  eye: '3D eye tracking on — click to turn off',
}

export default function TrackingToggle() {
  const { mode, setMode } = useTracking()

  const label = LABELS[mode]

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={() => setMode(NEXT_MODE[mode])}
      className="w-8 h-8 py-1 ml-1 mr-1 rounded cursor-pointer"
    >
      {mode === 'eye' ? (
        // Eye icon
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          className="text-primary-500 w-5 h-5 mx-auto"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
          />
        </svg>
      ) : (
        // Layered planes icon (3D depth)
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          className={`w-5 h-5 mx-auto ${
            mode === 'mouse' ? 'text-primary-500' : 'text-gray-400 dark:text-gray-500'
          }`}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3l9 5-9 5-9-5 9-5z" />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            className={mode === 'mouse' ? '' : 'opacity-40'}
            d="M3 13l9 5 9-5"
          />
        </svg>
      )}
    </button>
  )
}
