// GeoTools Suite - Mobile app dashboard card builder
(function () {

  const TOOL_META = {
    "file-converter": {
      badge: "Import",
      badgeClass: "badge-cyan",
      shortDesc: "Convert SDR/CSV files with map preview",
    },
    "coordinate-tools": {
      badge: "Hub",
      badgeClass: "badge-indigo",
      shortDesc: "WGS84, UTM & DLTM workspace",
    },
    "new-work": {
      badge: "Work",
      badgeClass: "badge-violet",
      shortDesc: "Gate Level and Survey Topo access",
    },
    "orthometric-height": {
      badge: "Geoid",
      badgeClass: "badge-green",
      shortDesc: "h to H using EGM2008 model",
    },
    "coordinate-z-check": {
      badge: "QA",
      badgeClass: "badge-amber",
      shortDesc: "Before / after level comparison",
    },
    "coordinate-transform": {
      badge: "Legacy",
      badgeClass: "badge-blue",
      shortDesc: "WGS84 ↔ UTM quick converter",
    },
    "area-calculator": {
      badge: "Measure",
      badgeClass: "badge-pink",
      shortDesc: "Area & perimeter from coordinates",
    },
  };

  function getToolMeta(id) {
    return TOOL_META[String(id || "").toLowerCase()] || {
      badge: "Tool",
      badgeClass: "badge-cyan",
      shortDesc: "Survey utility",
    };
  }

  const ARROW_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="9 18 15 12 9 6"/></svg>`;

  function buildCard(tool, index) {
    const meta = getToolMeta(tool.id);

    const btn = document.createElement("button");
    btn.className = "card";
    btn.type = "button";
    btn.setAttribute("aria-label", `Open ${tool.title}`);
    btn.style.setProperty("--card-index", String(index + 1));
    btn.addEventListener("click", () => navigate(tool));

    // Icon box
    const iconBox = document.createElement("div");
    iconBox.className = "icon-box";
    iconBox.setAttribute("data-tool", tool.id);
    iconBox.textContent = tool.icon || "GT";

    // Card copy
    const copy = document.createElement("div");
    copy.className = "card-copy";

    const title = document.createElement("h2");
    title.textContent = tool.title;

    const desc = document.createElement("p");
    desc.textContent = meta.shortDesc || tool.desc;

    copy.appendChild(title);
    copy.appendChild(desc);

    // Footer
    const footer = document.createElement("div");
    footer.className = "card-footer";

    const badge = document.createElement("span");
    badge.className = `card-badge ${meta.badgeClass}`;
    badge.textContent = meta.badge;

    const arrow = document.createElement("span");
    arrow.className = "card-arrow";
    arrow.innerHTML = ARROW_SVG;

    footer.appendChild(badge);
    footer.appendChild(arrow);

    btn.appendChild(iconBox);
    btn.appendChild(copy);
    btn.appendChild(footer);

    return btn;
  }

  function buildEmptyState() {
    const el = document.createElement("div");
    el.className = "grid-empty-state";
    el.setAttribute("role", "status");

    const title = document.createElement("h3");
    title.textContent = "No tools available";

    const desc = document.createElement("p");
    desc.textContent = "Tools added to this group will appear here automatically.";

    el.appendChild(title);
    el.appendChild(desc);
    return el;
  }

  function listToolsByGroup(group) {
    if (!window.GeoToolsRegistry) return [];
    if (typeof window.GeoToolsRegistry.listByGroup === "function") {
      return window.GeoToolsRegistry.listByGroup(group);
    }
    if (typeof window.GeoToolsRegistry.list === "function") {
      return window.GeoToolsRegistry.list().filter(
        (t) => String(t.group || "geotools").toLowerCase() === group,
      );
    }
    return [];
  }

  function syncCount(group, total) {
    document.querySelectorAll(`[data-tool-count-label="${group}"]`).forEach((el) => {
      el.textContent = String(total);
    });
  }

  function renderGroup(grid, group) {
    if (!grid) return;
    grid.innerHTML = "";
    const tools = listToolsByGroup(group);
    syncCount(group, tools.length);

    if (!tools.length) {
      grid.appendChild(buildEmptyState());
      return;
    }

    tools.forEach((tool, i) => grid.appendChild(buildCard(tool, i)));
  }

  function renderCards() {
    const grids = document.querySelectorAll("[data-tools-grid]");
    if (!grids.length || !window.GeoToolsRegistry) {
      const fallback = document.querySelector(".grid");
      if (fallback) renderGroup(fallback, "geotools");
      return;
    }
    grids.forEach((grid) => {
      const group = String(grid.getAttribute("data-tools-grid") || "geotools").toLowerCase();
      renderGroup(grid, group);
    });
  }

  function navigate(tool) {
    const href = tool.pagePath.startsWith(".") ? tool.pagePath : `./${tool.pagePath}`;
    if (tool.mode === "direct" || tool.direct === true) {
      window.location.href = href;
      return;
    }
    if (typeof window.loadPage === "function") {
      window.loadPage(tool.id);
      return;
    }
    window.location.href = href;
  }

  window.renderDashboardCards = renderCards;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", renderCards);
  } else {
    renderCards();
  }
})();
