/**
 * i18n.js - Internationalization System for GeoTools Suite
 * Supports multiple languages with localStorage persistence
 */

class I18n {
  constructor() {
    this.currentLang = this.getSavedLanguage() || 'en';
    this.translations = {};
    this.fallbackLang = 'en';
    // Determine base path based on current location
    this.basePath = this.getBasePath();
  }

  /**
   * Get base path for locales directory
   */
  getBasePath() {
    const path = window.location.pathname;
    // If in pages subdirectory, go up one level
    if (path.includes('/pages/')) {
      return '../shared/locales/';
    }
    // If in docs root or other location
    return './shared/locales/';
  }

  /**
   * Get saved language from localStorage
   */
  getSavedLanguage() {
    return localStorage.getItem('geotools-language') || navigator.language?.split('-')[0];
  }

  /**
   * Load translation file for a language
   */
  async loadLanguage(lang) {
    try {
      const response = await fetch(`${this.basePath}${lang}.json`);
      if (!response.ok) {
        throw new Error(`Failed to load language: ${lang}`);
      }
      this.translations[lang] = await response.json();
      return true;
    } catch (error) {
      console.warn(`Could not load language ${lang}:`, error);
      return false;
    }
  }

  /**
   * Set the current language
   */
  async setLanguage(lang) {
    // Load language if not already loaded
    if (!this.translations[lang]) {
      const loaded = await this.loadLanguage(lang);
      if (!loaded && lang !== this.fallbackLang) {
        // Fallback to English
        await this.loadLanguage(this.fallbackLang);
        lang = this.fallbackLang;
      }
    }

    this.currentLang = lang;
    localStorage.setItem('geotools-language', lang);

    // Update HTML attributes
    document.documentElement.setAttribute('lang', lang);
    document.documentElement.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');

    // Update all translated elements
    this.updatePageTranslations();

    // Dispatch event for other components
    window.dispatchEvent(new CustomEvent('languagechange', { detail: { lang } }));
  }

  /**
   * Get translation for a key
   */
  t(key, defaultValue = '') {
    const keys = key.split('.');
    let value = this.translations[this.currentLang];

    for (const k of keys) {
      if (value && typeof value === 'object') {
        value = value[k];
      } else {
        break;
      }
    }

    // Fallback to English if translation not found
    if (!value && this.currentLang !== this.fallbackLang) {
      let fallback = this.translations[this.fallbackLang];
      for (const k of keys) {
        if (fallback && typeof fallback === 'object') {
          fallback = fallback[k];
        } else {
          break;
        }
      }
      value = fallback;
    }

    return value || defaultValue || key;
  }

  /**
   * Update all elements with data-i18n attribute
   */
  updatePageTranslations() {
    // Update text content
    document.querySelectorAll('[data-i18n]').forEach(element => {
      const key = element.getAttribute('data-i18n');
      const translation = this.t(key);
      if (translation) {
        element.textContent = translation;
      }
    });

    // Update placeholders
    document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
      const key = element.getAttribute('data-i18n-placeholder');
      const translation = this.t(key);
      if (translation) {
        element.placeholder = translation;
      }
    });

    // Update titles
    document.querySelectorAll('[data-i18n-title]').forEach(element => {
      const key = element.getAttribute('data-i18n-title');
      const translation = this.t(key);
      if (translation) {
        element.title = translation;
      }
    });

    // Update aria-labels
    document.querySelectorAll('[data-i18n-aria]').forEach(element => {
      const key = element.getAttribute('data-i18n-aria');
      const translation = this.t(key);
      if (translation) {
        element.setAttribute('aria-label', translation);
      }
    });
  }

  /**
   * Get current language
   */
  getCurrentLanguage() {
    return this.currentLang;
  }

  /**
   * Get available languages
   */
  getAvailableLanguages() {
    return ['en', 'ar'];
  }
}

// Create global instance
window.i18n = new I18n();

// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
  await window.i18n.setLanguage(window.i18n.currentLang);
});
