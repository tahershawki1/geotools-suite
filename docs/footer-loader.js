// Theme.js removed: No dark mode or theme switching
// Load unified footer in all pages
(function loadUnifiedFooter() {
  // Check if footer already exists
  if (document.querySelector('.footer-unified')) {
    return; // Footer already loaded
  }

  async function loadFooter() {
    try {
      const response = await fetch('./footer.html');
      const footerHTML = await response.text();
      
      // Insert footer at the very end of body
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = footerHTML;
      
      // Insert all children of tempDiv at the end of body
      while (tempDiv.firstChild) {
        document.body.appendChild(tempDiv.firstChild);
      }

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
