export type Zone = {
  id: string
  name: string
  description: string
  lat: number
  lon: number
}

/** Tunable ski-score thresholds — adjust after ground-truthing real ski mornings. */
export const skiThresholds = {
  /** Hs (m) where waveTerm hits ~0 */
  waveHeightRefM: 0.2,
  waveExponent: 1.2,
  /** Wind (kn): full credit below calmMax, zero by windZero */
  calmMaxKn: 5,
  windZeroKn: 15,
  /** Gust-lull spread (kn) before gustTerm starts decaying */
  gustSpreadOkKn: 5,
  gustSpreadZeroKn: 15,
  /** Whitecap onset (~7 kn ≈ 3.5 m/s) */
  whitecapOnsetKn: 7,
  /** Score considered "glassy" for P(glassy) */
  glassyScore: 80,
  /** Minimum score for a usable ski window hour */
  windowScoreMin: 70,
  /** Minimum confidence (0-1) for a usable ski window hour */
  windowConfidenceMin: 0.45,
  morningHours: { start: 6, end: 11 },
  afternoonHours: { start: 12, end: 18 },
} as const

export const deterministicModels = [
  'gem_hrdps_continental',
  'gem_seamless',
  'ecmwf_ifs025',
  'gfs_seamless',
  'icon_seamless',
] as const

export type DeterministicModel = (typeof deterministicModels)[number]

export const ensembleModels = ['gfs025', 'gem_global'] as const

export type EnsembleModel = (typeof ensembleModels)[number]

export const openMeteo = {
  forecastUrl: 'https://api.open-meteo.com/v1/forecast',
  ensembleUrl: 'https://ensemble-api.open-meteo.com/v1/ensemble',
  timezone: 'America/Vancouver',
  windSpeedUnit: 'kn' as const,
  forecastDays: 7,
  pastDays: 2,
}

export const fetchBins = {
  count: 36,
  stepDeg: 10,
} as const

/** Named ski zones on Okanagan Lake near Kelowna. */
export const zones: Zone[] = [
  {
    id: 'south-arm-elbow',
    name: 'South Arm / Elbow',
    description: 'South lake toward Okanagan Mountain — SW/NE shoreline',
    lat: 49.82,
    lon: -119.55,
  },
  {
    id: 'bennett-bridge',
    name: 'W.R. Bennett Bridge',
    description: 'Near the bridge pinch — fetch flips with direction',
    lat: 49.875,
    lon: -119.52,
  },
  {
    id: 'kelowna-waterfront',
    name: 'Kelowna Waterfront',
    description: 'North arm / downtown — lake runs roughly N–S',
    lat: 49.888,
    lon: -119.504,
  },
]

export const defaultZoneId = 'south-arm-elbow'

/** YLW airport for optional METAR-style actuals cross-check. */
export const ylwStation = {
  name: 'Kelowna Airport (YLW)',
  lat: 49.9561,
  lon: -119.3778,
}

export const KN_TO_MS = 0.514444
export const MS_TO_KN = 1 / KN_TO_MS
export const G = 9.81
