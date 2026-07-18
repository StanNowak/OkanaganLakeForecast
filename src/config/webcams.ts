export type Webcam = {
  id: string
  name: string
  description: string
  href: string
  /** Direct image URL that can be refreshed in-page (optional). */
  imageUrl?: string
  /** Refresh interval for still images (ms). */
  refreshMs?: number
}

/**
 * Relevant Okanagan Lake webcams for ski / sail / glassy checks.
 * Most live streams block iframes — we link out, and embed stills where available.
 */
export const webcams: Webcam[] = [
  {
    id: 'cosa',
    name: 'COSA / Kelowna Yacht Club',
    description: 'Central Okanagan Sailing Association rooftop cam — downtown waterfront.',
    href: 'https://www.cosa.bc.ca/webcam.php',
    imageUrl: 'https://www.cosa.bc.ca/davis/webcam.jpg',
    refreshMs: 60_000,
  },
  {
    id: 'kyc-global',
    name: 'Kelowna Yacht Club (live)',
    description: 'Global News live stream of the yacht club & harbour.',
    href: 'https://globalnews.ca/okanagan/live-cameras/scenic/kelowna-yacht-club/',
  },
  {
    id: 'lake-tower-kelowna',
    name: 'Okanagan Lake Tower — Kelowna',
    description: 'Wide view of the lake from the Kelowna tower cam.',
    href: 'https://globalnews.ca/okanagan/live-cameras/scenic/okanagan-lake-kelowna',
  },
  {
    id: 'west-kelowna',
    name: 'Kelowna from West Kelowna',
    description: 'Looking east across the lake toward downtown.',
    href: 'https://globalnews.ca/okanagan/live-cameras/scenic/kelowna-from-west-kelowna-estates/',
  },
  {
    id: 'eldorado',
    name: 'Eldorado Resort',
    description: 'North arm / downtown waterfront angle.',
    href: 'https://globalnews.ca/okanagan/live-cameras/scenic/eldorado-resort-kelowna',
  },
  {
    id: 'penticton-lakeside',
    name: 'Lakeside Resort — Penticton',
    description: 'South end of the lake.',
    href: 'https://globalnews.ca/okanagan/live-cameras/scenic/lakeside-resort-penticton/',
  },
  {
    id: 'penticton-yacht',
    name: 'Penticton Yacht Club',
    description: 'Castanet scenic cam at the south marina.',
    href: 'https://www.castanet.net/scenic-web-cams/camera/212/',
  },
  {
    id: 'kyc-weather',
    name: 'KYC live weather page',
    description: 'Yacht club weather + Global stream in one place.',
    href: 'https://kelownayachtclub.com/live-weather/',
  },
]
