// GeoTools Suite - dashboard card builder driven by GeoToolsRegistry
(function () {
  function getToolMeta(id) {
    switch (String(id || "").toLowerCase()) {
      case "file-converter":
        return { badge: "Import", tag: "Files + map" };
      case "coordinate-tools":
        return { badge: "Hub", tag: "DLTM + UTM" };
      case "new-work":
        return { badge: "Hub", tag: "Gate + topo" };
      case "orthometric-height":
        return { badge: "Geoid", tag: "h to H" };
      case "coordinate-z-check":
        return { badge: "QA", tag: "Before / after" };
      case "coordinate-transform":
        return { badge: "Legacy", tag: "Quick convert" };
      case "area-calculator":
        return { badge: "Measure", tag: "Area + lines" };
      default:
        return { badge: "Tool", tag: "Open" };
    }
  }

  function syncSummaryCount(group, total) {
    document.querySelectorAll(`[data-tool-count-label="${group}"]`).forEach((node) => {
      node.textContent = `${total} tools ready`;
    });
  }

  function getEmptyStateCopy(group) {
    switch (String(group || "").toLowerCase()) {
      case "site-tools":
        return {
          title: "Site tools will appear here",
          desc: "This section is ready for website utilities and internal shortcuts as soon as they are added.",
        };
      default:
        return {
          title: "No tools available yet",
          desc: "Add a tool to this group in the registry and it will appear automatically.",
        };
    }
  }

  function buildEmptyState(group) {
    const copy = getEmptyStateCopy(group);
    const state = document.createElement("div");
    state.className = "grid-empty-state";
    state.setAttribute("role", "status");

    const title = document.createElement("h3");
    title.textContent = copy.title;

    const desc = document.createElement("p");
    desc.textContent = copy.desc;

    state.appendChild(title);
    state.appendChild(desc);
    return state;
  }

  function buildCard(tool, index) {
    const meta = getToolMeta(tool.id);
    const btn = document.createElement("button");
    btn.className = "card";
    btn.type = "button";
    btn.setAttribute("aria-label", `Open ${tool.title} tool`);
    btn.style.setProperty("--card-index", String(index + 1));
    btn.addEventListener("click", () => navigate(tool));

    const main = document.createElement("div");
    main.className = "card-main";

    const iconBox = document.createElement("div");
    iconBox.className = "icon-box";
    iconBox.textContent = tool.icon || "GT";

    const copy = document.createElement("div");
    copy.className = "card-copy";

    const title = document.createElement("h2");
    title.textContent = tool.title;

    const desc = document.createElement("p");
    desc.textContent = tool.desc;

    copy.appendChild(title);
    copy.appendChild(desc);

    main.appendChild(iconBox);
    main.appendChild(copy);

    const side = document.createElement("div");
    side.className = "card-side";

    const badge = document.createElement("span");
    badge.className = "card-badge";
    badge.textContent = meta.badge;

    const tag = document.createElement("span");
    tag.className = "card-tag";
    tag.textContent = meta.tag;

    const arrow = document.createElement("span");
    arrow.className = "card-arrow";
    arrow.setAttribute("aria-hidden", "true");
    arrow.textContent = ">";

    side.appendChild(badge);
    side.appendChild(tag);
    side.appendChild(arrow);

    btn.appendChild(main);
    btn.appendChild(side);
    return btn;
  }

  function listToolsByGroup(group) {
    if (!window.GeoToolsRegistry) return [];
    if (typeof window.GeoToolsRegistry.listByGroup === "function") {
      return window.GeoToolsRegistry.listByGroup(group);
    }
    if (typeof window.GeoToolsRegistry.list === "function") {
      return window.GeoToolsRegistry
        .list()
        .filter((tool) => String(tool.group || "geotools").toLowerCase() === group);
    }
    return [];
  }

  function renderGroup(grid, group) {
    if (!grid) {
      return;
    }

    grid.innerHTML = "";
    const tools = listToolsByGroup(group);
    syncSummaryCount(group, tools.length);

    if (!tools.length) {
      grid.appendChild(buildEmptyState(group));
      return;
    }

    tools.forEach((tool, index) => {
      grid.appendChild(buildCard(tool, index));
    });
  }

  function renderCards() {
    const grids = document.querySelectorAll("[data-tools-grid]");
    if (!grids.length || !window.GeoToolsRegistry || typeof window.GeoToolsRegistry.list !== "function") {
      const fallbackGrid = document.querySelector(".grid");
      if (fallbackGrid) {
        renderGroup(fallbackGrid, "geotools");
      }
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
