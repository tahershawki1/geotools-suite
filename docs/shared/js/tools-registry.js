// GeoTools Suite - single source of truth for tools metadata
(function () {
  // Ordered list defines navbar and dashboard order.
  const tools = [
    {
      id: "file-converter",
      title: "File Converter (SDR)",
      desc: "Convert survey CSV/TXT files, SDR export, live map preview.",
      pagePath: "pages/file-converter.html",
      icon: "FC",
      group: "geotools",
    },
    {
      id: "coordinate-tools",
      title: "Coordinate Tools",
      desc: "Unified WGS84, UTM, and DLTM workspace with batch/export.",
      pagePath: "pages/coordinate-tools.html",
      icon: "CT",
      group: "geotools",
    },
    {
      id: "new-work",
      title: "New work",
      desc: "Quick access workspace for Gate Level and Survey Topo pages.",
      pagePath: "pages/new-work.html",
      icon: "NW",
      group: "site-tools",
    },
    {
      id: "orthometric-height",
      title: "Orthometric Height",
      desc: "Convert ellipsoidal height h to orthometric height H with EGM2008.",
      pagePath: "pages/orthometric-height.html",
      icon: "OH",
      group: "geotools",
    },
    {
      id: "coordinate-z-check",
      title: "Before / After Level Check",
      desc: "Compare converted points against calculated H from before-conversion source files.",
      pagePath: "pages/coordinate-z-check.html",
      icon: "ZC",
      direct: true,
      group: "geotools",
    },
    {
      id: "coordinate-transform",
      title: "Coordinate Transform (Legacy)",
      desc: "WGS84 <-> UTM quick converter.",
      pagePath: "pages/coordinate-transform.html",
      icon: "TR",
      group: "geotools",
    },
    {
      id: "area-calculator",
      title: "Area Calculator",
      desc: "Auto area/perimeter from coordinates with drawing helpers.",
      pagePath: "pages/area-calculator.html",
      icon: "AR",
      group: "geotools",
    },
  ];

  const hiddenRoutes = [
    {
      id: "coordinate-tools-batch",
      title: "Batch Conversion",
      pagePath: "pages/coordinate-tools-batch.html",
    },
    {
      id: "coordinate-tools-reverse",
      title: "WGS84 to DLTM",
      pagePath: "pages/coordinate-tools-reverse.html",
    },
    {
      id: "new-work-gate-level",
      title: "Gate Level",
      pagePath: "pages/new-work-gate-level.html",
    },
    {
      id: "new-work-survey-topo",
      title: "Survey Topo",
      pagePath: "pages/new-work-survey-topo.html",
    },
  ];

  function findById(id) {
    const key = String(id || "").toLowerCase();
    return [...tools, ...hiddenRoutes].find((tool) => tool.id === key) || null;
  }

  function findByPath(path) {
    return [...tools, ...hiddenRoutes].find((tool) => tool.pagePath === path) || null;
  }

  window.GeoToolsRegistry = {
    list() {
      return [...tools];
    },
    listByGroup(group) {
      const key = String(group || "").toLowerCase();
      if (!key) return [...tools];
      return tools.filter((tool) => String(tool.group || "geotools").toLowerCase() === key);
    },
    getById(id) {
      return findById(id);
    },
    getByPath(path) {
      return findByPath(path);
    },
  };
})();
