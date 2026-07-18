# Glass — Kelowna Ski Forecast

Mobile-first, boomer-legible forecast for **glassy water** on Okanagan Lake.

Retro Nautique / Kelowna ski-boat vibe. Big **GO SKI / MAYBE / SKIP**. Installable as a PWA.

## Run locally

```bash
npm install
npm run build:fetch
npm run dev
```

## Install on your phone (PWA)

1. Deploy (below) or open the site in Safari / Chrome.
2. **iPhone:** Share → **Add to Home Screen**.
3. **Android:** Menu → **Install app**.

## Deploy to GitHub Pages

1. Push this repo to GitHub.
2. **Settings → Pages → Source: GitHub Actions**.
3. Push to `main` (or run the workflow manually).
4. Open `https://<you>.github.io/<repo-name>/`.

The workflow sets `BASE_PATH` automatically from the repo name.

## How to read it

| Answer | Meaning |
| --- | --- |
| **GO SKI** | Calm enough |
| **MAYBE** | Possible — check Best time |
| **SKIP** | Too windy / choppy |
| **Score 0–100** | Higher = glassier |

## Tunable thresholds

Edit `skiThresholds` in [`src/config.ts`](src/config.ts).

## Data

[Open-Meteo](https://open-meteo.com/) winds (CC BY 4.0). Lake shoreline from OSM relation 2903374.
