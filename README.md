# GeoTools Survey Suite v1.0.0

> A comprehensive browser-based surveying and coordinate tools suite with professional UI, accessibility, and dark mode support.

**[English](README.md)** | [العربية](README.ar.md)

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
- Python 3.6+ or Node.js 14+ or any static file server

### Run Locally

**Option 1: Python (Recommended)**
```bash
cd geotools-suite
python -m http.server 8000
```
Open: **http://localhost:8000/docs/**

**Option 2: Node.js**
```bash
cd geotools-suite
npm start
```

**Option 3: Docker**
```bash
# Using Docker Compose
docker-compose up -d

# Or using Docker directly
docker build -t geotools-suite .
docker run -d -p 8080:80 geotools-suite
```
Open: **http://localhost:8080**

**Option 4: VS Code Live Server**
1. Install "Live Server" extension
2. Right-click `docs/index.html`
3. Select "Open with Live Server"

---

## 📁 Project Structure

```
geotools-suite/
|-- README.md                      # This file (English)
|-- README.ar.md                   # Arabic version
|-- package.json                   # Node.js configuration
|-- Dockerfile                     # Docker configuration
|-- docker-compose.yml             # Docker Compose setup
|-- LICENSE                        # MIT License
|-- CONTRIBUTING.md                # Contribution guide
|-- .github/workflows/             # GitHub Actions CI/CD
|-- docs/
|   |-- index.html                 # Dashboard (LTR/RTL support)
|   |-- sitemap.xml               # SEO sitemap
|   |-- robots.txt                # Robots file for crawlers
|   |-- pages/
|   |   |-- file-converter.html     # File Converter
|   |   |-- dltm-converter.html     # Dubai DLTM Converter
|   |   |-- coordinate-transform.html # Coordinate Transform
|   |   |-- area-calculator.html    # Area Calculator
|   |   |-- css/                   # Page-specific styles
|   |   `-- js/                    # Page-specific scripts
|   |-- shared/
|   |   |-- locales/              # Translation files (ar.json, en.json)
|   |   |-- css/                  # Shared styles
|   |   `-- js/
|   |       |-- i18n.js                   # Internationalization (i18n)
|   |       |-- navbar-loader.js          # Auto-loads navbar on all pages
|   |       |-- keyboard-navigation.js    # Keyboard accessibility module
|   |       |-- notification-system.js    # Toast notification system
|   |       |-- theme.js                  # Dark mode & theme management
|   |       `-- service-worker.js         # Service worker logic
|   |-- styles.css                 # Global styles & CSS variables
|   `-- vendor/
|       |-- proj4.js               # Proj4js library (local)
|       `-- leaflet/               # Leaflet mapping library
`-- scripts/
    |-- accessibility-test.js      # Accessibility testing script
    `-- security-check.js          # Security check script
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
- ✅ **Multilingual** — Full English and Arabic support with RTL

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

### Installing Dependencies

```bash
# Install Node.js dependencies (for dev tools)
npm install

# Start local server
npm start

# Lint code
npm run lint

# Format code
npm run format

# Test accessibility
npm run test:accessibility

# Test security
npm run test:security

# Run Lighthouse
npm run lighthouse
```

### Adding a New Page

1. Create your HTML file in `docs/pages/`
2. Add these script tags in `<head>`:
```html
<script src="./shared/js/i18n.js"></script>
<script src="./shared/js/navbar-loader.js"></script>
<script src="./shared/js/keyboard-navigation.js"></script>
<script src="./shared/js/notification-system.js"></script>
```
3. Use CSS variables for consistent styling
4. Add navigation button in `shared/navbar.html`
5. Add translations in `shared/locales/ar.json` and `en.json`

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

## 🌍 Internationalization (i18n)

The project fully supports English and Arabic languages:

- **Language Switching**: Click the language button at the top of the page
- **RTL Support**: Full right-to-left support for Arabic
- **Translations**: All text is translated in `docs/shared/locales/`
- **Preference Persistence**: Your browser remembers your preferred language

### Adding a New Language

1. Create `docs/shared/locales/{lang}.json` file
2. Add all keys with translations
3. Update `docs/shared/js/i18n.js` to support the new language
4. Test navigation and display

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
- ✅ Full English and Arabic support with i18n
- ✅ CI/CD setup with GitHub Actions
- ✅ SEO improvements (sitemap, robots.txt, meta tags)
- ✅ Docker for easy deployment
- ✅ Development tools (ESLint, Prettier, Lighthouse, axe-core)

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
| [README.md](README.md) | Main documentation (English) |
| [README.ar.md](README.ar.md) | Main documentation (Arabic) |
| [LICENSE](LICENSE) | MIT License |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Contribution guide |
| [.github/workflows/ci-cd.yml](.github/workflows/ci-cd.yml) | CI/CD setup |

---

## 🧪 Testing & Quality Assurance

### Local Testing

```bash
# Test accessibility
npm run test:accessibility

# Check security
npm run test:security

# Performance analysis
npm run lighthouse

# Code linting
npm run lint

# Audit vulnerabilities
npm audit
```

### Automated CI/CD

GitHub Actions automatically runs on every push or pull request:
- ✅ Code linting (ESLint)
- ✅ Security audit (npm audit)
- ✅ Accessibility testing (axe-core)
- ✅ Performance analysis (Lighthouse)
- ✅ Docker build
- ✅ Deploy to GitHub Pages

---

## 🚀 Deployment

### GitHub Pages (Automatic)
Automatically deployed when pushing to `main` branch via GitHub Actions.

### Docker
```bash
# Build image
docker build -t geotools-suite .

# Run container
docker run -d -p 8080:80 geotools-suite

# Using Docker Compose
docker-compose up -d
```

### Static Hosting
Upload the contents of the `docs/` folder to any static file hosting service:
- GitHub Pages
- Netlify
- Vercel
- AWS S3
- Azure Static Web Apps

---

## 🤝 Contributing

Contributions are welcome! Please read the [Contributing Guide](CONTRIBUTING.md) for details.

### Ways to Contribute
- 🐛 Report bugs
- ✨ Suggest new features
- 📝 Improve documentation
- 🌍 Add translations
- 💻 Submit pull requests

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

### Third-Party Libraries
- **Leaflet.js** - BSD-2-Clause License
- **Proj4js** - MIT License
- **OpenStreetMap** - ODbL License
- **Cairo Font** - SIL Open Font License 1.1

---

## 📞 Support & Contact

- 🐛 **Bugs**: [GitHub Issues](https://github.com/tahershawki1/geotools-suite/issues)
- 💬 **Questions**: [GitHub Discussions](https://github.com/tahershawki1/geotools-suite/discussions)
- 📧 **Email**: See GitHub profile page

---

## 🌟 Acknowledgments

Thanks to all contributors and open source projects that made this possible:
- Leaflet.js for interactive mapping
- Proj4js for coordinate transformations
- OpenStreetMap for map data
- All project contributors

---

**Last Updated:** February 13, 2026 | **Version:** 1.0.0 | **Status:** ✅ Production Ready

