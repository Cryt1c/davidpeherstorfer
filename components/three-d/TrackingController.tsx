'use client'

import { useEffect, useRef } from 'react'
import { useTracking } from './tracking-context'
import { emptyFaceSample, useFaceTracker } from './useFaceTracker'
import type { FaceSample } from './useFaceTracker'

/**
 * Reads the scene CSS variables that the `.depth-*` utilities consume.
 * Written on <html> so every layer anywhere in the tree reacts to them.
 *   --px    normalized horizontal head/pointer position (-1 .. 1)
 *   --py    normalized vertical head/pointer position   (-1 .. 1)
 *   --pzoom lean-in factor derived from apparent face size
 */
const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))

const CALIBRATION_KEY = 'dp-3d-calibration'
/** Assumed head-position range when no calibration data exists yet */
const DEFAULT_RANGE = { minX: -0.3, maxX: 0.3, minY: -0.25, maxY: 0.25 }
/** Typical apparent face width at a comfortable viewing distance */
const NOMINAL_FACE_WIDTH = 0.28

interface Calibration {
  minX: number
  maxX: number
  minY: number
  maxY: number
}

const loadCalibration = (): Calibration => {
  try {
    const raw = window.localStorage.getItem(CALIBRATION_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Calibration
      if (
        typeof parsed.minX === 'number' &&
        typeof parsed.maxX === 'number' &&
        typeof parsed.minY === 'number' &&
        typeof parsed.maxY === 'number'
      ) {
        return parsed
      }
    }
  } catch {
    /* fall back to defaults */
  }
  return { ...DEFAULT_RANGE }
}

/** Maps a raw value into -1..1 given the calibrated range (clamped) */
const normalize = (v: number, min: number, max: number) => {
  const mid = (min + max) / 2
  const half = Math.max((max - min) / 2, 0.02)
  return clamp((v - mid) / half, -1, 1)
}

export default function TrackingController() {
  const { mode, setMode, eyeStatus, setEyeStatus } = useTracking()
  const faceRef = useRef<FaceSample>(emptyFaceSample())
  const mouseTarget = useRef({ x: 0, y: 0 })
  const eyeStatusRef = useRef(eyeStatus)
  eyeStatusRef.current = eyeStatus

  useFaceTracker({
    enabled: mode === 'eye',
    faceRef,
    onStatus: setEyeStatus,
  })

  // Pointer tracking — always active unless fully off. It powers the 'mouse'
  // mode and is the automatic fallback when the camera is denied or fails.
  useEffect(() => {
    if (mode === 'off') return
    const onMouseMove = (e: MouseEvent) => {
      mouseTarget.current = {
        x: (e.clientX / window.innerWidth - 0.5) * 2,
        y: (e.clientY / window.innerHeight - 0.5) * 2,
      }
    }
    window.addEventListener('mousemove', onMouseMove, { passive: true })
    return () => window.removeEventListener('mousemove', onMouseMove)
  }, [mode])

  // Main animation loop: pick a target (eye > pointer), smooth toward it and
  // publish the CSS variables. One rAF loop for the whole page, no React
  // re-renders.
  useEffect(() => {
    if (mode === 'off') return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const root = document.documentElement
    const calib = loadCalibration()
    let current = { x: 0, y: 0, zoom: 0 }
    let raf = 0
    let lastPersist = performance.now()

    const loop = () => {
      raf = requestAnimationFrame(loop)
      if (document.hidden) return

      const status = eyeStatusRef.current
      const useEye = mode === 'eye' && (status === 'running' || status === 'loading' || status === 'no-face')

      let tx = 0
      let ty = 0
      let tzoom = 0

      if (useEye) {
        const face = faceRef.current
        const fresh = face.seen && performance.now() - face.timestamp < 500
        if (fresh) {
          // Auto-calibration: grow the observed range so the effect uses the
          // user's actual range of motion, then gently relax back toward the
          // defaults so stale extremes fade out.
          const RELAX = 0.0005
          calib.minX = face.x < calib.minX ? face.x : calib.minX + (DEFAULT_RANGE.minX - calib.minX) * RELAX
          calib.maxX = face.x > calib.maxX ? face.x : calib.maxX + (DEFAULT_RANGE.maxX - calib.maxX) * RELAX
          calib.minY = face.y < calib.minY ? face.y : calib.minY + (DEFAULT_RANGE.minY - calib.minY) * RELAX
          calib.maxY = face.y > calib.maxY ? face.y : calib.maxY + (DEFAULT_RANGE.maxY - calib.maxY) * RELAX

          tx = normalize(face.x, calib.minX, calib.maxX)
          ty = normalize(face.y, calib.minY, calib.maxY)

          // Lean-in: moving closer to the camera amplifies the scene slightly
          tzoom = clamp((face.width / NOMINAL_FACE_WIDTH - 1) * 0.5, -0.3, 0.6)

          if (performance.now() - lastPersist > 5000) {
            lastPersist = performance.now()
            try {
              window.localStorage.setItem(CALIBRATION_KEY, JSON.stringify(calib))
            } catch {
              /* non-fatal */
            }
          }
        } else {
          // Face lost — drift back to the neutral position
          tx = 0
          ty = 0
          tzoom = 0
        }
      } else {
        tx = mouseTarget.current.x
        ty = mouseTarget.current.y
      }

      const smoothing = useEye ? 0.09 : 0.06
      current.x += (tx - current.x) * smoothing
      current.y += (ty - current.y) * smoothing
      current.zoom += (tzoom - current.zoom) * 0.05

      root.style.setProperty('--px', current.x.toFixed(3))
      root.style.setProperty('--py', current.y.toFixed(3))
      root.style.setProperty('--pzoom', current.zoom.toFixed(3))
    }

    raf = requestAnimationFrame(loop)
    return () => {
      cancelAnimationFrame(raf)
      root.style.setProperty('--px', '0')
      root.style.setProperty('--py', '0')
      root.style.setProperty('--pzoom', '0')
    }
  }, [mode])

  // If the camera is denied or fails, stay useful: silently fall back to
  // pointer parallax (the loop already prefers the pointer in that case).
  useEffect(() => {
    if (mode === 'eye' && (eyeStatus === 'denied' || eyeStatus === 'error')) {
      const t = setTimeout(() => setMode('mouse'), 4000)
      return () => clearTimeout(t)
    }
  }, [mode, eyeStatus, setMode])

  return (
    <>
      {/* Decorative background layer — the "far plane" of the 3D scene */}
      <div aria-hidden className="scene-background depth-far" />
      {/* Camera status indicator for eye-tracking mode */}
      {mode === 'eye' && <CameraIndicator status={eyeStatus} />}
    </>
  )
}

function CameraIndicator({ status }: { status: string }) {
  if (status === 'idle' || status === 'loading' || status === 'running' || status === 'no-face') {
    const label =
      status === 'loading'
        ? '3D eye tracking — starting camera…'
        : status === 'no-face'
          ? '3D eye tracking — no face detected'
          : '3D eye tracking active — camera runs locally'
    return (
      <div
        role="status"
        className="scene-camera-indicator"
        aria-live="polite"
      >
        <span
          className={`scene-camera-dot ${
            status === 'running' ? 'animate-pulse' : 'scene-camera-dot--warn'
          }`}
        />
        {label}
      </div>
    )
  }
  // denied / error: the mode auto-falls back to pointer parallax
  return (
    <div role="status" className="scene-camera-indicator scene-camera-indicator--warn">
      <span className="scene-camera-dot scene-camera-dot--warn" />
      Camera unavailable — using pointer parallax instead
    </div>
  )
}
