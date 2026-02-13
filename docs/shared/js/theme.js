// ===== GeoTools Suite Enhanced Theme System =====
// Deprecated: No longer used. Dark mode and theme switching removed from project.
(function() {
  'use strict';

  // ===== Lazy Loading Manager =====
  class LazyLoadManager {
  constructor() {
    this.init();
  }

  init() {
    // Use Intersection Observer for images
    if ('IntersectionObserver' in window) {
      this.observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target;
            img.src = img.dataset.src;
            img.removeAttribute('data-src');
            img.classList.add('fade-in');
            observer.unobserve(img);
          }
        });
      });

      document.querySelectorAll('img[data-src]').forEach(img => this.observer.observe(img));
    } else {
      // Fallback for older browsers
      document.querySelectorAll('img[data-src]').forEach(img => {
        img.src = img.dataset.src;
        img.removeAttribute('data-src');
      });
    }
  }

  reinit() {
    // Re-observe new images
    if (this.observer) {
      document.querySelectorAll('img[data-src]').forEach(img => {
        if (!img.src || img.src === '') {
          this.observer.observe(img);
        }
      });
    } else {
      // Fallback
      document.querySelectorAll('img[data-src]').forEach(img => {
        if (!img.src || img.src === '') {
          img.src = img.dataset.src;
          img.removeAttribute('data-src');
        }
      });
    }
  }
}

// ===== Caching Manager (Service Worker) =====
class CachingManager {
  constructor() {
    this.cacheName = 'geotools-v1';
    this.urlsToCache = [
      '/docs/',
      '/docs/index.html',
      '/docs/styles.css',
      '/docs/shared/js/theme.js',
      '/docs/vendor/leaflet/leaflet.css',
      '/docs/vendor/leaflet/leaflet.js'
    ];
  }

  registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/docs/service-worker.js')
        .then(registration => {
          console.log('✅ Service Worker registered:', registration);
        })
        .catch(error => {
          console.warn('⚠️ Service Worker registration failed:', error);
        });
    }
  }
}

// ===== Page Transitions & Animations =====
class PageTransitionManager {
  constructor() {
    this.init();
  }

  init() {
    // Add animation on page load
    document.addEventListener('DOMContentLoaded', () => {
      document.body.style.opacity = '0';
      setTimeout(() => {
        document.body.style.transition = 'opacity 0.5s ease-in';
        document.body.style.opacity = '1';
      }, 50);
    });

    // Apply animation when elements appear
    this.observeElements();
  }

  observeElements() {
    if ('IntersectionObserver' in window) {
      this.observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('fade-in');
            this.observer.unobserve(entry.target);
          }
        });
      }, { threshold: 0.1 });

      // Observe all cards and target elements
      document.querySelectorAll('.card, .result-card, .container-dltm, .container-converter').forEach(el => {
        this.observer.observe(el);
      });
    }
  }

  reinit() {
    // Re-observe new elements
    if (this.observer) {
      document.querySelectorAll('.card, .result-card, .container-dltm, .container-converter').forEach(el => {
        if (!el.classList.contains('fade-in')) {
          this.observer.observe(el);
        }
      });
    }
  }
}

// ===== Mobile Touch Enhancements =====
class MobileEnhancements {
  constructor() {
    this.init();
  }

  init() {
    // Add ripple effect to buttons
    this.addRippleEffect();
    
    // Improve touch performance
    this.optimizeTouchPerformance();
  }

  addRippleEffect() {
    // Use event delegation to avoid duplicate listeners
    document.addEventListener('click', (e) => {
      const el = e.target.closest('button, .card, a');
      if (!el || el.hasAttribute('data-ripple-bound')) return;

      const rect = el.getBoundingClientRect();
      const ripple = document.createElement('span');
      ripple.style.position = 'absolute';
      ripple.style.width = '20px';
      ripple.style.height = '20px';
      ripple.style.background = 'rgba(255, 255, 255, 0.5)';
      ripple.style.borderRadius = '50%';
      ripple.style.left = (e.clientX - rect.left - 10) + 'px';
      ripple.style.top = (e.clientY - rect.top - 10) + 'px';
      ripple.style.animation = 'ripple 0.6s ease-out';
      ripple.style.pointerEvents = 'none';

      if (getComputedStyle(el).position === 'static') {
        el.style.position = 'relative';
      }
      el.appendChild(ripple);

      setTimeout(() => ripple.remove(), 600);
    }, true); // Use capture phase
  }

  reinit() {
    // Mark existing elements to prevent re-binding
    document.querySelectorAll('button, .card, a').forEach(el => {
      el.setAttribute('data-ripple-bound', 'true');
    });
  }

  optimizeTouchPerformance() {
    // Optimize touch performance
    document.addEventListener('touchstart', function() {
    }, { passive: true });

    // Add will-change to scrollable elements
    document.querySelectorAll('[data-scrollable]').forEach(el => {
      el.style.willChange = 'transform';
    });
  }
}

// ===== Performance Monitoring =====
class PerformanceMonitor {
  constructor() {
    this.init();
  }

  init() {
    if (window.performance) {
      window.addEventListener('load', () => {
        this.logMetrics();
      });
    }
  }

  logMetrics() {
    const metrics = {};

    // Try modern Navigation Timing API first
    if (window.performance.getEntriesByType) {
      const nav = window.performance.getEntriesByType('navigation')[0];
      if (nav) {
        metrics['DNS Lookup'] = Math.max(0, nav.domainLookupEnd - nav.domainLookupStart);
        metrics['TCP Connection'] = Math.max(0, nav.connectEnd - nav.connectStart);
        metrics['Server Response'] = Math.max(0, nav.responseEnd - nav.responseStart);
        metrics['DOM Parsing'] = Math.max(0, nav.domComplete - nav.domInteractive);
        const pageLoad = nav.duration ?? nav.loadEventEnd ?? performance.now();
        metrics['Page Load Time'] = Math.round(Math.max(0, pageLoad));
      }
    }

    // Fallback to legacy timing API if modern API not available or incomplete
    if (Object.keys(metrics).length === 0 && window.performance.timing) {
      const timing = window.performance.timing;
      metrics['DNS Lookup'] = Math.max(0, timing.domainLookupEnd - timing.domainLookupStart);
      metrics['TCP Connection'] = Math.max(0, timing.connectEnd - timing.connectStart);
      metrics['Server Response'] = Math.max(0, timing.responseEnd - timing.responseStart);
      metrics['DOM Parsing'] = Math.max(0, timing.domComplete - timing.domLoading);
      metrics['Page Load Time'] = Math.max(0, timing.loadEventEnd - timing.navigationStart);
    }

    // If still no data, use performance.now() as last resort
    if (Object.keys(metrics).length === 0) {
      metrics['Page Load Time'] = Math.max(0, window.performance.now());
      metrics['DNS Lookup'] = 'N/A';
      metrics['TCP Connection'] = 'N/A';
      metrics['Server Response'] = 'N/A';
      metrics['DOM Parsing'] = 'N/A';
    }

    console.group('⚡ Performance Metrics');
    Object.entries(metrics).forEach(([name, value]) => {
      console.log(`${name}: ${value}${typeof value === 'number' ? 'ms' : ''}`);
    });
    console.groupEnd();
  }
}

// ===== Responsive Utilities =====
class ResponsiveHelper {
  constructor() {
    this.breakpoints = {
      mobile: 480,
      tablet: 768,
      desktop: 1024
    };
    this.init();
  }

  init() {
    this.updateViewportClass();
    window.addEventListener('resize', () => this.updateViewportClass());
  }

  updateViewportClass() {
    const width = window.innerWidth;
    document.body.classList.remove('viewport-mobile', 'viewport-tablet', 'viewport-desktop');
    
    if (width <= this.breakpoints.mobile) {
      document.body.classList.add('viewport-mobile');
    } else if (width <= this.breakpoints.tablet) {
      document.body.classList.add('viewport-tablet');
    } else {
      document.body.classList.add('viewport-desktop');
    }
  }

  isMobile() {
    return window.innerWidth <= this.breakpoints.mobile;
  }

  isTablet() {
    return window.innerWidth <= this.breakpoints.tablet;
  }
}

// ===== Keyboard Navigation =====
class KeyboardNavigation {
  constructor() {
    this.init();
  }

  init() {
    document.addEventListener('keydown', (e) => {
      // Escape key
      if (e.key === 'Escape') {
        this.handleEscape();
      }

      // Tab key for focus management
      if (e.key === 'Tab') {
        document.body.classList.add('keyboard-nav');
      }
    });

    document.addEventListener('mousedown', () => {
      document.body.classList.remove('keyboard-nav');
    });
  }

  handleEscape() {
    // Close any open dialogs
    const openDialogs = document.querySelectorAll('[data-dialog][open]');
    if (openDialogs.length > 0) {
      openDialogs[openDialogs.length - 1].close();
    }
  }
}

// ===== Global Initialization =====
let lazyLoad, transitions, mobile; // Store instances for reinit

document.addEventListener('DOMContentLoaded', () => {
  // Initialize all features
  lazyLoad = new LazyLoadManager();
  const caching = new CachingManager();
  transitions = new PageTransitionManager();
  mobile = new MobileEnhancements();
  const performance = new PerformanceMonitor();
  const responsive = new ResponsiveHelper();
  const keyboard = new KeyboardNavigation();

  // Register Service Worker
  caching.registerServiceWorker();

  // Output diagnostics
  console.log('🚀 GeoTools Suite Enhanced - All systems initialized');
  console.log('📱 Responsive:', responsive.isMobile() ? 'Mobile' : responsive.isTablet() ? 'Tablet' : 'Desktop');
});

// ===== SPA Reinit API =====
window.GeoToolsTheme = {
  reinit() {
    if (lazyLoad) lazyLoad.reinit();
    if (transitions) transitions.reinit();
    if (mobile) mobile.reinit();
  }
};

})(); // End of IIFE

