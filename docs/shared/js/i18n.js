/**
 * Internationalization (i18n) Module
 * Handles language switching between English and Arabic with RTL support
 */

class I18n {
  constructor() {
    this.currentLang = this.getStoredLanguage() || this.detectLanguage();
    this.translations = {};
    this.initialized = false;
  }

  /**
   * Detect browser language
   */
  detectLanguage() {
    const browserLang = navigator.language || navigator.userLanguage;
    const urlParams = new URLSearchParams(window.location.search);
    const urlLang = urlParams.get('lang');
    
    if (urlLang && ['en', 'ar'].includes(urlLang)) {
      return urlLang;
    }
    
    if (browserLang.startsWith('ar')) {
      return 'ar';
    }
    
    return 'en';
  }

  /**
   * Get stored language from localStorage
   */
  getStoredLanguage() {
    return localStorage.getItem('preferred-language');
  }

  /**
   * Store language preference
   */
  setStoredLanguage(lang) {
    localStorage.setItem('preferred-language', lang);
  }

  /**
   * Load translation file
   */
  async loadTranslations(lang) {
    try {
      // Determine the correct path based on current location
      const scriptPath = document.currentScript?.src || '';
      let basePath = './shared/locales/';
      
      // If we're in a subdirectory (like pages/), adjust the path
      if (scriptPath.includes('/pages/') || window.location.pathname.includes('/pages/')) {
        basePath = '../shared/locales/';
      }
      
      const response = await fetch(`${basePath}${lang}.json`);
      if (!response.ok) {
        throw new Error(`Failed to load ${lang} translations`);
      }
      const translations = await response.json();
      this.translations[lang] = translations;
      return translations;
    } catch (error) {
      console.error(`Error loading translations for ${lang}:`, error);
      // Fallback to English if loading fails
      if (lang !== 'en') {
        return this.loadTranslations('en');
      }
      return {};
    }
  }

  /**
   * Initialize i18n system
   */
  async init() {
    if (this.initialized) {
      return;
    }

    // Load current language
    await this.loadTranslations(this.currentLang);
    
    // Preload the other language
    const otherLang = this.currentLang === 'en' ? 'ar' : 'en';
    await this.loadTranslations(otherLang);

    // Apply language to DOM
    this.applyLanguage(this.currentLang);
    
    // Create language switcher if it doesn't exist
    this.createLanguageSwitcher();
    
    this.initialized = true;
  }

  /**
   * Get translation by key
   */
  t(key, fallback = '') {
    if (!this.translations[this.currentLang]) {
      return fallback || key;
    }

    const keys = key.split('.');
    let value = this.translations[this.currentLang];

    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        return fallback || key;
      }
    }

    return value || fallback || key;
  }

  /**
   * Apply language to DOM
   */
  applyLanguage(lang) {
    const html = document.documentElement;
    const translations = this.translations[lang];

    if (!translations) {
      console.error(`Translations not loaded for ${lang}`);
      return;
    }

    // Set HTML attributes
    html.setAttribute('lang', lang);
    html.setAttribute('dir', translations.dir || 'ltr');

    // Update document title if translation exists
    const titleKey = document.body.dataset.pageTitle;
    if (titleKey) {
      document.title = this.t(titleKey);
    }

    // Update all elements with data-i18n attribute
    document.querySelectorAll('[data-i18n]').forEach(element => {
      const key = element.dataset.i18n;
      const translation = this.t(key);
      
      if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
        element.placeholder = translation;
      } else {
        element.textContent = translation;
      }
    });

    // Update all elements with data-i18n-title attribute
    document.querySelectorAll('[data-i18n-title]').forEach(element => {
      const key = element.dataset.i18nTitle;
      element.title = this.t(key);
    });

    // Update all elements with data-i18n-aria attribute
    document.querySelectorAll('[data-i18n-aria]').forEach(element => {
      const key = element.dataset.i18nAria;
      element.setAttribute('aria-label', this.t(key));
    });

    // Dispatch language change event
    window.dispatchEvent(new CustomEvent('languageChanged', { 
      detail: { lang, dir: translations.dir } 
    }));
  }

  /**
   * Switch to a different language
   */
  async switchLanguage(lang) {
    if (!['en', 'ar'].includes(lang)) {
      console.error(`Unsupported language: ${lang}`);
      return;
    }

    if (lang === this.currentLang) {
      return;
    }

    // Load translations if not already loaded
    if (!this.translations[lang]) {
      await this.loadTranslations(lang);
    }

    this.currentLang = lang;
    this.setStoredLanguage(lang);
    this.applyLanguage(lang);

    // Update URL parameter
    const url = new URL(window.location);
    url.searchParams.set('lang', lang);
    window.history.replaceState({}, '', url);
  }

  /**
   * Toggle between English and Arabic
   */
  async toggleLanguage() {
    const newLang = this.currentLang === 'en' ? 'ar' : 'en';
    await this.switchLanguage(newLang);
  }

  /**
   * Create language switcher button
   */
  createLanguageSwitcher() {
    // Check if switcher already exists
    if (document.getElementById('lang-switcher')) {
      return;
    }

    const switcher = document.createElement('button');
    switcher.id = 'lang-switcher';
    switcher.className = 'lang-switcher';
    switcher.setAttribute('aria-label', 'Switch language');
    switcher.setAttribute('title', 'Switch language / تبديل اللغة');
    switcher.innerHTML = `
      <span class="lang-icon" aria-hidden="true">
        ${this.currentLang === 'en' ? 'ع' : 'EN'}
      </span>
    `;

    switcher.addEventListener('click', async () => {
      await this.toggleLanguage();
      switcher.querySelector('.lang-icon').textContent = 
        this.currentLang === 'en' ? 'ع' : 'EN';
    });

    // Add to page (try multiple locations)
    const navbar = document.querySelector('nav, header, .navbar');
    if (navbar) {
      navbar.appendChild(switcher);
    } else {
      document.body.appendChild(switcher);
    }
  }

  /**
   * Get current language
   */
  getCurrentLanguage() {
    return this.currentLang;
  }

  /**
   * Get current direction
   */
  getCurrentDirection() {
    return this.translations[this.currentLang]?.dir || 'ltr';
  }
}

// Create global instance
const i18n = new I18n();

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => i18n.init());
} else {
  i18n.init();
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = i18n;
}
