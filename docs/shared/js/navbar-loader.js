// GeoTools Suite - Mobile App Navigation Loader
(function loadUnifiedNavbar() {
  const state = window.__GeoToolsNavbar || {
    drawerOpen: false,
    drawerEventsBound: false,
    resizeBound: false,
  };
  window.__GeoToolsNavbar = state;

  // ── SVG icon library ──────────────────────────────────────
  const ICONS = {
    home: `<svg viewBox="0 0 24 24"><path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"/><polyline points="9 21 9 12 15 12 15 21"/></svg>`,
    "coordinate-tools": `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M19.07 4.93l-2.83 2.83M7.76 16.24l-2.83 2.83"/></svg>`,
    "file-converter": `<svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>`,
    "area-calculator": `<svg viewBox="0 0 24 24"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/><line x1="9" y1="3" x2="9" y2="18"/><line x1="15" y1="6" x2="15" y2="21"/></svg>`,
    more: `<svg viewBox="0 0 24 24"><circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/></svg>`,
    "orthometric-height": `<svg viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>`,
    "coordinate-z-check": `<svg viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/><circle cx="12" cy="12" r="2"/></svg>`,
    "coordinate-transform": `<svg viewBox="0 0 24 24"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 014-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 01-4 4H3"/></svg>`,
    "new-work": `<svg viewBox="0 0 24 24"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>`,
    default: `<svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>`,
  };

  function getIcon(id) {
    return ICONS[id] || ICONS.default;
  }

  // ── Bottom nav tabs (primary 5) ────────────────────────────
  const PRIMARY_TABS = [
    { id: "",                   label: "Home",   icon: "home" },
    { id: "coordinate-tools",   label: "Coords", icon: "coordinate-tools" },
    { id: "file-converter",     label: "Files",  icon: "file-converter" },
    { id: "area-calculator",    label: "Area",   icon: "area-calculator" },
  ];

  // ── Tools shown in "More" drawer ───────────────────────────
  const DRAWER_TOOLS = [
    "orthometric-height",
    "coordinate-z-check",
    "coordinate-transform",
    "new-work",
  ];

  function navbarExists() {
    return document.querySelector(".app-header") !== null;
  }

  function getBasePath() {
    return window.location.pathname.includes("/pages/") ? ".." : ".";
  }

  function resolveSharedPath(fileName) {
    return `${getBasePath()}/shared/${fileName}`;
  }

  function normalizePageName(value) {
    if (!value || value === "index" || value === "/") return "home";
    return String(value).toLowerCase();
  }

  function navigateToPage(pageId) {
    const key = String(pageId || "").toLowerCase();
    const registry = window.GeoToolsRegistry;
    const entry = registry && typeof registry.getById === "function" ? registry.getById(key) : null;

    if (entry && (entry.mode === "direct" || entry.direct === true)) {
      const path = getBasePath() + "/" + (entry.pagePath || `pages/${key}.html`);
      window.location.href = path;
      return;
    }

    if (typeof window.loadPage === "function") {
      window.loadPage(key);
    } else {
      const path = getBasePath() + "/" + (entry ? entry.pagePath : `pages/${key}.html`);
      window.location.href = path;
    }
  }

  // ── Build bottom nav ──────────────────────────────────────

  function buildBottomNav(container) {
    if (!container) return;
    container.innerHTML = "";

    PRIMARY_TABS.forEach(({ id, label, icon }) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "btn-nav-unified";
      btn.setAttribute("data-page", id);
      btn.setAttribute("aria-label", label);

      const iconWrap = document.createElement("span");
      iconWrap.className = "nav-item-icon-wrap";

      const iconSpan = document.createElement("span");
      iconSpan.className = "nav-item-icon";
      iconSpan.innerHTML = getIcon(icon);

      const labelSpan = document.createElement("span");
      labelSpan.className = "nav-item-label";
      labelSpan.textContent = label;

      iconWrap.appendChild(iconSpan);
      btn.appendChild(iconWrap);
      btn.appendChild(labelSpan);

      btn.addEventListener("click", () => {
        closeDrawer();
        navigateToPage(id);
        updatePageIndicator(id || "home");
      });

      container.appendChild(btn);
    });

    // "More" button
    const moreBtn = document.createElement("button");
    moreBtn.type = "button";
    moreBtn.className = "btn-nav-unified";
    moreBtn.id = "more-tab-btn";
    moreBtn.setAttribute("data-page", "more");
    moreBtn.setAttribute("aria-label", "More tools");

    const moreIconWrap = document.createElement("span");
    moreIconWrap.className = "nav-item-icon-wrap";

    const moreIcon = document.createElement("span");
    moreIcon.className = "nav-item-icon";
    moreIcon.innerHTML = getIcon("more");

    const moreLabel = document.createElement("span");
    moreLabel.className = "nav-item-label";
    moreLabel.textContent = "More";

    moreIconWrap.appendChild(moreIcon);
    moreBtn.appendChild(moreIconWrap);
    moreBtn.appendChild(moreLabel);

    moreBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (state.drawerOpen) { closeDrawer(); } else { openDrawer(); }
    });

    container.appendChild(moreBtn);
  }

  // ── Build "More" drawer ───────────────────────────────────

  const TOOL_BADGE_COLORS = {
    "orthometric-height":   "badge-green",
    "coordinate-z-check":  "badge-amber",
    "coordinate-transform": "badge-blue",
    "new-work":             "badge-violet",
  };

  const TOOL_GRADIENT_COLORS = {
    "orthometric-height":   "linear-gradient(135deg,#34d399,#10b981)",
    "coordinate-z-check":  "linear-gradient(135deg,#fbbf24,#f59e0b)",
    "coordinate-transform": "linear-gradient(135deg,#60a5fa,#3b82f6)",
    "new-work":             "linear-gradient(135deg,#a78bfa,#7c3aed)",
  };

  function buildDrawer(drawerGrid) {
    if (!drawerGrid) return;
    drawerGrid.innerHTML = "";

    const registry = window.GeoToolsRegistry;
    if (!registry) return;

    DRAWER_TOOLS.forEach((id) => {
      const tool = registry.getById(id);
      if (!tool) return;

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "drawer-item";

      const iconEl = document.createElement("div");
      iconEl.className = "drawer-item-icon";
      iconEl.style.background = TOOL_GRADIENT_COLORS[id] || "var(--surface-3)";
      iconEl.style.color = "#ffffff";
      iconEl.textContent = tool.icon || "GT";

      const textWrap = document.createElement("div");
      textWrap.className = "drawer-item-text";

      const nameEl = document.createElement("span");
      nameEl.className = "drawer-item-name";
      nameEl.textContent = tool.title;

      const descEl = document.createElement("span");
      descEl.className = "drawer-item-desc";
      descEl.textContent = tool.desc || "";

      textWrap.appendChild(nameEl);
      textWrap.appendChild(descEl);
      btn.appendChild(iconEl);
      btn.appendChild(textWrap);

      btn.addEventListener("click", () => {
        closeDrawer();
        navigateToPage(id);
      });

      drawerGrid.appendChild(btn);
    });
  }

  // ── Drawer open / close ───────────────────────────────────

  function openDrawer() {
    const drawer = document.getElementById("more-drawer");
    const backdrop = document.getElementById("drawer-backdrop");
    if (!drawer) return;
    state.drawerOpen = true;
    drawer.classList.add("open");
    drawer.setAttribute("aria-hidden", "false");
    if (backdrop) backdrop.classList.add("open");

    const moreBtn = document.getElementById("more-tab-btn");
    if (moreBtn) moreBtn.setAttribute("aria-current", "page");
  }

  function closeDrawer() {
    const drawer = document.getElementById("more-drawer");
    const backdrop = document.getElementById("drawer-backdrop");
    if (!drawer) return;
    state.drawerOpen = false;
    drawer.classList.remove("open");
    drawer.setAttribute("aria-hidden", "true");
    if (backdrop) backdrop.classList.remove("open");

    const moreBtn = document.getElementById("more-tab-btn");
    if (moreBtn) moreBtn.removeAttribute("aria-current");
  }

  // ── Page indicator update ─────────────────────────────────

  window.updatePageIndicator = function (activePage) {
    const currentPage = normalizePageName(activePage);

    document.body.setAttribute("data-active-page", currentPage);

    const navButtons = document.querySelectorAll(".btn-nav-unified:not(#more-tab-btn)");
    navButtons.forEach((btn) => {
      const btnPage = normalizePageName(btn.getAttribute("data-page"));
      if (btnPage === currentPage) {
        btn.setAttribute("aria-current", "page");
      } else {
        btn.removeAttribute("aria-current");
      }
    });

    const registry = window.GeoToolsRegistry;
    const entry = registry && typeof registry.getById === "function"
      ? registry.getById(currentPage)
      : null;
    const label = currentPage === "home" ? "Survey Suite" : (entry ? entry.title : "Workspace");

    const pageLabel = document.querySelector("[data-current-page-label]");
    if (pageLabel) pageLabel.textContent = label;
  };

  // ── Mount shell content ───────────────────────────────────

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

  // ── Bind global events ────────────────────────────────────

  function bindEventsOnce() {
    if (state.drawerEventsBound) return;
    state.drawerEventsBound = true;

    document.addEventListener("click", (e) => {
      if (state.drawerOpen) {
        const drawer = document.getElementById("more-drawer");
        const moreBtn = document.getElementById("more-tab-btn");
        if (drawer && !drawer.contains(e.target) && moreBtn && !moreBtn.contains(e.target)) {
          closeDrawer();
        }
      }
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && state.drawerOpen) {
        e.preventDefault();
        closeDrawer();
      }
    });

    const backdrop = document.getElementById("drawer-backdrop");
    if (backdrop) {
      backdrop.addEventListener("click", () => closeDrawer());
    }
  }

  // ── Back button ───────────────────────────────────────────

  function bindBackButton() {
    const backBtn = document.getElementById("header-back-btn");
    if (!backBtn || backBtn.dataset.backBound) return;
    backBtn.dataset.backBound = "true";
    backBtn.addEventListener("click", () => {
      closeDrawer();
      if (typeof window.loadPage === "function") {
        window.loadPage("");
      } else {
        window.location.href = getBasePath() + "/index.html";
      }
      updatePageIndicator("home");
    });
  }

  // ── Main init ────────────────────────────────────────────

  function ensureShellReady() {
    buildBottomNav(document.getElementById("bottom-nav-links"));
    buildDrawer(document.getElementById("drawer-grid"));
    mountShellContent();
    updatePageIndicator("home");
    bindEventsOnce();
    bindBackButton();
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
      }

      const bodyTop = document.body.firstChild;
      while (tempDiv.firstChild) {
        document.body.insertBefore(tempDiv.firstChild, bodyTop);
      }

      ensureShellReady();
    } catch (error) {
      console.warn("Failed to load navbar:", error);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", loadNavbar);
  } else {
    loadNavbar();
  }
})();
