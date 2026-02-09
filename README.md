# GeoTools Survey Suite v1.0.0

> A comprehensive browser-based surveying and coordinate tools suite with professional UI, accessibility, and dark mode support.

---

## 🎯 Overview

GeoTools Survey Suite is a modern, accessible, browser-based application for surveying professionals. It provides 5 powerful tools for coordinate conversion, file handling, and area calculation — all running locally without installation.

### Tools Included

| Tool | Description | Page |
|------|-------------|------|
| 🏠 **Dashboard** | Central hub with quick access to all tools | `index.html` |
| 📄 **File Converter** | Convert CSV/TXT/SDR files with map display | `pages/file-converter.html` |
| 🔄 **Dubai Converter** | DLTM ↔ WGS84 coordinate conversion (single & batch) | `pages/dltm-converter.html` |
| 🌍 **Coordinate Transform** | WGS84 ↔ UTM coordinate transformation | `pages/coordinate-transform.html` |
| 📐 **Area Calculator** | Polygon area & perimeter calculation with map | `pages/area-calculator.html` |

---

## 🚀 Quick Start

### Requirements
- Modern web browser (Chrome, Firefox, Safari, Edge)
- Python 3.6+ or any static file server

### Run Locally

**Option 1: Python (Recommended)**
```bash
cd geotools-suite
python -m http.server 8000
```
Open: **http://localhost:8000/docs/**

**Option 2: Node.js**
```bash
cd geotools-suite/docs
npx http-server
```

**Option 3: VS Code Live Server**
1. Install "Live Server" extension
2. Right-click `docs/index.html`
3. Select "Open with Live Server"

---

## 📁 Project Structure

```
geotools-suite/
|-- README.md                      # This file
|-- docs/
|   |-- index.html                 # Dashboard (LTR)
|   |-- pages/
|   |   |-- file-converter.html     # File Converter (LTR)
|   |   |-- dltm-converter.html     # Dubai DLTM Converter (RTL)
|   |   |-- coordinate-transform.html # Coordinate Transform (RTL)
|   |   |-- area-calculator.html    # Area Calculator (RTL)
|   |   |-- css/
|   |   |   |-- file-converter.css
|   |   |   |-- dltm-converter.css
|   |   |   |-- coordinate-transform.css
|   |   |   `-- area-calculator.css
|   |   `-- js/
|   |       |-- converter-export.js        # Export modal logic (File Converter)
|   |       |-- file-converter.js
|   |       |-- dltm-converter.js
|   |       |-- coordinate-transform.js
|   |       `-- area-calculator.js
|   |-- shared/
|   |   |-- navbar.html             # Unified navigation bar component
|   |   |-- footer.html             # Unified footer component
|   |   |-- css/
|   |   |   |-- navbar.css
|   |   |   `-- footer.css
|   |   `-- js/
|   |       |-- navbar-loader.js           # Auto-loads navbar on all pages
|   |       |-- footer-loader.js           # Auto-loads footer on all pages
|   |       |-- keyboard-navigation.js     # Keyboard accessibility module
|   |       |-- notification-system.js     # Toast notification system
|   |       |-- app-shell.js               # SPA loader for index.html
|   |       |-- theme.js                   # Dark mode & theme management
|   |       `-- service-worker.js          # Service worker logic
|   |-- styles.css                 # Global styles & CSS variables
|   |-- service-worker.js          # Service worker bootstrap (keeps scope at /docs/)
|   |-- sample_batch.csv           # Sample data for batch testing
|   `-- vendor/
|       |-- proj4.js               # Proj4js library (local)
|       `-- leaflet/
|           |-- leaflet.js
|           `-- leaflet.css
```





---

## ✨ Features

### Core Features
- ✅ **Unified Navigation** — Consistent navbar & footer across all pages
- ✅ **Dark Mode** — Toggle with localStorage persistence
- ✅ **Keyboard Accessible** — Full keyboard navigation (WCAG AA)
- ✅ **Toast Notifications** — 4 types (success, error, warning, info)
- ✅ **Page Indicators** — Active page highlighted in navbar
- ✅ **Responsive Design** — Works on desktop, tablet, and mobile
- ✅ **Offline Capable** — Works without internet (except base maps)

### Accessibility (WCAG AA)
- ✅ ARIA labels on all interactive elements
- ✅ Keyboard navigation (Tab, Arrow keys, Home/End)
- ✅ Skip-to-content link
- ✅ Focus indicators (2px outline)
- ✅ Screen reader support (ARIA live regions)
- ✅ 4.5:1 color contrast ratio
- ✅ Alt+H keyboard shortcut (jump to home)

### Technologies
- **Leaflet.js** v1.9.4 — Interactive mapping
- **Proj4js** v2.11.0 — Coordinate projection
- **CSS Variables** — Dynamic theming
- **localStorage** — User preference persistence

---

## 🔧 Developer Guide

### Adding a New Page

1. Create your HTML file in `docs/pages/`
2. Add these script tags in `<head>`:
```html
<script src="./shared/js/navbar-loader.js"></script>
<script src="./shared/js/footer-loader.js"></script>
<script src="./shared/js/keyboard-navigation.js"></script>
<script src="./shared/js/notification-system.js"></script>
```
3. Use CSS variables for consistent styling
4. Add navigation button in `shared/navbar.html`

### Using Notifications
```javascript
showSuccess("File uploaded!", "Success", 5000);
showError("Invalid coordinates", "Error", 7000);
showWarning("Check your input", "Warning");
showInfo("Processing...", "Status", 0);  // 0 = no auto-dismiss
```

### Keyboard Shortcuts
| Key | Action |
|-----|--------|
| `Tab` | Navigate through interactive elements |
| `→` Arrow Right | Next navbar/footer button |
| `←` Arrow Left | Previous navbar/footer button |
| `Home` | First button |
| `End` | Last button |
| `Alt+H` | Jump to home page |
| `Enter/Space` | Activate focused button |

---

## 🐛 Troubleshooting

### Map Not Displaying?
1. Open DevTools (`F12`) → Console tab
2. Check for JavaScript errors
3. Verify `vendor/leaflet/leaflet.js` path exists

### Coordinate Conversion Not Working?
- Verify Proj4js is loaded
- Use decimal format: `25.2048` (not DMS)
- Check coordinate ranges are valid

### Dark Mode Not Persisting?
- Ensure localStorage is enabled in browser
- Clear browser cache and retry
- Check `shared/js/theme.js` is loaded

### Navbar/Footer Missing?
- Check browser console for fetch errors
- Verify `shared/navbar.html` and `shared/footer.html` exist
- Ensure loader scripts are included in correct order

---

## 📊 Recent Updates (February 2026)

### v1.0.0 — Major Enhancement Release
- ✅ Unified navbar & footer across all pages
- ✅ Full keyboard accessibility (WCAG AA)
- ✅ Dark mode with smooth transitions
- ✅ Toast notification system (4 types)
- ✅ Page indicator system
- ✅ Enhanced loader animation
- ✅ Skip-to-content accessibility link
- ✅ ARIA labels & live regions
- ✅ Responsive mobile design
- ✅ Comprehensive documentation

### Previous Fixes
- ✅ Unified Leaflet loading (local copy only)
- ✅ Removed duplicate library loading
- ✅ Improved script execution (replaced eval)
- ✅ Enhanced DOM cleanup on navigation
- ✅ Better error handling & logging

---

## 📚 Documentation

| Document | Purpose |
|----------|---------|
| [ENHANCEMENT_PLAN.md](ENHANCEMENT_PLAN.md) | 7-phase project plan |
| [IMPLEMENTATION_GUIDE.md](IMPLEMENTATION_GUIDE.md) | Complete implementation guide |
| [QUALITY_ASSURANCE_REPORT.md](QUALITY_ASSURANCE_REPORT.md) | Code quality & QA report |
| [PROJECT_COMPLETION_SUMMARY.md](PROJECT_COMPLETION_SUMMARY.md) | Final project summary |

---

## 📄 License

All rights reserved © 2026 GeoTools Survey Suite

---

**Last Updated:** February 7, 2026 | **Version:** 1.0.0 | **Status:** ✅ Production Ready

