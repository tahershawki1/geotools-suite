// Theme.js removed: No dark mode or theme switching
// Load unified navbar in all pages
(function loadUnifiedNavbar() {
  // Global state for navbar management
  window.__GeoToolsNavbar = {
    mobileInit: false,
    resizeBound: false,
    mobileEventsBound: false,
    buttonsBound: false,
    lastMobileState: null // true for mobile, false for desktop
  };
  // Function to check if navbar exists
  function navbarExists() {
    return document.querySelector('.navbar-unified') !== null;
  }

  async function loadNavbar() {
    // Double check before loading
    if (navbarExists()) {
      console.log('Navbar already exists, skipping load');
      return;
    }

    try {
      const response = await fetch('./navbar.html');
      const navbarHTML = await response.text();

      // Insert navbar at the very top of body
      const bodyTop = document.body.firstChild;
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = navbarHTML;

      // Insert all children of tempDiv at the beginning of body
      while (tempDiv.firstChild) {
        document.body.insertBefore(tempDiv.firstChild, bodyTop);
      }

      // Setup navbar button click handlers manually here
      setupNavbarButtonHandlers();

      // Update active page indicator
      updatePageIndicator();

      // Setup mobile menu functionality
      setupMobileMenu();

      console.log('Navbar loaded successfully');
    } catch (error) {
      console.warn('Failed to load navbar:', error);
    }
  }

  // Setup navbar button click handlers
  function setupNavbarButtonHandlers() {
    if (window.__GeoToolsNavbar.buttonsBound) {
      console.log('Navbar buttons already bound, skipping');
      return;
    }
    const buttons = document.querySelectorAll('.btn-nav-unified');
    console.log('Setting up navbar buttons:', buttons.length);
    
    buttons.forEach(btn => {
      btn.addEventListener('click', function() {
        const page = this.getAttribute('data-page');
        console.log('Navbar button clicked:', page);
        
        if (typeof window.loadPage === 'function') {
          // Inside SPA - use loadPage
          console.log('Using SPA loadPage for:', page);
          loadPage(page);
        } else {
          // Standalone page - navigate directly
          console.log('Direct navigation to:', page);
          if (!page) {
            window.location.href = './index.html';
          } else {
            window.location.href = './' + page + '.html';
          }
        }
      });
    });
    window.__GeoToolsNavbar.buttonsBound = true;
  }

  // Update active page indicator based on current page
  window.updatePageIndicator = function() {
    const navButtons = document.querySelectorAll('.btn-nav-unified');
    
    // Remove aria-current from all buttons
    navButtons.forEach(btn => {
      btn.removeAttribute('aria-current');
      btn.style.borderBottom = 'none';
    });

    // Get current page name
    let currentPage = 'home'; // default
    if (window.location.pathname.includes('.html')) {
      const pageName = window.location.pathname.split('/').pop().replace('.html', '');
      if (pageName && pageName !== 'index') {
        currentPage = pageName.toLowerCase();
      }
    }

    // Mark current button as active
    navButtons.forEach(btn => {
      const btnText = btn.textContent.trim().toLowerCase();
      let match = false;

      if (currentPage === 'home' && btnText === 'home') match = true;
      else if (currentPage === 'converter' && btnText.includes('file converter')) match = true;
      else if (currentPage === 'dltm' && btnText.includes('dubai')) match = true;
      else if (currentPage === 'transform' && btnText.includes('transformation')) match = true;
      else if (currentPage === 'service2' && btnText.includes('area')) match = true;

      if (match) {
        btn.setAttribute('aria-current', 'page');
        btn.style.borderBottom = '3px solid var(--primary, #4f46e5)';
        btn.style.color = 'var(--primary, #4f46e5)';
      }
    });
  };

  // Bind mobile menu events once using event delegation
  function bindMobileMenuEventsOnce() {
    if (window.__GeoToolsNavbar.mobileEventsBound) return;
    window.__GeoToolsNavbar.mobileEventsBound = true;

    document.addEventListener('click', (e) => {
      const hamburger = document.querySelector('.hamburger-menu');
      const overlay = document.querySelector('.mobile-menu-overlay');
      const menu = document.querySelector('.mobile-menu');
      if (!hamburger || !overlay || !menu) return;

      // hamburger toggle
      if (e.target.closest('.hamburger-menu')) {
        e.preventDefault();
        hamburger.classList.toggle('active');
        overlay.classList.toggle('active');
        menu.classList.toggle('active');
        return;
      }

      // overlay background click => close
      if (e.target === overlay) {
        hamburger.classList.remove('active');
        overlay.classList.remove('active');
        menu.classList.remove('active');
        return;
      }

      // menu item click => close
      if (e.target.closest('.mobile-menu .btn-nav-unified')) {
        hamburger.classList.remove('active');
        overlay.classList.remove('active');
        menu.classList.remove('active');
      }
    });
  }

  // Setup mobile menu functionality
  function setupMobileMenu() {
    if (window.__GeoToolsNavbar.mobileInit) {
      console.log('Mobile menu already initialized, skipping');
      return;
    }
    console.log('Setting up mobile menu functionality');
    window.__GeoToolsNavbar.mobileInit = true;

    // Create hamburger menu only for mobile
    function createHamburgerMenu() {
      const isMobile = window.innerWidth <= 480;
      const currentState = window.__GeoToolsNavbar.lastMobileState;
      
      if (isMobile !== currentState) {
        if (isMobile) {
          if (!document.querySelector('.hamburger-menu')) {
            console.log('Creating hamburger menu');
            const hamburger = document.createElement('button');
            hamburger.className = 'hamburger-menu';
            hamburger.setAttribute('aria-label', 'Toggle menu');
            hamburger.innerHTML = '<span></span><span></span><span></span>';
            document.querySelector('.navbar-unified').appendChild(hamburger);
          }
        } else {
          const existing = document.querySelector('.hamburger-menu');
          if (existing) {
            console.log('Removing hamburger menu');
            existing.remove();
          }
        }
        window.__GeoToolsNavbar.lastMobileState = isMobile;
        if (isMobile) {
          console.log('Transitioned to mobile mode');
        } else {
          console.log('Transitioned to desktop mode');
        }
      }
    }

    // Create mobile menu overlay and menu only for mobile
    function createMobileMenu() {
      const isMobile = window.innerWidth <= 480;
      const currentState = window.__GeoToolsNavbar.lastMobileState;
      
      if (isMobile !== currentState) {
        if (isMobile) {
          if (!document.querySelector('.mobile-menu-overlay')) {
            console.log('Creating mobile menu overlay');
            const overlay = document.createElement('div');
            overlay.className = 'mobile-menu-overlay';

            const mobileMenu = document.createElement('div');
            mobileMenu.className = 'mobile-menu';
            mobileMenu.innerHTML = `
              <button class="btn-nav-unified" data-page="" aria-label="Home - Main dashboard">Home</button>
              <button class="btn-nav-unified" data-page="Converter" aria-label="File Converter - Convert survey files">File Converter</button>
              <button class="btn-nav-unified" data-page="DLTM" aria-label="Dubai Converter - DLTM coordinate conversion">Dubai Converter</button>
              <button class="btn-nav-unified" data-page="Transform" aria-label="Coordinate Transformation - WGS84 and UTM conversion">Coordinate Transformation</button>
              <button class="btn-nav-unified" data-page="Service2" aria-label="Area Calculator - Calculate areas from coordinates">Area Calculator</button>
            `;

            overlay.appendChild(mobileMenu);
            document.body.appendChild(overlay);
          }
        } else {
          const existing = document.querySelector('.mobile-menu-overlay');
          if (existing) {
            console.log('Removing mobile menu overlay');
            existing.remove();
          }
        }
      }
    }

    // Initialize based on current state
    const initialMobile = window.innerWidth <= 480;
    window.__GeoToolsNavbar.lastMobileState = initialMobile;
    createHamburgerMenu();
    createMobileMenu();

    // Bind mobile menu events once
    bindMobileMenuEventsOnce();

    // Handle resize with debouncing and threshold - bind only once
    if (!window.__GeoToolsNavbar.resizeBound) {
      let resizeTimeout;
      let lastWidth = window.innerWidth;
      let lastState = window.innerWidth <= 480;
      window.addEventListener('resize', function() {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(function() {
          const currentWidth = window.innerWidth;
          const currentState = currentWidth <= 480;
          if (Math.abs(currentWidth - lastWidth) > 10) { // Only if significant change
            if (currentState !== lastState) {
              console.log('Resize detected, transitioning mobile menu state');
            }
            lastWidth = currentWidth;
            lastState = currentState;
            createHamburgerMenu();
            createMobileMenu();
          }
        }, 100);
      });
      window.__GeoToolsNavbar.resizeBound = true;
    }

    // Setup scroll arrows functionality
    setupScrollArrows();
  }

  // Setup mobile menu events
  function setupMobileMenuEvents() {
    if (window.__GeoToolsNavbar.mobileEventsBound) {
      // Events already bound, skip
      return;
    }

    const hamburger = document.querySelector('.hamburger-menu');
    const overlay = document.querySelector('.mobile-menu-overlay');
    const mobileMenu = document.querySelector('.mobile-menu');

    if (hamburger && overlay && mobileMenu) {
      console.log('Setting up mobile menu event listeners');
      hamburger.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        console.log('Hamburger clicked');
        this.classList.toggle('active');
        overlay.classList.toggle('active');
        mobileMenu.classList.toggle('active');
      });

      overlay.addEventListener('click', function() {
        console.log('Overlay clicked');
        hamburger.classList.remove('active');
        overlay.classList.remove('active');
        mobileMenu.classList.remove('active');
      });

      // Close menu when clicking on a menu item
      mobileMenu.querySelectorAll('.btn-nav-unified').forEach(btn => {
        btn.addEventListener('click', function() {
          console.log('Menu item clicked');
          hamburger.classList.remove('active');
          overlay.classList.remove('active');
          mobileMenu.classList.remove('active');
        });
      });
      window.__GeoToolsNavbar.mobileEventsBound = true;
    }
  }

  // Setup scroll arrows functionality
  function setupScrollArrows() {
    const leftArrow = document.querySelector('.nav-scroll-arrow.left');
    const rightArrow = document.querySelector('.nav-scroll-arrow.right');
    const navLinks = document.querySelector('.nav-links-unified');
    const navContainer = document.querySelector('.nav-links-container');

    if (leftArrow && rightArrow && navLinks && navContainer) {
      function updateArrows() {
        const scrollLeft = navLinks.scrollLeft;
        const scrollWidth = navLinks.scrollWidth;
        const clientWidth = navLinks.clientWidth;

        const needsScroll = scrollWidth > clientWidth;
        if (needsScroll) {
          navContainer.classList.add('has-scroll');
          leftArrow.style.opacity = scrollLeft > 0 ? '1' : '0.3';
          rightArrow.style.opacity = scrollLeft < scrollWidth - clientWidth - 1 ? '1' : '0.3';
        } else {
          navContainer.classList.remove('has-scroll');
        }
      }

      leftArrow.addEventListener('click', function() {
        navLinks.scrollBy({ left: -100, behavior: 'smooth' });
      });

      rightArrow.addEventListener('click', function() {
        navLinks.scrollBy({ left: 100, behavior: 'smooth' });
      });

      navLinks.addEventListener('scroll', updateArrows);
      window.addEventListener('resize', updateArrows);
      updateArrows(); // Initial check
    }
  }

  // Load navbar when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      if (!navbarExists()) {
        loadNavbar();
      }
    });
  } else {
    if (!navbarExists()) {
      loadNavbar();
    }
  }
})();
