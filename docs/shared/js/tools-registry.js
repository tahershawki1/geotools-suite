// GeoTools Suite — single source of truth for tools metadata
(function () {
  // Ordered list defines navbar and dashboard order.
  const tools = [
    {
      id: "file-converter",
      title: "File Converter (SDR)",
      desc: "Convert survey CSV/TXT files, SDR export, live map preview.",
      pagePath: "pages/file-converter.html",
      icon: "📂",
    },
    {
      id: "coordinate-tools",
      title: "Coordinate Tools",
      desc: "WGS84 ⇄ UTM + DLTM conversions with batch/export.",
      pagePath: "pages/coordinate-tools.html",
      icon: "🧭",
    },
    // Legacy tools kept temporarily until unified coordinate-tools is complete
    {
      id: "dltm-converter",
      title: "DLTM Converter (Legacy)",
      desc: "Dubai local DLTM ↔ WGS84/UTM conversions.",
      pagePath: "pages/dltm-converter.html",
      icon: "📍",
    },
    {
      id: "coordinate-transform",
      title: "Coordinate Transform (Legacy)",
      desc: "WGS84 ↔ UTM quick converter.",
      pagePath: "pages/coordinate-transform.html",
      icon: "🔄",
    },
    {
      id: "area-calculator",
      title: "Area Calculator",
      desc: "Auto area/perimeter from coordinates with drawing helpers.",
      pagePath: "pages/area-calculator.html",
      icon: "📐",
    },
  ];

  /**
   * Public registry API exposed on window.
   */
  window.GeoToolsRegistry = {
    list() {
      return [...tools];
    },
    getById(id) {
      return tools.find((t) => t.id === String(id || "").toLowerCase()) || null;
    },
    getByPath(path) {
      return tools.find((t) => t.pagePath === path) || null;
    },
  };
})();
