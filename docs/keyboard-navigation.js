// Theme.js removed: No dark mode or theme switching
// Keyboard Navigation & Accessibility Handler
(function initKeyboardNavigation() {
  // Enhance keyboard navigation for navbar and footer
  document.addEventListener('DOMContentLoaded', function() {
    setupNavbarKeyboardNavigation();
    setupFooterKeyboardNavigation();
    setupSkipToContentLink();
  });

  // Setup keyboard navigation for navbar buttons
  function setupNavbarKeyboardNavigation() {
    const navButtons = document.querySelectorAll('.btn-nav-unified');
    
    navButtons.forEach((button, index) => {
      // Add focus visible styling
      button.addEventListener('focus', function() {
        this.style.outline = '2px solid var(--primary, #4f46e5)';
        this.style.outlineOffset = '2px';
      });

      button.addEventListener('blur', function() {
        this.style.outline = 'none';
      });

      // Allow arrow key navigation
      button.addEventListener('keydown', function(e) {
        let nextButton = null;

        if (e.key === 'ArrowRight') {
          e.preventDefault();
          nextButton = navButtons[index + 1] || navButtons[0];
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault();
          nextButton = navButtons[index - 1] || navButtons[navButtons.length - 1];
        } else if (e.key === 'Home') {
          e.preventDefault();
          nextButton = navButtons[0];
        } else if (e.key === 'End') {
          e.preventDefault();
          nextButton = navButtons[navButtons.length - 1];
        }

        if (nextButton) {
          nextButton.focus();
        }
      });

      // Ensure Enter/Space works
      button.addEventListener('keypress', function(e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.click();
        }
      });
    });

    // Logo link keyboard support
    const logoLink = document.querySelector('.nav-logo-unified');
    if (logoLink) {
      logoLink.addEventListener('focus', function() {
        this.style.outline = '2px solid var(--primary, #4f46e5)';
        this.style.outlineOffset = '2px';
      });

      logoLink.addEventListener('blur', function() {
        this.style.outline = 'none';
      });
    }
  }

  // Setup keyboard navigation for footer links
  function setupFooterKeyboardNavigation() {
    const footerLinks = document.querySelectorAll('.footer-link');
    
    footerLinks.forEach((link, index) => {
      link.addEventListener('focus', function() {
        this.style.outline = '2px solid var(--primary, #4f46e5)';
        this.style.outlineOffset = '2px';
      });

      link.addEventListener('blur', function() {
        this.style.outline = 'none';
      });

      // Arrow key navigation in footer
      link.addEventListener('keydown', function(e) {
        let nextLink = null;

        if (e.key === 'ArrowRight') {
          e.preventDefault();
          nextLink = footerLinks[index + 1] || footerLinks[0];
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault();
          nextLink = footerLinks[index - 1] || footerLinks[footerLinks.length - 1];
        }

        if (nextLink) {
          nextLink.focus();
        }
      });
    });
  }

  // Create and add skip-to-content link
  function setupSkipToContentLink() {
    // Create skip link if it doesn't exist
    const existingSkipLink = document.querySelector('.skip-to-content');
    if (existingSkipLink) {
      return; // Already exists
    }

    const skipLink = document.createElement('a');
    skipLink.href = '#main-content';
    skipLink.className = 'skip-to-content';
    skipLink.textContent = 'Skip to main content';
    skipLink.setAttribute('role', 'complementary');
    skipLink.setAttribute('aria-label', 'Skip to main content');

    // Add styles for skip link (hidden by default, visible on focus)
    const style = document.createElement('style');
    style.textContent = `
      .skip-to-content {
        position: absolute;
        top: -9999px;
        left: -9999px;
        z-index: 999;
        padding: 1em;
        background-color: var(--primary, #4f46e5);
        color: white;
        text-decoration: none;
        border-radius: 0 0 4px 0;
        font-weight: bold;
      }

      .skip-to-content:focus {
        top: 0;
        left: 0;
        outline: 3px solid var(--primary-hover, #4338ca);
      }

      @media (prefers-reduced-motion: reduce) {
        .skip-to-content:focus {
          outline: 2px dashed var(--primary-hover, #4338ca);
        }
      }
    `;

    document.head.appendChild(style);
    document.body.insertBefore(skipLink, document.body.firstChild);

    // Create main content id if it doesn't exist
    const appContainer = document.getElementById('app-container');
    if (appContainer && !appContainer.id) {
      appContainer.id = 'main-content';
    }

    // Smooth scroll to main content
    skipLink.addEventListener('click', function(e) {
      e.preventDefault();
      const mainContent = document.getElementById('main-content');
      if (mainContent) {
        mainContent.focus();
        mainContent.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  }

  // Also add global keyboard shortcuts help (optional)
  document.addEventListener('keydown', function(e) {
    // Alt + H for home (commonly used shortcut)
    if (e.altKey && e.key === 'h') {
      e.preventDefault();
      const homeBtn = document.querySelector('.btn-nav-unified');
      if (homeBtn) {
        homeBtn.click();
      }
    }
  });
})();
