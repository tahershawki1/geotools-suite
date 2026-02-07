// ===== Dark Mode Manager =====
class DarkModeManager {
  constructor() {
    this.storageKey = 'geotools_dark_mode';
    this.prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    this.isDarkMode = this.getSavedMode() ?? this.prefersDark;
    this.init();
  }

  getSavedMode() {
    const saved = localStorage.getItem(this.storageKey);
    return saved ? JSON.parse(saved) : null;
  }

  saveModePreference(isDark) {
    localStorage.setItem(this.storageKey, JSON.stringify(isDark));
  }

  applyMode(isDark) {
    this.isDarkMode = isDark;
    if (isDark) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
    this.saveModePreference(isDark);
  }

  toggle() {
    this.applyMode(!this.isDarkMode);
  }

  init() {
    // تطبيق الموضع المحفوظ أو الافتراضي
    if (this.isDarkMode) {
      document.body.classList.add('dark-mode');
    }

    // الاستماع لتغييرات تفضيلات النظام
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      if (this.getSavedMode() === null) {
        this.applyMode(e.matches);
      }
    });
  }
}

// ===== Lazy Loading Manager =====
class LazyLoadManager {
  constructor() {
    this.init();
  }

  init() {
    // استخدم Intersection Observer للصور
    if ('IntersectionObserver' in window) {
      const imageObserver = new IntersectionObserver((entries, observer) => {
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

      document.querySelectorAll('img[data-src]').forEach(img => imageObserver.observe(img));
    } else {
      // Fallback للمتصفحات القديمة
      document.querySelectorAll('img[data-src]').forEach(img => {
        img.src = img.dataset.src;
        img.removeAttribute('data-src');
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
      '/docs/theme.js',
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
    // إضافة animation عند تحميل الصفحة
    document.addEventListener('DOMContentLoaded', () => {
      document.body.style.opacity = '0';
      setTimeout(() => {
        document.body.style.transition = 'opacity 0.5s ease-in';
        document.body.style.opacity = '1';
      }, 50);
    });

    // تطبيق animation على العناصر عند ظهورها
    this.observeElements();
  }

  observeElements() {
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('fade-in');
            observer.unobserve(entry.target);
          }
        });
      }, { threshold: 0.1 });

      // لاحظ جميع البطاقات والعناصر
      document.querySelectorAll('.card, .result-card, .container-dltm, .container-converter').forEach(el => {
        observer.observe(el);
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
    // إضافة ripple effect على الأزرار
    this.addRippleEffect();
    
    // تحسين أداء اللمس
    this.optimizeTouchPerformance();
  }

  addRippleEffect() {
    document.querySelectorAll('button, .card, a').forEach(el => {
      el.addEventListener('click', (e) => {
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

        if (el.style.position === 'static') {
          el.style.position = 'relative';
        }
        el.appendChild(ripple);

        setTimeout(() => ripple.remove(), 600);
      });
    });
  }

  optimizeTouchPerformance() {
    // تحسين الأداء عند اللمس
    document.addEventListener('touchstart', function() {
    }, { passive: true });

    // إضافة will-change للعناصر القابلة للتمرير
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
    if (window.performance && window.performance.timing) {
      window.addEventListener('load', () => {
        this.logMetrics();
      });
    }
  }

  logMetrics() {
    const timing = window.performance.timing;
    const metrics = {
      'DNS Lookup': timing.domainLookupEnd - timing.domainLookupStart,
      'TCP Connection': timing.connectEnd - timing.connectStart,
      'Server Response': timing.responseEnd - timing.responseStart,
      'DOM Parsing': timing.domComplete - timing.domLoading,
      'Page Load Time': timing.loadEventEnd - timing.navigationStart
    };

    console.group('⚡ Performance Metrics');
    Object.entries(metrics).forEach(([name, value]) => {
      console.log(`${name}: ${value}ms`);
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
    // أغلق أي dialogs مفتوحة
    const openDialogs = document.querySelectorAll('[data-dialog][open]');
    if (openDialogs.length > 0) {
      openDialogs[openDialogs.length - 1].close();
    }
  }
}

// ===== Global Initialization =====
document.addEventListener('DOMContentLoaded', () => {
  // تهيئة جميع الميزات
  const darkMode = new DarkModeManager();
  const lazyLoad = new LazyLoadManager();
  const caching = new CachingManager();
  const transitions = new PageTransitionManager();
  const mobile = new MobileEnhancements();
  const performance = new PerformanceMonitor();
  const responsive = new ResponsiveHelper();
  const keyboard = new KeyboardNavigation();

  // تسجيل Service Worker
  caching.registerServiceWorker();

  // أضف زر dark mode toggle إذا لم يكن موجوداً
  if (!document.querySelector('.dark-mode-toggle')) {
    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'dark-mode-toggle';
    toggleBtn.innerHTML = darkMode.isDarkMode ? '☀️' : '🌙';
    toggleBtn.setAttribute('aria-label', 'Toggle dark mode');
    toggleBtn.addEventListener('click', () => {
      darkMode.toggle();
      toggleBtn.innerHTML = darkMode.isDarkMode ? '☀️' : '🌙';
    });
    document.body.appendChild(toggleBtn);
  }

  // عرض البيانات
  console.log('🚀 GeoTools Suite Enhanced - All systems initialized');
  console.log('📱 Responsive:', responsive.isMobile() ? 'Mobile' : responsive.isTablet() ? 'Tablet' : 'Desktop');
  console.log('🌙 Dark Mode:', darkMode.isDarkMode ? 'Enabled' : 'Disabled');
});
