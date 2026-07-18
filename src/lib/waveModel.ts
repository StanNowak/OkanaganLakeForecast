import { G, KN_TO_MS } from '../config'

export type WaveState = {
  /** Significant wave height (m) */
  hsM: number
  /** Peak period (s) */
  tpS: number
  /** Wavelength (m) */
  wavelengthM: number
  /** Steepness Hs/L */
  steepness: number
  /** Whitecap coverage fraction 0-1 */
  whitecapFraction: number
  /** True when wind exceeds whitecap onset */
  whitecaps: boolean
  /** Whether seas are fully developed (fetch no longer limiting) */
  fullyDeveloped: boolean
}

const FULLY_DEV_HS = 0.243 // g*Hs/U^2
const FULLY_DEV_TP = 8.13 // g*Tp/U
const WHITECAP_ONSET_MS = 3.5

/**
 * Fetch-limited deep-water wave growth (CEM / JONSWAP-style).
 * U in m/s, F in metres.
 */
export function computeWaves(windMs: number, fetchM: number): WaveState {
  const U = Math.max(windMs, 0.05)
  const F = Math.max(fetchM, 1)

  const chi = (G * F) / (U * U)

  // Fetch-limited Hs, capped at fully developed
  let hs = 0.0016 * Math.sqrt(chi) * ((U * U) / G)
  const hsFully = (FULLY_DEV_HS * U * U) / G
  const fullyDeveloped = hs >= hsFully
  hs = Math.min(hs, hsFully)

  // Peak period, capped
  let tp = 0.286 * Math.pow(chi, 1 / 3) * (U / G)
  const tpFully = (FULLY_DEV_TP * U) / G
  tp = Math.min(tp, tpFully)
  tp = Math.max(tp, 0.5)

  const wavelength = (G * tp * tp) / (2 * Math.PI)
  const steepness = wavelength > 0 ? hs / wavelength : 0

  // Monahan whitecap coverage; onset ~3.5 m/s
  const whitecaps = U >= WHITECAP_ONSET_MS
  const whitecapFraction = whitecaps
    ? Math.min(1, 3.84e-6 * Math.pow(U, 3.41))
    : 0

  return {
    hsM: hs,
    tpS: tp,
    wavelengthM: wavelength,
    steepness,
    whitecapFraction,
    whitecaps,
    fullyDeveloped,
  }
}

export function knotsToMs(kn: number): number {
  return kn * KN_TO_MS
}

export function computeWavesFromKnots(windKn: number, fetchM: number): WaveState {
  return computeWaves(knotsToMs(windKn), fetchM)
}
