// Load unified app shell (top header + sidebar) in SPA pages.
(function loadUnifiedNavbar() {
  const MOBILE_BREAKPOINT = 980;
  const state = window.__GeoToolsNavbar || {
    mobileEventsBound: false,
    resizeBound: false,
    lastFocusedElement: null,
  };
  window.__GeoToolsNavbar = state;

  function navbarExists() {
    return document.querySelector(".navbar-unified") !== null;
  }

  function isMobileViewport() {
    return window.innerWidth <= MOBILE_BREAKPOINT;
  }

  function getBasePath() {
    const path = window.location.pathname || "";
    if (path.includes("/pages/") || path.includes("/_admin-generator/")) {
      return "..";
    }
    return ".";
  }

  function resolvePagePath(page) {
    const key = String(page || "").toLowerCase();
    const home = "index.html";
    const registry = window.GeoToolsRegistry;
    const hit = registry && typeof registry.getById === "function" ? registry.getById(key) : null;
    const target =
      key === "" || key === "home"
        ? home
        : hit && hit.pagePath
          ? hit.pagePath
          : `pages/${key}.html`;
    return `${getBasePath()}/${target}`;
  }

  function resolveSharedPath(fileName) {
    return `${getBasePath()}/shared/${fileName}`;
  }

  function getToolsList() {
    if (window.GeoToolsRegistry && typeof window.GeoToolsRegistry.list === "function") {
      return window.GeoToolsRegistry.list();
    }
    return [
      { id: "file-converter", title: "File Converter", pagePath: "pages/file-converter.html" },
      { id: "coordinate-tools", title: "Coordinate Tools", pagePath: "pages/coordinate-tools.html" },
      { id: "dltm-converter", title: "DLTM Converter", pagePath: "pages/dltm-converter.html" },
      { id: "coordinate-transform", title: "Coordinate Transform", pagePath: "pages/coordinate-transform.html" },
      { id: "area-calculator", title: "Area Calculator", pagePath: "pages/area-calculator.html" },
    ];
  }

  function normalizePageName(value) {
    if (!value || value === "index" || value === "/") return "home";
    return String(value).toLowerCase();
  }

  function iconForPage(id) {
    const key = normalizePageName(id);
    if (key === "home") return "HM";
    if (key === "file-converter") return "FC";
    if (key === "coordinate-tools") return "CT";
    if (key === "dltm-converter") return "DL";
    if (key === "coordinate-transform") return "TR";
    if (key === "area-calculator") return "AR";
    return "PG";
  }

  function createNavButton(item, isMobile) {
    const btn = document.createElement("button");
    btn.className = "btn-nav-unified";
    btn.type = "button";
    btn.setAttribute("data-page", item.id || "");
    btn.setAttribute("aria-label", `${item.title} navigation`);
    if (isMobile) btn.setAttribute("role", "menuitem");

    const icon = document.createElement("span");
    icon.className = "nav-item-icon";
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = iconForPage(item.id);

    const label = document.createElement("span");
    label.className = "nav-item-label";
    label.textContent = item.title;

    btn.appendChild(icon);
    btn.appendChild(label);
    return btn;
  }

  function buildMenuItems(container, isMobile) {
    if (!container) return;
    container.innerHTML = "";

    const homeItem = { id: "", title: "Maps" };
    container.appendChild(createNavButton(homeItem, isMobile));

    getToolsList()
      .filter((tool) => normalizePageName(tool.id) !== "home")
      .forEach((tool) => {
        container.appendChild(createNavButton(tool, isMobile));
      });
  }

  function openSidebar() {
    document.body.classList.add("sidebar-open");
    const hamburger = document.querySelector(".hamburger-menu");
    if (hamburger) {
      hamburger.classList.add("active");
      hamburger.setAttribute("aria-expanded", "true");
    }
  }

  function closeSidebar(restoreFocus) {
    document.body.classList.remove("sidebar-open");
    const hamburger = document.querySelector(".hamburger-menu");
    if (hamburger) {
      hamburger.classList.remove("active");
      hamburger.setAttribute("aria-expanded", "false");
      if (restoreFocus && state.lastFocusedElement && state.lastFocusedElement.focus) {
        state.lastFocusedElement.focus();
      }
    }
  }

  function navigateToPage(page) {
    if (typeof window.loadPage === "function") {
      const result = window.loadPage(page || "");
      if (result && typeof result.then === "function") {
        result.finally(() => {
          if (typeof window.updatePageIndicator === "function") {
            window.updatePageIndicator(page || "home");
          }
        });
      } else if (typeof window.updatePageIndicator === "function") {
        window.updatePageIndicator(page || "home");
      }
      return;
    }
    window.location.href = resolvePagePath(page || "");
  }

  function setupNavbarButtonHandlers() {
    const buttons = document.querySelectorAll(".btn-nav-unified:not([data-nav-bound='true'])");
    buttons.forEach((btn) => {
      btn.dataset.navBound = "true";
      btn.addEventListener("click", function () {
        const page = this.getAttribute("data-page") || "";
        const shouldClose = isMobileViewport();
        navigateToPage(page);
        if (shouldClose) {
          closeSidebar(false);
        }
      });
    });
  }

  window.updatePageIndicator = function (activePage) {
    const navButtons = document.querySelectorAll(".btn-nav-unified");
    const currentFromPath = window.location.pathname.split("/").pop().replace(".html", "");
    const currentPage = normalizePageName(activePage || currentFromPath);

    navButtons.forEach((btn) => {
      const btnPage = normalizePageName(btn.getAttribute("data-page"));
      if (btnPage === currentPage) {
        btn.setAttribute("aria-current", "page");
      } else {
        btn.removeAttribute("aria-current");
      }
    });
  };

  function mountShellContent() {
    const slot = document.getElementById("shell-main-slot");
    const appContainer = document.getElementById("app-container");
    const legalLine = document.querySelector(".legal-line");
    if (slot && appContainer && appContainer.parentElement !== slot) {
      slot.appendChild(appContainer);
    }
    if (slot && legalLine && legalLine.parentElement !== slot) {
      slot.appendChild(legalLine);
    }
    document.body.classList.add("shell-mounted");
  }

  function bindMobileEventsOnce() {
    if (state.mobileEventsBound) return;
    state.mobileEventsBound = true;

    document.addEventListener("click", (e) => {
      const hamburger = document.querySelector(".hamburger-menu");
      const backdrop = document.querySelector("[data-sidebar-backdrop]");
      if (hamburger && e.target.closest(".hamburger-menu")) {
        e.preventDefault();
        state.lastFocusedElement = document.activeElement;
        if (document.body.classList.contains("sidebar-open")) {
          closeSidebar(false);
        } else {
          openSidebar();
        }
        return;
      }
      if (backdrop && e.target === backdrop) {
        closeSidebar(true);
      }
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && document.body.classList.contains("sidebar-open")) {
        e.preventDefault();
        closeSidebar(true);
      }
    });
  }

  function syncViewportMode() {
    if (!isMobileViewport()) {
      closeSidebar(false);
    }
  }

  function ensureShellReady() {
    buildMenuItems(document.querySelector(".nav-links-unified"), false);
    setupNavbarButtonHandlers();
    mountShellContent();
    if (typeof window.updatePageIndicator === "function") {
      window.updatePageIndicator("home");
    }
    bindMobileEventsOnce();
    syncViewportMode();
  }

  async function loadNavbar() {
    if (navbarExists()) {
      ensureShellReady();
      return;
    }

    try {
      const response = await fetch(resolveSharedPath("navbar.html"));
      const navbarHTML = await response.text();
      const tempDiv = document.createElement("div");
      tempDiv.innerHTML = navbarHTML;

      const cssLink = tempDiv.querySelector("link[rel~='stylesheet']");
      if (cssLink) {
        cssLink.href = resolveSharedPath("css/navbar.css");
        cssLink.dataset.navbarStyle = "true";
      }

      const bodyTop = document.body.firstChild;
      while (tempDiv.firstChild) {
        document.body.insertBefore(tempDiv.firstChild, bodyTop);
      }

      const logo = document.querySelector(".nav-logo-unified");
      if (logo) {
        logo.setAttribute("href", resolvePagePath(""));
      }

      ensureShellReady();

      if (!state.resizeBound) {
        state.resizeBound = true;
        let resizeTimer;
        window.addEventListener("resize", () => {
          clearTimeout(resizeTimer);
          resizeTimer = setTimeout(syncViewportMode, 120);
        });
      }
    } catch (error) {
      console.warn("Failed to load navbar:", error);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      loadNavbar();
    });
  } else {
    loadNavbar();
  }
})();
