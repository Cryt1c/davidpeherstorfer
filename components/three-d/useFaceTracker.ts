'use client'

import { useEffect } from 'react'
import type { MutableRefObject } from 'react'
import type { FaceLandmarker } from '@mediapipe/tasks-vision'

/**
 * A single sample of where the user's head is, estimated from the webcam.
 * All values are written from a rAF loop into a ref (no React re-renders).
 */
export interface FaceSample {
  /** Horizontal head position, roughly -1 (left) .. 1 (right) */
  x: number
  /** Vertical head position, roughly -1 (up) .. 1 (down) */
  y: number
  /** Apparent face width in normalized image units — proxy for distance */
  width: number
  /** Whether a face was visible in the latest frame */
  seen: boolean
  /** performance.now() of the last frame that contained a face */
  timestamp: number
}

export const emptyFaceSample = (): FaceSample => ({ x: 0, y: 0, width: 0.25, seen: false, timestamp: 0 })

// Keep in sync with the installed @mediapipe/tasks-vision version.
const WASM_BASE = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.2.2/wasm'
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task'

// Landmark indices from the MediaPipe FaceLandmarker model
const NOSE_TIP = 1
const LEFT_CHEEK = 234
const RIGHT_CHEEK = 454

const NO_FACE_DELAY_MS = 1500

interface UseFaceTrackerOptions {
  enabled: boolean
  faceRef: MutableRefObject<FaceSample>
  onStatus: (status: 'loading' | 'running' | 'no-face' | 'denied' | 'error') => void
}

/**
 * Runs the MediaPipe FaceLandmarker on a hidden webcam stream while `enabled`
 * is true and writes head-position samples into `faceRef`.
 *
 * Privacy: everything runs locally in the browser (WASM inference, no cloud
 * calls). The camera stream is stopped and the landmarker closed as soon as
 * the effect tears down (toggle off, unmount, pagehide).
 */
export function useFaceTracker({ enabled, faceRef, onStatus }: UseFaceTrackerOptions) {
  useEffect(() => {
    if (!enabled) return

    let cancelled = false
    let raf = 0
    let stream: MediaStream | undefined
    let landmarker: FaceLandmarker | undefined
    let video: HTMLVideoElement | undefined
    let lastSeenAt = 0
    let reportedStatus: string | undefined

    const report = (status: 'running' | 'no-face') => {
      if (reportedStatus !== status) {
        reportedStatus = status
        onStatus(status)
      }
    }

    const cleanup = () => {
      cancelled = true
      cancelAnimationFrame(raf)
      stream?.getTracks().forEach((track) => track.stop())
      video?.remove()
      landmarker?.close()
    }

    const start = async () => {
      onStatus('loading')

      // 1. Camera — only requested after the user explicitly opted in
      let cameraStream: MediaStream
      try {
        cameraStream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480, facingMode: 'user' },
          audio: false,
        })
      } catch (err) {
        const name = err instanceof DOMException ? err.name : ''
        onStatus(name === 'NotAllowedError' || name === 'SecurityError' ? 'denied' : 'error')
        return
      }
      if (cancelled) {
        cameraStream.getTracks().forEach((track) => track.stop())
        return
      }
      stream = cameraStream

      // 2. Lazy-load MediaPipe so it never affects the bundle for other users
      let vision: typeof import('@mediapipe/tasks-vision')
      try {
        vision = await import('@mediapipe/tasks-vision')
      } catch {
        onStatus('error')
        return
      }
      if (cancelled) return

      const fileset = await vision.FilesetResolver.forVisionTasks(WASM_BASE)
      if (cancelled) return

      const createOptions = (delegate: 'GPU' | 'CPU') => ({
        baseOptions: { modelAssetPath: MODEL_URL, delegate },
        runningMode: 'VIDEO' as const,
        numFaces: 1,
        outputFaceBlendshapes: false,
        outputFacialTransformationMatrixes: false,
      })

      try {
        landmarker = await vision.FaceLandmarker.createFromOptions(fileset, createOptions('GPU'))
      } catch {
        // Some browsers/drivers lack WebGL2 — fall back to CPU inference
        try {
          landmarker = await vision.FaceLandmarker.createFromOptions(fileset, createOptions('CPU'))
        } catch {
          onStatus('error')
          return
        }
      }
      if (cancelled) return

      // 3. Hidden video element (a detached video would not decode frames)
      video = document.createElement('video')
      video.srcObject = cameraStream
      video.muted = true
      video.playsInline = true
      video.setAttribute('aria-hidden', 'true')
      video.style.cssText =
        'position:fixed;width:2px;height:2px;opacity:0;pointer-events:none;left:-9999px;top:-9999px'
      document.body.appendChild(video)
      await video.play()
      if (cancelled) return

      // 4. Detection loop (one face, ~60fps)
      const loop = () => {
        if (cancelled) return
        raf = requestAnimationFrame(loop)
        if (document.hidden) return

        try {
          const result = landmarker!.detectForVideo(video!, performance.now())
          const landmarks = result.faceLandmarks?.[0]
          const now = performance.now()
          if (landmarks && landmarks.length > RIGHT_CHEEK) {
            const nose = landmarks[NOSE_TIP]
            const cheekDist = Math.abs(landmarks[RIGHT_CHEEK].x - landmarks[LEFT_CHEEK].x)
            // The front camera image is a mirror of the user: moving right in
            // the real world decreases x in the raw frame, hence the inversion.
            faceRef.current = {
              x: (0.5 - nose.x) * 2,
              y: (0.5 - nose.y) * 2,
              width: cheekDist,
              seen: true,
              timestamp: now,
            }
            lastSeenAt = now
            report('running')
          } else {
            faceRef.current = { ...faceRef.current, seen: false }
            if (now - lastSeenAt > NO_FACE_DELAY_MS) report('no-face')
          }
        } catch {
          // Transient GPU/detector hiccup — keep the loop alive
        }
      }
      raf = requestAnimationFrame(loop)
      onStatus('running')
    }

    start()

    // Also stop the camera when the tab is being closed/navigated away
    const onPageHide = () => cleanup()
    window.addEventListener('pagehide', onPageHide)

    return () => {
      window.removeEventListener('pagehide', onPageHide)
      cleanup()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled])
}
