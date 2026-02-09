// Load unified navbar in all pages
(function loadUnifiedNavbar() {
  const state = window.__GeoToolsNavbar || {
    mobileInit: false,
    resizeBound: false,
    mobileEventsBound: false,
    lastMobileState: null,
    lastFocusedElement: null
  };
  window.__GeoToolsNavbar = state;

  function navbarExists() {
    return document.querySelector('.navbar-unified') !== null;
  }

  function isMobileViewport() {
    return window.innerWidth <= 480;
  }

  function getBasePath() {
    return window.location.pathname.includes('/pages/') ? '..' : '.';
  }

  function resolvePagePath(page) {
    const key = (page || '').toLowerCase();
    const routes = {
      '': 'index.html',
      'home': 'index.html',
      'file-converter': 'pages/file-converter.html',
      'dltm-converter': 'pages/dltm-converter.html',
      'coordinate-transform': 'pages/coordinate-transform.html',
      'area-calculator': 'pages/area-calculator.html'
    };
    const target = routes[key] || `pages/${key}.html`;
    return `${getBasePath()}/${target}`;
  }

  function resolveSharedPath(fileName) {
    return `${getBasePath()}/shared/${fileName}`;
  }

  function navigateToPage(page) {
    if (typeof window.loadPage === 'function') {
      const result = window.loadPage(page || '');
      if (result && typeof result.then === 'function') {
        result.finally(() => {
          if (typeof window.updatePageIndicator === 'function') {
            window.updatePageIndicator(page || 'home');
          }
        });
      } else if (typeof window.updatePageIndicator === 'function') {
        window.updatePageIndicator(page || 'home');
      }
      return;
    }

    window.location.href = resolvePagePath(page || '');
  }

  function setupNavbarButtonHandlers() {
    const buttons = document.querySelectorAll('.btn-nav-unified:not([data-nav-bound="true"])');
    buttons.forEach((btn) => {
      btn.dataset.navBound = 'true';
      btn.addEventListener('click', function () {
        const page = this.getAttribute('data-page') || '';
        const isMobileItem = this.closest('.mobile-menu');

        navigateToPage(page);
        if (isMobileItem) {
          closeMobileMenu(true);
        }
      });
    });
  }

  function normalizePageName(value) {
    if (!value || value === 'index') return 'home';
    return String(value).toLowerCase();
  }

  window.updatePageIndicator = function (activePage) {
    const navButtons = document.querySelectorAll('.btn-nav-unified');
    const currentFromPath = window.location.pathname.split('/').pop().replace('.html', '');
    const currentPage = normalizePageName(activePage || currentFromPath);

    navButtons.forEach((btn) => {
      btn.removeAttribute('aria-current');
      btn.style.borderBottom = 'none';
      btn.style.color = '';
    });

    navButtons.forEach((btn) => {
      const btnPage = normalizePageName(btn.getAttribute('data-page'));
      if (btnPage !== currentPage) return;
      btn.setAttribute('aria-current', 'page');
      btn.style.borderBottom = '3px solid var(--primary, #4f46e5)';
      btn.style.color = 'var(--primary, #4f46e5)';
    });
  };

  function createHamburgerMenu() {
    const navbar = document.querySelector('.navbar-unified');
    if (!navbar) return;

    if (!isMobileViewport()) {
      const existing = document.querySelector('.hamburger-menu');
      if (existing) existing.remove();
      return;
    }

    if (document.querySelector('.hamburger-menu')) return;

    const hamburger = document.createElement('button');
    hamburger.className = 'hamburger-menu';
    hamburger.type = 'button';
    hamburger.setAttribute('aria-label', 'Toggle navigation menu');
    hamburger.setAttribute('aria-expanded', 'false');
    hamburger.setAttribute('aria-controls', 'mobile-main-menu');
    hamburger.innerHTML = '<span></span><span></span><span></span>';
    navbar.appendChild(hamburger);
  }

  function createMobileMenu() {
    if (!isMobileViewport()) {
      const existing = document.querySelector('.mobile-menu-overlay');
      if (existing) existing.remove();
      return;
    }

    if (document.querySelector('.mobile-menu-overlay')) return;

    const overlay = document.createElement('div');
    overlay.className = 'mobile-menu-overlay';

    const mobileMenu = document.createElement('div');
    mobileMenu.className = 'mobile-menu';
    mobileMenu.id = 'mobile-main-menu';
    mobileMenu.setAttribute('role', 'menu');
    mobileMenu.setAttribute('aria-label', 'Main navigation');
    mobileMenu.innerHTML = `
      <button class="btn-nav-unified" type="button" data-page="" aria-label="Home - Main dashboard" role="menuitem">Home</button>
      <button class="btn-nav-unified" type="button" data-page="file-converter" aria-label="File Converter - Convert survey files" role="menuitem">File Converter</button>
      <button class="btn-nav-unified" type="button" data-page="dltm-converter" aria-label="Dubai Converter - DLTM coordinate conversion" role="menuitem">Dubai Converter</button>
      <button class="btn-nav-unified" type="button" data-page="coordinate-transform" aria-label="Coordinate Transformation - WGS84 and UTM conversion" role="menuitem">Coordinate Transformation</button>
      <button class="btn-nav-unified" type="button" data-page="area-calculator" aria-label="Area Calculator - Calculate areas from coordinates" role="menuitem">Area Calculator</button>
    `;

    overlay.appendChild(mobileMenu);
    document.body.appendChild(overlay);

    setupNavbarButtonHandlers();
  }

  function openMobileMenu() {
    const hamburger = document.querySelector('.hamburger-menu');
    const overlay = document.querySelector('.mobile-menu-overlay');
    const menu = document.querySelector('.mobile-menu');
    if (!hamburger || !overlay || !menu) return;

    state.lastFocusedElement = document.activeElement;
    hamburger.classList.add('active');
    hamburger.setAttribute('aria-expanded', 'true');
    overlay.classList.add('active');
    menu.classList.add('active');

    const firstMenuItem = menu.querySelector('.btn-nav-unified');
    if (firstMenuItem) firstMenuItem.focus();
  }

  function closeMobileMenu(restoreFocus) {
    const hamburger = document.querySelector('.hamburger-menu');
    const overlay = document.querySelector('.mobile-menu-overlay');
    const menu = document.querySelector('.mobile-menu');
    if (!hamburger || !overlay || !menu) return;

    hamburger.classList.remove('active');
    hamburger.setAttribute('aria-expanded', 'false');
    overlay.classList.remove('active');
    menu.classList.remove('active');

    if (restoreFocus && state.lastFocusedElement && state.lastFocusedElement.focus) {
      state.lastFocusedElement.focus();
    }
  }

  function isMobileMenuOpen() {
    const overlay = document.querySelector('.mobile-menu-overlay');
    return !!(overlay && overlay.classList.contains('active'));
  }

  function trapFocusInsideMobileMenu(e) {
    if (!isMobileMenuOpen() || e.key !== 'Tab') return;

    const menu = document.querySelector('.mobile-menu');
    if (!menu) return;
    const focusable = Array.from(menu.querySelectorAll('.btn-nav-unified'));
    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
      return;
    }
    if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  function bindMobileMenuEventsOnce() {
    if (state.mobileEventsBound) return;
    state.mobileEventsBound = true;

    document.addEventListener('click', (e) => {
      const hamburger = document.querySelector('.hamburger-menu');
      const overlay = document.querySelector('.mobile-menu-overlay');
      if (!hamburger || !overlay) return;

      if (e.target.closest('.hamburger-menu')) {
        e.preventDefault();
        if (isMobileMenuOpen()) closeMobileMenu(false);
        else openMobileMenu();
        return;
      }

      if (e.target === overlay) {
        closeMobileMenu(true);
      }
    });

    document.addEventListener('keydown', (e) => {
      if (!isMobileMenuOpen()) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        closeMobileMenu(true);
        return;
      }
      trapFocusInsideMobileMenu(e);
    });
  }

  function setupScrollArrows() {
    const leftArrow = document.querySelector('.nav-scroll-arrow.left');
    const rightArrow = document.querySelector('.nav-scroll-arrow.right');
    const navLinks = document.querySelector('.nav-links-unified');
    const navContainer = document.querySelector('.nav-links-container');
    if (!leftArrow || !rightArrow || !navLinks || !navContainer) return;
    if (navContainer.dataset.scrollBound === 'true') return;

    function updateArrows() {
      const scrollLeft = navLinks.scrollLeft;
      const scrollWidth = navLinks.scrollWidth;
      const clientWidth = navLinks.clientWidth;
      const needsScroll = scrollWidth > clientWidth;

      if (!needsScroll) {
        navContainer.classList.remove('has-scroll');
        return;
      }

      navContainer.classList.add('has-scroll');
      leftArrow.style.opacity = scrollLeft > 0 ? '1' : '0.3';
      rightArrow.style.opacity = scrollLeft < scrollWidth - clientWidth - 1 ? '1' : '0.3';
    }

    navContainer.dataset.scrollBound = 'true';
    leftArrow.addEventListener('click', () => {
      navLinks.scrollBy({ left: -120, behavior: 'smooth' });
    });
    rightArrow.addEventListener('click', () => {
      navLinks.scrollBy({ left: 120, behavior: 'smooth' });
    });
    navLinks.addEventListener('scroll', updateArrows);
    window.addEventListener('resize', updateArrows);
    updateArrows();
  }

  function syncMobileMenu() {
    createHamburgerMenu();
    createMobileMenu();
    setupNavbarButtonHandlers();

    if (!isMobileViewport()) {
      closeMobileMenu(false);
    }

    state.lastMobileState = isMobileViewport();
  }

  function setupMobileMenu() {
    if (!state.mobileInit) {
      state.mobileInit = true;
      bindMobileMenuEventsOnce();
      setupScrollArrows();
    }

    syncMobileMenu();

    if (!state.resizeBound) {
      state.resizeBound = true;
      let resizeTimer;
      window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(syncMobileMenu, 120);
      });
    }
  }

  async function loadNavbar() {
    if (navbarExists()) return;

    try {
      const response = await fetch(resolveSharedPath('navbar.html'));
      const navbarHTML = await response.text();
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = navbarHTML;

      // Fix stylesheet path so it works from both / and /pages/.
      const cssLink = tempDiv.querySelector('link[rel~="stylesheet"]');
      if (cssLink) {
        cssLink.href = resolveSharedPath('css/navbar.css');
        cssLink.dataset.navbarStyle = 'true';
      }

      const bodyTop = document.body.firstChild;
      while (tempDiv.firstChild) {
        document.body.insertBefore(tempDiv.firstChild, bodyTop);
      }

      const logo = document.querySelector('.nav-logo-unified');
      if (logo) {
        logo.setAttribute('href', resolvePagePath(''));
      }

      setupNavbarButtonHandlers();
      if (typeof window.updatePageIndicator === 'function') {
        window.updatePageIndicator();
      }
      setupMobileMenu();
    } catch (error) {
      console.warn('Failed to load navbar:', error);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      if (!navbarExists()) loadNavbar();
    });
  } else if (!navbarExists()) {
    loadNavbar();
  }
})();
