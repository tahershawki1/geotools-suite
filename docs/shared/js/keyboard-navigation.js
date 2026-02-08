// Keyboard Navigation & Accessibility Handler
(function initKeyboardNavigation() {
  function styleFocusedElement(el, isFocused) {
    if (!el) return;
    if (isFocused) {
      el.style.outline = '2px solid var(--primary, #4f46e5)';
      el.style.outlineOffset = '2px';
      return;
    }
    el.style.outline = 'none';
  }

  function getVisibleElements(selector, scope) {
    return Array.from((scope || document).querySelectorAll(selector)).filter((el) => {
      return el.offsetParent !== null || el === document.activeElement;
    });
  }

  function moveFocusInGroup(e, items, currentEl) {
    if (!items || items.length === 0) return;
    const index = items.indexOf(currentEl);
    if (index < 0) return;

    let next = null;
    if (e.key === 'ArrowRight') {
      next = items[index + 1] || items[0];
    } else if (e.key === 'ArrowLeft') {
      next = items[index - 1] || items[items.length - 1];
    } else if (e.key === 'Home') {
      next = items[0];
    } else if (e.key === 'End') {
      next = items[items.length - 1];
    }

    if (next) {
      e.preventDefault();
      next.focus();
    }
  }

  function setupSkipToContentLink() {
    const existingSkipLink = document.querySelector('.skip-to-content');
    if (existingSkipLink) return;

    const target = document.getElementById('view-content') || document.getElementById('app-container');
    if (!target) return;

    if (!target.id) target.id = 'main-content';
    if (!target.hasAttribute('tabindex')) {
      target.setAttribute('tabindex', '-1');
    }

    const skipLink = document.createElement('a');
    skipLink.href = '#' + target.id;
    skipLink.className = 'skip-to-content';
    skipLink.textContent = 'Skip to main content';
    skipLink.setAttribute('aria-label', 'Skip to main content');

    const style = document.createElement('style');
    style.textContent = `
      .skip-to-content {
        position: absolute;
        top: -9999px;
        left: -9999px;
        z-index: 9999;
        padding: 1em;
        background-color: var(--primary, #4f46e5);
        color: #fff;
        text-decoration: none;
        border-radius: 0 0 4px 0;
        font-weight: bold;
      }

      .skip-to-content:focus {
        top: 0;
        left: 0;
        outline: 3px solid var(--primary-hover, #4338ca);
      }
    `;

    document.head.appendChild(style);
    document.body.insertBefore(skipLink, document.body.firstChild);

    skipLink.addEventListener('click', function (e) {
      e.preventDefault();
      const mainContent = document.querySelector(skipLink.getAttribute('href'));
      if (!mainContent) return;
      mainContent.focus();
      mainContent.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    setupSkipToContentLink();
  });

  // Focus styling works even for dynamically injected content.
  document.addEventListener('focusin', function (e) {
    if (e.target.matches('.btn-nav-unified, .footer-link, .nav-logo-unified')) {
      styleFocusedElement(e.target, true);
    }
  });

  document.addEventListener('focusout', function (e) {
    if (e.target.matches('.btn-nav-unified, .footer-link, .nav-logo-unified')) {
      styleFocusedElement(e.target, false);
    }
  });

  document.addEventListener('keydown', function (e) {
    if (e.altKey && e.key.toLowerCase() === 'h') {
      e.preventDefault();
      const homeBtn = document.querySelector('.btn-nav-unified[data-page=""]');
      if (homeBtn) homeBtn.click();
      return;
    }

    const target = e.target;
    if (!(target instanceof Element)) return;

    if (target.matches('.btn-nav-unified')) {
      const groupRoot = target.closest('.mobile-menu') || target.closest('.nav-links-unified') || document;
      const navButtons = getVisibleElements('.btn-nav-unified', groupRoot);
      moveFocusInGroup(e, navButtons, target);
      return;
    }

    if (target.matches('.footer-link')) {
      const footerLinks = getVisibleElements('.footer-link', document);
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft' || e.key === 'Home' || e.key === 'End') {
        moveFocusInGroup(e, footerLinks, target);
      }
    }
  });
})();
