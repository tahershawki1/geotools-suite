# GeoTools Survey Suite

A professional browser-based mobile app for surveying tools — coordinate conversion, file handling, and area calculation. Designed for deployment inside an Android APK via WebView.

## Design

Dark professional mobile app UI with:
- Deep navy dark theme (`#060c18` → `#0d1624`)
- Cyan/teal primary (`#06b6d4`) + indigo accent (`#818cf8`)
- Phone-frame container (430×880px, full-screen on mobile)
- Bottom tab navigation (Home, Coords, Files, Area, More)
- 2-column gradient tool card grid
- "More" slide-up drawer for additional tools
- Hero header with stats, quick-filter chips

## Tech Stack

- **Languages:** HTML5, CSS3, Vanilla JavaScript (ES6+)
- **Mapping:** Leaflet.js (v1.9.4)
- **Projections:** Proj4js (v2.11.0)
- **Libraries:** Ace Editor, SheetJS, PDF.js (all local in `docs/vendor/`)
- **Build:** None — pure static files

## Project Layout

```
docs/
  index.html              Main app shell / dashboard
  styles.css              Mobile app dashboard layout
  shared/
    css/
      theme.css           Dark color system + global component styles
      navbar.css          Phone frame, header, bottom nav, more drawer
    js/
      tools-registry.js   Single source of truth for tools metadata
      navbar-loader.js    Builds bottom tab nav + "More" drawer
      dashboard.js        Renders 2-column tool card grid
      app-shell.js        SPA navigation (loadPage, updatePageIndicator)
  pages/                  Individual tool pages (loaded via SPA)
  vendor/                 Bundled third-party libraries
```

## Running

```
python3 -m http.server 5000 --directory docs --bind 0.0.0.0
```

## Deployment

Static site — `publicDir: "docs"`.
