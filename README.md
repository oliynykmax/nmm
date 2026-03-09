# Numerical Methods Mirror

A clean, well-designed mirror of LUT University's Numerical Methods course page (BM20A1502).

**Live site:** https://kort.github.io/numerical-methods-mirror

## Features

- Fetches content live from the original course page on every visit
- Filters out rickroll links and shows them as "Coming soon"
- Bilingual support (Finnish / English toggle)
- Manual refresh button to re-fetch latest content
- Clean, minimalist academic design

## Development

```bash
# Install dependencies
bun install

# Start dev server with hot reload
bun run dev
```

Then open http://localhost:3000

## Build & Deploy

```bash
# Build for production (outputs to /dist)
bun run build
```

The `dist/` folder is served by GitHub Pages. To update:

1. Make changes
2. Run `bun run build`
3. Commit and push to `main`
4. GitHub Pages will automatically serve from `/dist`

## Tech Stack

- **Runtime:** Bun
- **Frontend:** React 19
- **Styling:** Plain CSS with CSS variables
- **Fonts:** Libre Baskerville (headings), Source Sans 3 (body)
- **Hosting:** GitHub Pages (static)

## How It Works

The app fetches the original course page client-side using the Fetch API. Since GitHub Pages sets `Access-Control-Allow-Origin: *`, CORS is not an issue. The HTML is parsed using DOMParser, rickroll links are detected and filtered, and the clean data is rendered in a modern UI.
