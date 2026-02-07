// Load unified navbar in all pages
(function loadUnifiedNavbar() {
  // Check if navbar already exists
  if (document.querySelector('.navbar-unified')) {
    return; // Navbar already loaded
  }

  async function loadNavbar() {
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

      // Update active page indicator
      updatePageIndicator();
    } catch (error) {
      console.warn('Failed to load navbar:', error);
    }
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

  // Load navbar when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadNavbar);
  } else {
    loadNavbar();
  }
})();
