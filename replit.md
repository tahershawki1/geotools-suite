# GeoTools Survey Suite

A browser-based surveying application providing coordinate conversion, file handling, and area calculation tools. Runs entirely client-side with no backend.

## Tech Stack

- **Languages:** HTML5, CSS3, Vanilla JavaScript (ES6+)
- **Mapping:** Leaflet.js (v1.9.4)
- **Projections:** Proj4js (v2.11.0)
- **Other libs:** Ace Editor, SheetJS, PDF.js (all bundled locally in `docs/vendor/`)
- **Build system:** None — pure static files

## Project Layout

```
docs/           # Web root (served directly)
  index.html    # Main dashboard
  pages/        # Individual tool pages
  shared/       # Reusable JS/CSS components
  vendor/       # Bundled third-party libraries
  service-worker.js
README.md
```

## Running Locally

The workflow uses Python's built-in HTTP server:

```
python3 -m http.server 5000 --directory docs --bind 0.0.0.0
```

## Deployment

Configured as a **static** deployment with `publicDir: "docs"`.
