// GeoTools Suite — dashboard card builder driven by GeoToolsRegistry
(function () {
  /**
   * Build tool cards into the dashboard grid.
   */
  function renderCards() {
    const grid = document.querySelector("[data-tools-grid]") || document.querySelector(".grid");
    if (!grid || !window.GeoToolsRegistry || typeof window.GeoToolsRegistry.list !== "function") {
      return;
    }

    grid.innerHTML = "";
    const tools = window.GeoToolsRegistry.list();

    tools.forEach((tool) => {
      const btn = document.createElement("button");
      btn.className = "card";
      btn.type = "button";
      btn.setAttribute("aria-label", `Open ${tool.title} tool`);
      btn.addEventListener("click", () => navigate(tool));

      // icon box
      const iconBox = document.createElement("div");
      iconBox.className = "icon-box";
      iconBox.textContent = tool.icon || "🛠️";

      const h2 = document.createElement("h2");
      h2.textContent = tool.title;

      const p = document.createElement("p");
      p.textContent = tool.desc;

      btn.appendChild(iconBox);
      btn.appendChild(h2);
      btn.appendChild(p);
      grid.appendChild(btn);
    });
  }

  /**
   * SPA-aware navigation; falls back to full page load.
   */
  function navigate(tool) {
    const id = tool.id;
    if (typeof window.loadPage === "function") {
      window.loadPage(id);
      return;
    }
    // Fallback to direct link
    const href = tool.pagePath.startsWith(".") ? tool.pagePath : `./${tool.pagePath}`;
    window.location.href = href;
  }

  window.renderDashboardCards = renderCards;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", renderCards);
  } else {
    renderCards();
  }
})();
