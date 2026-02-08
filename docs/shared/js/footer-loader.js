// Theme.js removed: No dark mode or theme switching
// Load unified footer in all pages
(function loadUnifiedFooter() {
  // Check if footer already exists
  if (document.querySelector('.footer-unified')) {
    return; // Footer already loaded
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

  function bindFooterLinks(container) {
    const links = container.querySelectorAll('.footer-link[data-page]');
    links.forEach((link) => {
      const page = link.getAttribute('data-page') || '';
      link.setAttribute('href', resolvePagePath(page));
      if (link.dataset.footerBound === 'true') return;
      link.dataset.footerBound = 'true';
      link.addEventListener('click', (event) => {
        if (typeof window.loadPage !== 'function') return;
        event.preventDefault();
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
      });
    });
  }

  async function loadFooter() {
    try {
      const response = await fetch(resolveSharedPath('footer.html'));
      const footerHTML = await response.text();
      
      // Insert footer at the very end of body
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = footerHTML;
      
      // Insert all children of tempDiv at the end of body
      while (tempDiv.firstChild) {
        document.body.appendChild(tempDiv.firstChild);
      }

      bindFooterLinks(document);

      // If app-container exists, make sure it uses flex layout
      const appContainer = document.getElementById('app-container');
      if (appContainer) {
        appContainer.style.display = 'flex';
        appContainer.style.flexDirection = 'column';
      }

      // Ensure body is also flex for proper footer positioning
      if (!document.body.style.display) {
        document.body.style.display = 'flex';
        document.body.style.flexDirection = 'column';
        document.body.style.minHeight = '100vh';
      }
    } catch (error) {
      console.warn('Failed to load footer:', error);
    }
  }

  // Load footer when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadFooter);
  } else {
    loadFooter();
  }
})();
