// GeoTools Suite - File Converter (multi-file + manual + live map)
// All blocks are commented to clarify purpose and avoid SPA regressions.
(function () {
  // ---------- State ----------
  // Expanded palette (20 distinct colors) to avoid re-use quickly.

  const colors = [
    "#005F73", "#0A9396", "#94D2BD", "#EE9B00", "#CA6702",
    "#BB3E03", "#d946ef", "#9B2226", "#3A86FF", "#8338EC",
    "#FF006E", "#FB5607", "#06D6A0", "#118AB2", "#073B4C",
    "#2B9348", "#80B918", "#FFBE0B", "#5E60CE", "#4D908E",
  ];


  const manualColor = "#111827";
  const state = {
    map: null,
    baseLayer: null,
    mode: "local", // default to local so planar coords show immediately
    datasets: new Map(), // Map<fileName, {name,color,points,layer}>
    manualPoints: [],
    manualLayer: null,
    order: "P,N,E,CODE",
    crs: "dltm", // will be auto-adjusted per dataset
    pendingGlobal: false,
    measureActive: false,
    measurePoints: [],
    measureLayer: null,
    measureTotalMeters: 0,
  };

  // ---------- Elements ----------
  const el = {
    filesInput: document.getElementById("csvFiles"),
    fileList: document.getElementById("fileList"),
    clearAllBtn: document.getElementById("clearAllBtn"),
    crsSelect: document.getElementById("crsSelect"),
    orderSelect: document.getElementById("orderSelect"),
    orderHint: document.getElementById("orderHint"),
    previewBox: document.getElementById("previewBox"),
    manualInput: document.getElementById("manualInput"),
    manualSwatch: document.getElementById("manualSwatch"),
    crsWarning: document.getElementById("crsWarning"),
    mapEl: document.getElementById("map"),
    exportBtn: document.getElementById("exportBtn"),
    status: document.getElementById("status"),
    zoomInBtn: document.getElementById("zoomInBtn"),
    zoomOutBtn: document.getElementById("zoomOutBtn"),
    zoomExtBtn: document.getElementById("zoomExtBtn"),
    mapModeBtn: document.getElementById("mapModeBtn"),
    measureBtn: document.getElementById("measureBtn"),
    measureTotal: document.getElementById("measureTotal"),
  };

  let exportController = null;

  // ---------- Init ----------
  // Abort early if Leaflet is missing to avoid breaking page.
  if (!window.L) {
    console.error("Leaflet is not loaded. Check vendor/leaflet assets.");
    if (window.showError) window.showError("Map library missing (Leaflet).", "Map Error");
    return;
  }

  init();

  function init() {
    // Show manual color swatch.
    if (el.manualSwatch) el.manualSwatch.style.background = manualColor;
    if (window.GeoCRS && typeof window.GeoCRS.ready === "function") {
      window.GeoCRS.ready()
        .then(() => populateCrs(false))
        .catch(() => populateCrs(false));
    } else {
      populateCrs(false);
    }
    // Set default map mode to local
    state.mode = "local";
    bindEvents();
    initMap();
    updateMapModeButton();
    initExportController();

    window.addEventListener("geocrs:updated", () => {
      const previous = el.crsSelect ? el.crsSelect.value : "";
      populateCrs(true, previous);
    });
  }

  // Populate CRS dropdown from shared GeoCRS registry.
  function populateCrs(preserveSelection, previousValue) {
    if (!window.GeoCRS || typeof window.GeoCRS.list !== "function") {
      console.warn("GeoCRS registry missing; CRS list not populated.");
      return;
    }
    const list = window.GeoCRS.list();
    const previous =
      preserveSelection && previousValue !== undefined
        ? previousValue
        : preserveSelection && el.crsSelect
          ? el.crsSelect.value
          : "";
    el.crsSelect.innerHTML = "";
    // Add placeholder option
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "Please select a coordinate system";
    placeholder.disabled = true;
    placeholder.selected = !previous;
    el.crsSelect.appendChild(placeholder);
    list.forEach((crs) => {
      const opt = document.createElement("option");
      opt.value = crs.key;
      opt.textContent = crs.label;
      el.crsSelect.appendChild(opt);
    });
    if (previous && list.some((crs) => crs.key === previous)) {
      el.crsSelect.value = previous;
      state.crs = previous;
    } else {
      state.crs = "";
      el.crsSelect.value = "";
    }
  }

  // Wire up all event handlers with debouncing for manual input.
  function bindEvents() {
    el.filesInput.addEventListener("change", handleFiles);
    if (el.clearAllBtn) {
      el.clearAllBtn.addEventListener("click", clearAllInputs);
    }
    el.crsSelect.addEventListener("change", (e) => {
      state.crs = e.target.value;
      clearMeasure();
      clearCrsWarning();
      if (state.pendingGlobal) {
        state.pendingGlobal = false;
        setMapMode("global");
        return;
      }
      renderAll();
    });
    el.orderSelect.addEventListener("change", (e) => {
      state.order = e.target.value;
      renderAll();
    });
    if (el.mapModeBtn) {
      el.mapModeBtn.addEventListener("click", () => {
        if (state.mode === "local") {
          if (!hasCrsSelected()) {
            state.pendingGlobal = true;
            showCrsWarning();
            return;
          }
          setMapMode("global");
          return;
        }
        setMapMode("local");
      });
    }
    if (el.measureBtn) {
      el.measureBtn.addEventListener("click", toggleMeasure);
    }
    // Zoom controls
    if (el.zoomInBtn) el.zoomInBtn.addEventListener("click", () => {
      if (state.map) state.map.zoomIn();
    });
    if (el.zoomOutBtn) el.zoomOutBtn.addEventListener("click", () => {
      if (state.map) state.map.zoomOut();
    });
    if (el.zoomExtBtn) el.zoomExtBtn.addEventListener("click", () => {
      fitBounds(null);
    });
    el.exportBtn.addEventListener("click", handleExport);

    if (el.manualInput) {
      let debounce;
      el.manualInput.addEventListener("input", () => {
        clearTimeout(debounce);
        debounce = setTimeout(parseManual, 250);
      });
    }

    // Spacebar shortcut to fit bounds.
    document.addEventListener("keydown", (e) => {
      if (e.key === " " && !e.target.matches("input, textarea, select, button")) {
        e.preventDefault();
        fitBounds(null);
      }
    });
  }

  const CRS_WARNING_MESSAGE = "Please select a coordinate system";
  const MEASURE_HINT_MESSAGE = "اضغط على الخريطة لبدء القياس.";
  const MEASURE_DUPLICATE_EPS = 0.01;

  function hasCrsSelected() {
    return Boolean(el.crsSelect && el.crsSelect.value);
  }

  function updateMapModeButton() {
    if (!el.mapModeBtn) return;
    const isGlobal = state.mode === "global";
    el.mapModeBtn.textContent = isGlobal ? "📍 خريطة محلية" : "🌐 خريطة عالمية";
    el.mapModeBtn.setAttribute("aria-pressed", String(isGlobal));
  }

  function showCrsWarning() {
    if (el.crsWarning) el.crsWarning.textContent = "";
    if (el.crsSelect) {
      el.crsSelect.classList.add("crs-warning");
      el.crsSelect.scrollIntoView({ behavior: "smooth", block: "center" });
      if (typeof el.crsSelect.focus === "function") {
        el.crsSelect.focus({ preventScroll: true });
      }
    }
    if (typeof window.showWarning === "function") {
      window.showWarning(CRS_WARNING_MESSAGE, "CRS Required", 6000);
      return;
    }
    if (typeof window.showNotification === "function") {
      window.showNotification(CRS_WARNING_MESSAGE, "warning", "CRS Required", 6000);
      return;
    }
    if (el.status) el.status.textContent = CRS_WARNING_MESSAGE;
  }

  function clearCrsWarning() {
    if (el.crsWarning) el.crsWarning.textContent = "";
    if (el.crsSelect) el.crsSelect.classList.remove("crs-warning");
    if (el.status && el.status.textContent === CRS_WARNING_MESSAGE) {
      el.status.textContent = "";
    }
  }

  function getCrsType() {
    if (!window.GeoCRS || typeof window.GeoCRS.get !== "function") return null;
    const def = window.GeoCRS.get(state.crs);
    return def ? def.type : null;
  }

  function isGeographicMeasure() {
    const type = getCrsType();
    if (type === "geographic") return true;
    if (type === "projected") return false;
    return state.mode === "global";
  }

  function toProjectedCoord(latlng) {
    if (!latlng) return { x: 0, y: 0 };
    if (state.mode === "global" && state.crs && window.GeoCRS && typeof window.GeoCRS.convert === "function") {
      try {
        const conv = window.GeoCRS.convert({
          from: "epsg4326",
          to: state.crs,
          coord: { x: latlng.lng, y: latlng.lat },
        });
        if (Number.isFinite(conv.x) && Number.isFinite(conv.y)) {
          return { x: conv.x, y: conv.y };
        }
      } catch (_) {
        // fall back to lat/lng
      }
    }
    return { x: latlng.lng, y: latlng.lat };
  }

  function computeSegmentDistance(p1, p2) {
    if (!p1 || !p2) return 0;
    if (isGeographicMeasure()) {
      return p1.latlng.distanceTo(p2.latlng);
    }
    const dx = (p2.projected?.x ?? 0) - (p1.projected?.x ?? 0);
    const dy = (p2.projected?.y ?? 0) - (p1.projected?.y ?? 0);
    return Math.sqrt(dx * dx + dy * dy);
  }

  function formatDistance(meters) {
    if (!Number.isFinite(meters)) return "";
    if (meters >= 1000) {
      return `${(meters / 1000).toFixed(2)} km`;
    }
    return `${meters.toFixed(2)} m`;
  }

  function updateMeasureTotal() {
    if (!el.measureTotal) return;
    if (state.measurePoints.length < 2 || state.measureTotalMeters <= 0) {
      el.measureTotal.textContent = "";
      return;
    }
    el.measureTotal.textContent = `الإجمالي: ${formatDistance(state.measureTotalMeters)}`;
  }

  function setMeasureActive(active) {
    state.measureActive = Boolean(active);
    if (el.measureBtn) {
      el.measureBtn.classList.toggle("active", state.measureActive);
      el.measureBtn.setAttribute("aria-pressed", String(state.measureActive));
    }
  }

  function clearMeasure() {
    if (state.measureLayer) {
      state.measureLayer.clearLayers();
    }
    state.measurePoints = [];
    state.measureTotalMeters = 0;
    setMeasureActive(false);
    updateMeasureTotal();
  }

  function showMeasureHint() {
    if (typeof window.showInfo === "function") {
      window.showInfo(MEASURE_HINT_MESSAGE, "Measurement", 4500);
      return;
    }
    if (el.status) el.status.textContent = MEASURE_HINT_MESSAGE;
  }

  function toggleMeasure() {
    if (state.measureActive) {
      clearMeasure();
      return;
    }
    setMeasureActive(true);
    showMeasureHint();
  }

  function setMapMode(mode) {
    state.mode = mode === "global" ? "global" : "local";
    clearMeasure();
    initMap(true);
    renderAll();
    updateMapModeButton();
    setTimeout(() => state.map && state.map.invalidateSize(), 50);
  }

  function clearAllInputs() {
    if (el.filesInput) el.filesInput.value = "";
    if (el.manualInput) el.manualInput.value = "";
    if (el.fileList) el.fileList.innerHTML = "";
    if (el.previewBox) el.previewBox.textContent = "No points to preview.";
    if (el.status) el.status.textContent = "";

    state.datasets.clear();
    state.manualPoints = [];

    if (state.manualLayer && state.map) {
      state.map.removeLayer(state.manualLayer);
    }
    state.manualLayer = null;

    clearMeasure();
    clearCrsWarning();

    state.order = "P,N,E,CODE";
    if (el.orderSelect) el.orderSelect.value = "P,N,E,CODE";
    if (el.orderHint) el.orderHint.textContent = "Auto-detected: pending";

    state.crs = "";
    if (el.crsSelect) el.crsSelect.value = "";

    state.mode = "local";
    updateMapModeButton();
    initMap(true);
  }

  function collectExportPoints() {
    const all = [];
    state.datasets.forEach((ds) => {
      (ds.points || []).forEach((pt) => {
        all.push({
          p: pt.id ?? "",
          n: pt.n,
          e: pt.e,
          z: pt.z ?? null,
          code: pt.code ?? "",
        });
      });
    });
    (state.manualPoints || []).forEach((pt) => {
      all.push({
        p: pt.id ?? "",
        n: pt.n,
        e: pt.e,
        z: pt.z ?? null,
        code: pt.code ?? "",
      });
    });
    return all;
  }

  function buildExportSourceText() {
    const points = collectExportPoints();
    if (!points.length) return "";
    if (window.ConverterExport && typeof window.ConverterExport.pointsToCsv === "function") {
      return window.ConverterExport.pointsToCsv(points);
    }
    const rows = ["P,N,E,Z,Code"];
    points.forEach((pt) => {
      rows.push([pt.p || "", pt.n ?? "", pt.e ?? "", pt.z ?? "", pt.code ?? ""].join(","));
    });
    return rows.join("\n") + "\n";
  }

  function initExportController() {
    if (exportController) return;
    if (!window.ConverterExport || typeof window.ConverterExport.createExporter !== "function") return;
    exportController = window.ConverterExport.createExporter({
      apiBase: window.API_BASE,
      getSourceText: buildExportSourceText,
      getSourceIsSdr: () => false,
      getCoordFormat: () => "NEZ",
      getBaseName: () => {
        const first = state.datasets.keys().next();
        return first && !first.done ? first.value : "points";
      },
      setStatus: (msg) => (el.status.textContent = msg),
      hideStatus: () => (el.status.textContent = ""),
      getReturnFocusEl: () => el.exportBtn,
      onSdrReady: () => {},
    });
  }

  function getPopupTokens(pt) {
    if (pt && Array.isArray(pt.tokens) && pt.tokens.length) {
      return pt.tokens.slice();
    }
    return (state.order || "P,N,E,CODE")
      .split(/[, ]+/)
      .map((t) => t.trim().toUpperCase())
      .filter(Boolean);
  }

  function buildPopupRows(pt) {
    const rows = [];
    const tokens = getPopupTokens(pt);
    tokens.forEach((token) => {
      let label = "";
      let value = null;
      if (token === "P" || token === "ID") {
        label = "ID";
        value = pt.id;
      } else if (token === "N" || token === "NORTHING" || token === "LAT") {
        label = "Northing";
        value = pt.n;
      } else if (token === "E" || token === "EASTING" || token === "LON") {
        label = "Easting";
        value = pt.e;
      } else if (token === "Z" || token === "ELEVATION" || token === "H" || token === "HEIGHT") {
        label = "Elevation";
        value = pt.z;
      } else if (token === "CODE") {
        label = "Code";
        value = pt.code;
      }

      const isEmptyString = typeof value === "string" && value.trim() === "";
      const isBadNumber = typeof value === "number" && !Number.isFinite(value);
      if (value === null || value === undefined || isEmptyString || isBadNumber) {
        return;
      }

      rows.push({ label, value });
    });
    return rows;
  }

  function formatPopupRows(rows) {
    if (!rows.length) return "";
    return rows.map((row) => `${row.label}: <b>${row.value}</b>`).join("<br>");
  }

  // ---------- File parsing ----------
  function handleFiles() {
    const files = Array.from(el.filesInput.files || []);
    if (!files.length) return;

    let colorIdx = 0;
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        const text = reader.result || "";
        autoDetectOrder(text);
        const points = parseText(text, state.order);
        const color = colors[colorIdx % colors.length];
        colorIdx += 1;
        state.datasets.set(file.name, { name: file.name, color, points, layer: null });
        updateFileList();
        renderAll();
      };
      reader.readAsText(file);
    });
  }

  // Detect order using digit-length heuristic (Northing 7 digits, Easting 6 digits).
  function autoDetectOrder(text) {
    const lines = (text || "")
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean)
      .slice(0, 30);

    let chosen = null;
    let scorePNE = 0; // Point, North, East, Code
    let scorePEN = 0; // Point, East, North, Code
    let scoreNE = 0; // N,E two-column
    let scoreEN = 0; // E,N two-column

    for (const line of lines) {
      const parts = line.split(/[,\s;]+/).filter(Boolean);
      const numericParts = parts
        .map((p, idx) => ({ idx, val: parseFloat(p), len: digitLength(parseFloat(p)) }))
        .filter((n) => Number.isFinite(n.val));
      if (numericParts.length < 2) continue;

      // Look for first two plausible coordinate numbers (len >= 5) after any Point ID.
      const coords = numericParts.filter((n) => n.len >= 5);
      if (coords.length >= 2) {
        const a = coords[0];
        const b = coords[1];
        const aIsN = a.len >= 7;
        const bIsN = b.len >= 7;
        const aIsE = a.len === 6;
        const bIsE = b.len === 6;

        if (aIsN && bIsE && a.idx < b.idx) scorePNE += 1;
        if (aIsE && bIsN && a.idx < b.idx) scorePEN += 1;
        if (aIsN && bIsE && parts.length === 2) scoreNE += 1;
        if (aIsE && bIsN && parts.length === 2) scoreEN += 1;
      } else {
        // Fallback: use first two numerics even if lengths are smaller.
        const a = numericParts[0];
        const b = numericParts[1];
        if (a.len >= 7 && b.len >= 6) scorePNE += 1;
        if (a.len >= 6 && b.len >= 7) scorePEN += 1;
      }
    }

    // Decide on highest scoring pattern with N=7 / E=6 bias.
    const scores = [
      { key: "P,N,E,CODE", val: scorePNE },
      { key: "P,E,N,CODE", val: scorePEN },
      { key: "N,E", val: scoreNE },
      { key: "E,N", val: scoreEN },
    ].sort((a, b) => b.val - a.val);

    if (scores[0].val > 0 && (scores[0].val > (scores[1]?.val ?? 0) || scores[0].val >= 2)) {
      chosen = scores[0].key;
    }

    const finalOrder = chosen || "P,N,E,CODE";
    state.order = finalOrder;
    if (el.orderSelect) el.orderSelect.value = finalOrder;
    if (el.orderHint) {
      el.orderHint.textContent =
        chosen && scores[0].val > (scores[1]?.val ?? 0)
          ? `Detected order (7-digit N / 6-digit E): ${finalOrder}`
          : "Ambiguous digits; defaulting to P,N,E,CODE (Point, Northing, Easting)";
    }
  }

  // Parse raw text using selected order into point objects.
  function parseText(text, order) {
    const rows = (text || "")
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);

    return rows
      .map((row) => {
        const parts = row.split(/[,,\s;]+/).filter(Boolean);
        let tokens = (order || "P,N,E,CODE").split(/[, ]+/).filter(Boolean);
        if (parts.length >= 5) {
          const codeIdx = tokens.findIndex((t) => t.trim().toUpperCase() === "CODE");
          const hasZ = tokens.some((t) => t.trim().toUpperCase() === "Z");
          if (codeIdx !== -1 && !hasZ) {
            tokens = tokens.slice();
            tokens.splice(codeIdx, 1, "Z", "CODE");
          }
        }
        const normalizedTokens = tokens
          .map((t) => t.trim().toUpperCase())
          .filter(Boolean);

        // Handle two-column shorthand (N,E or E,N) for rows without Point ID.
        if (normalizedTokens.length === 2 && parts.length === 2) {
          const isNE = normalizedTokens.join(",") === "N,E";
          const nVal = parseFloat(isNE ? parts[0] : parts[1]);
          const eVal = parseFloat(isNE ? parts[1] : parts[0]);
          return { id: null, e: eVal, n: nVal, z: null, code: null, raw: row, tokens: normalizedTokens };
        }

        // Map columns by order
        let id = null, n = null, e = null, z = null, code = null;
        for (let i = 0; i < normalizedTokens.length && i < parts.length; i++) {
          const key = normalizedTokens[i];
          const val = parts[i].trim();
          if (key === "P" || key === "ID") id = val;
          else if (key === "N" || key === "NORTHING" || key === "LAT") n = parseFloat(val);
          else if (key === "E" || key === "EASTING" || key === "LON") e = parseFloat(val);
          else if (key === "Z" || key === "ELEVATION" || key === "H" || key === "HEIGHT") {
            z = val === "" ? null : (isNaN(Number(val)) ? null : Number(val));
          }
          else if (key === "CODE") code = val;
        }
        const extras = parts.slice(normalizedTokens.length);
        const numericExtras = extras
          .map((v) => ({ raw: v, num: Number(v) }))
          .filter((v) => Number.isFinite(v.num));
        const nonNumericExtras = extras.filter((v) => v !== "" && !Number.isFinite(Number(v)));

        // Prefer first numeric extra as elevation if not already mapped.
        if (z === null && numericExtras.length) z = numericExtras[0].num;
        // Prefer last non-numeric extra as code if not already mapped.
        if (code === null && nonNumericExtras.length) code = nonNumericExtras[nonNumericExtras.length - 1];
        // If CODE column captured a numeric value and we have extra non-numeric fields,
        // treat the numeric as elevation and the extra text as the code.
        const codeNum = code !== null && Number.isFinite(Number(code)) ? Number(code) : null;
        if (z === null && codeNum !== null && nonNumericExtras.length) {
          z = codeNum;
          code = nonNumericExtras[nonNumericExtras.length - 1];
        }
        // Fallback for n/e if not mapped
        if (n === null && parts.length > 1) n = parseFloat(parts[1]);
        if (e === null && parts.length > 2) e = parseFloat(parts[2]);
        if (!Number.isFinite(z)) z = null;
        return { id, e, n, z, code, raw: row, tokens: normalizedTokens };
      })
      .filter((p) => Number.isFinite(p.e) && Number.isFinite(p.n));
  }

  // Robust parser with fallback to first numeric pair when GeoCRS fails.

  // Parse manual textarea and render immediately (debounced in bindEvents).
  function parseManual() {
    if (!el.manualInput) return;
    const text = el.manualInput.value;
    autoDetectOrder(text);
    state.manualPoints = parseText(text, state.order);
    renderAll();
  }

  // Simple CRS heuristic: if numbers look like projected (>= 100000) pick dltm/utm, otherwise WGS84.

  // ---------- Map ----------
  function initMap(forceRebuild = false) {
    const desiredMode = state.mode === "global" ? "global" : "local";

    // Rebuild the map when switching between local/global views.
    if (!forceRebuild && state.map && state.map.__viewMode === desiredMode) {
      return;
    }

    // Tear down any existing map so CRS/base layers refresh cleanly.
    if (state.map) {
      state.map.off();
      state.map.remove();
    }
    state.baseLayer = null;
    state.map = null;
    state.manualLayer = null;
    state.datasets.forEach((ds) => (ds.layer = null));
    state.measureLayer = null;
    state.measurePoints = [];
    state.measureTotalMeters = 0;
    setMeasureActive(false);
    updateMeasureTotal();

    const isGlobal = desiredMode === "global";
    const mapOptions = {
      center: isGlobal ? [30.05, 31.25] : [0, 0],
      zoom: isGlobal ? 13 : 2,
      zoomControl: false,
      attributionControl: isGlobal,
      preferCanvas: true,
      crs: isGlobal ? L.CRS.EPSG3857 : L.CRS.Simple,
    };
    if (isGlobal) {
      mapOptions.maxZoom = 22;
    } else {
      mapOptions.minZoom = -4;
      mapOptions.maxZoom = 24;
    }

    state.map = L.map(el.mapEl, mapOptions);
    state.map.__viewMode = desiredMode;
    state.map.on("click", handleMeasureClick);

    // Base tiles only in global mode.
    if (isGlobal) {
      addTileLayer();
      if (el.mapEl) el.mapEl.style.background = "";
    } else {
      if (state.baseLayer) state.map.removeLayer(state.baseLayer);
      state.baseLayer = null;
      if (el.mapEl) el.mapEl.style.background = "#f8fafc";
    }
  }

  // Add OSM base layer.
  function addTileLayer() {
    if (state.baseLayer) state.map.removeLayer(state.baseLayer);
    try {
      const tile = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 22,
        maxNativeZoom: 19,
        attribution: "© OpenStreetMap",
      });
      state.baseLayer = tile;
      tile.addTo(state.map);
    } catch (err) {
      console.warn("Tile layer failed to load.", err);
    }
  }

  function addMeasurePoint(latlng) {
    if (!state.measureActive || !state.map || !latlng) return;
    if (!state.measureLayer) {
      state.measureLayer = L.layerGroup().addTo(state.map);
    }

    const projected = toProjectedCoord(latlng);
    const point = { latlng, projected };
    const lastPoint = state.measurePoints[state.measurePoints.length - 1];
    if (lastPoint) {
      const dist = computeSegmentDistance(lastPoint, point);
      if (dist <= MEASURE_DUPLICATE_EPS) {
        return;
      }
    }
    state.measurePoints.push(point);

    L.circleMarker(latlng, {
      radius: 4,
      color: "#dc2626",
      weight: 2,
      fillColor: "#dc2626",
      fillOpacity: 0.85,
    }).addTo(state.measureLayer);

    if (state.measurePoints.length > 1) {
      const prev = state.measurePoints[state.measurePoints.length - 2];
      const dist = computeSegmentDistance(prev, point);
      state.measureTotalMeters += dist;

      L.polyline([prev.latlng, latlng], {
        color: "#dc2626",
        weight: 2,
        dashArray: "5 6",
      }).addTo(state.measureLayer);

      const mid = L.latLng(
        (prev.latlng.lat + latlng.lat) / 2,
        (prev.latlng.lng + latlng.lng) / 2,
      );
      L.marker(mid, {
        interactive: false,
        icon: L.divIcon({
          className: "measure-label",
          html: formatDistance(dist),
        }),
      }).addTo(state.measureLayer);
    }

    updateMeasureTotal();
  }

  function handleMeasureClick(e) {
    if (!state.measureActive) return;
    addMeasurePoint(e.latlng);
  }

  // Project a point according to current mode/CRS.
  function projectPoint(pt) {
    if (!pt) return null;
    try {
      if (state.mode === "global") {
        if (window.GeoCRS && typeof window.GeoCRS.convert === "function") {
          const conv = window.GeoCRS.convert({
            from: state.crs,
            to: "epsg4326",
            coord: { x: pt.e, y: pt.n },
          });
          if (Number.isFinite(conv.x) && Number.isFinite(conv.y)) {
            return L.latLng(conv.y, conv.x);
          }
        }
        // fallback: treat as lat/lon
        return L.latLng(pt.n, pt.e);
      }
      // Local planar using CRS.Simple (Y, X)
      return L.latLng(pt.n, pt.e);
    } catch (err) {
      console.warn("Projection error", err);
      return null;
    }
  }

  // Render all datasets + manual points on the map and refresh UI.
  function renderAll() {
    if (!state.map) return;

    // Prepare dataset layers (clear + ensure they exist on the map).
    state.datasets.forEach((ds) => {
      if (!ds.layer) {
        ds.layer = L.layerGroup().addTo(state.map);
      } else {
        ds.layer.clearLayers();
        if (typeof state.map.hasLayer === "function" && !state.map.hasLayer(ds.layer)) {
          ds.layer.addTo(state.map);
        }
      }
    });
    if (state.manualLayer) {
      state.map.removeLayer(state.manualLayer);
      state.manualLayer = null;
    }

    // Build pointMap for overlap detection
    const pointMap = new Map();
    const bounds = [];
    state.datasets.forEach((ds) => {
      ds.points.forEach((pt) => {
        const latlng = projectPoint(pt);
        if (!latlng) return;
        const key = `${latlng.lat.toFixed(6)},${latlng.lng.toFixed(6)}`;
        if (!pointMap.has(key)) pointMap.set(key, []);
        pointMap.get(key).push({ pt, color: ds.color });
        bounds.push(latlng);
      });
    });

    // Render points with overlap-aware labels
    state.datasets.forEach((ds) => {
      const layer = ds.layer;
      ds.points.forEach((pt) => {
        const latlng = projectPoint(pt);
        if (!latlng) return;
        const key = `${latlng.lat.toFixed(6)},${latlng.lng.toFixed(6)}`;
        const overlaps = pointMap.get(key);
        // Fixed marker size regardless of zoom
        const marker = L.circleMarker(latlng, {
          radius: 6,
          color: ds.color,
          weight: 2,
          fillOpacity: 0.85,
        });
        // Build label: if overlap, show all point ids and colors
        let labelHtml = "";
        if (overlaps && overlaps.length > 1) {
          labelHtml = `<div class='pt-label-multi'>`;
          overlaps.forEach((o, idx) => {
            labelHtml += `<span class='pt-label-fixed' style='border-left:4px solid ${o.color};margin-left:2px;'>${o.pt.id ?? ""}</span>`;
          });
          labelHtml += `</div>`;
        } else {
          labelHtml = `<span class='pt-label-fixed' style='border-left:4px solid ${ds.color};'>${pt.id ?? "Point"}</span>`;
        }
        marker.bindTooltip(labelHtml, {
          direction: "top",
          offset: [0, -4],
          permanent: true,
          className: "pt-label pt-label-fixed",
        });
        // Show all overlapping points' info on click
        marker.on("click", function(e) {
          if (state.measureActive) {
            addMeasurePoint(e.latlng);
            if (e && e.originalEvent && window.L && L.DomEvent) {
              L.DomEvent.stop(e.originalEvent);
            }
            return;
          }
          let popupHtml = "<div style='font-size:15px;min-width:120px;'>";
          if (overlaps && overlaps.length > 1) {
            popupHtml += `<b>Overlapping Points:</b><br>`;
            overlaps.forEach((o, idx) => {
              const rowsHtml = formatPopupRows(buildPopupRows(o.pt));
              popupHtml += rowsHtml || "No data";
              popupHtml += "<hr style='margin:4px 0;'>";
            });
          } else {
            popupHtml += formatPopupRows(buildPopupRows(pt)) || "No data";
          }
          popupHtml += "</div>";
          marker.bindPopup(popupHtml).openPopup();
        });
        layer.addLayer(marker);
      });
    });

    // Render manual points
    const manualLayer = L.layerGroup();
    state.manualPoints.forEach((pt) => {
      const latlng = projectPoint(pt);
      if (!latlng) return;
      bounds.push(latlng);
      // Key by rounded coordinates
      const key = `${latlng.lat.toFixed(6)},${latlng.lng.toFixed(6)}`;
      // Check for overlap with dataset points
      let overlaps = [];
      if (pointMap.has(key)) {
        overlaps = pointMap.get(key).slice();
      }
      overlaps.push({ pt, color: manualColor });
      // Fixed marker size
      const marker = L.circleMarker(latlng, {
        radius: 6,
        color: manualColor,
        weight: 2,
        fillOpacity: 0.75,
      });
      // Build label for manual points
      let labelHtml = "";
      if (overlaps.length > 1) {
        labelHtml = `<div class='pt-label-multi'>`;
        overlaps.forEach((o, idx) => {
          labelHtml += `<span class='pt-label-fixed' style='border-left:4px solid ${o.color};margin-left:2px;'>${o.pt.id ?? ""}</span>`;
        });
        labelHtml += `</div>`;
      } else {
        labelHtml = `<span class='pt-label-fixed' style='border-left:4px solid ${manualColor};'>${pt.id ?? "Manual"}</span>`;
      }
      marker.bindTooltip(labelHtml, {
        direction: "top",
        offset: [0, -4],
        permanent: true,
        className: "pt-label pt-label-fixed",
      });
      // Show all overlapping points' info on click
      marker.on("click", function(e) {
        if (state.measureActive) {
          addMeasurePoint(e.latlng);
          if (e && e.originalEvent && window.L && L.DomEvent) {
            L.DomEvent.stop(e.originalEvent);
          }
          return;
        }
        let popupHtml = "<div style='font-size:15px;min-width:120px;'>";
        if (overlaps.length > 1) {
          popupHtml += `<b>Overlapping Points:</b><br>`;
          overlaps.forEach((o, idx) => {
            const rowsHtml = formatPopupRows(buildPopupRows(o.pt));
            popupHtml += rowsHtml || "No data";
            popupHtml += "<hr style='margin:4px 0;'>";
          });
        } else {
          popupHtml += formatPopupRows(buildPopupRows(pt)) || "No data";
        }
        popupHtml += "</div>";
        marker.bindPopup(popupHtml).openPopup();
      });
      manualLayer.addLayer(marker);
    // Add style for multi-label
    if (!document.getElementById("pt-label-multi-style")) {
      const style = document.createElement("style");
      style.id = "pt-label-multi-style";
      style.textContent = `.pt-label-multi { display: flex; flex-direction: row; gap: 2px; background: rgba(255,255,255,0.85); border-radius: 3px; padding: 2px 4px; border: 1px solid #ddd; }`;
      document.head.appendChild(style);
    }
    });
    state.manualLayer = manualLayer;
    manualLayer.addTo(state.map);

    updatePreview();

    if (bounds.length) {
      fitBounds(bounds);
    } else if (el.status) {
      el.status.textContent = "No points detected. Check CRS/order or input formatting.";
    }

    // Fix potential sizing glitches after dynamic injections.
    setTimeout(() => state.map && state.map.invalidateSize(), 50);
  }

  // Fit map to provided bounds; if not provided, auto-collect from all points.
  function fitBounds(boundsArr) {
    if (!state.map) return;

    let arr = boundsArr;

    // If called with null/undefined, collect all points.
    if (!Array.isArray(arr) || arr.length === 0) {
      arr = [];
      state.datasets.forEach((ds) => {
        (ds.points || []).forEach((pt) => {
          const latlng = projectPoint(pt);
          if (latlng) arr.push(latlng);
        });
      });
      (state.manualPoints || []).forEach((pt) => {
        const latlng = projectPoint(pt);
        if (latlng) arr.push(latlng);
      });
    }

    if (!arr.length) return;

    const b = L.latLngBounds(arr);
    if (!b.isValid()) return;

    const maxZoom = state.mode === "global" ? 22 : 2;
    state.map.fitBounds(b, { padding: [20, 20], maxZoom });
  }

  // ---------- UI updates ----------
  function updateFileList() {
    el.fileList.innerHTML = "";
    state.datasets.forEach((ds) => {
      const row = document.createElement("div");
      row.className = "file-item";
      const sw = document.createElement("span");
      sw.className = "swatch";
      sw.style.background = ds.color;
      row.appendChild(sw);
      row.appendChild(document.createTextNode(ds.name));
      el.fileList.appendChild(row);
      // Add point count in a separate line
      const count = document.createElement("div");
      count.className = "file-count";
      count.textContent = `عدد النقاط: ${ds.points.length}`;
      el.fileList.appendChild(count);
      // Separator
      const sep = document.createElement("hr");
      sep.className = "file-separator";
      el.fileList.appendChild(sep);
    });
    // Manual points (if any)
    if (state.manualPoints.length) {
      const row = document.createElement("div");
      row.className = "file-item";
      const sw = document.createElement("span");
      sw.className = "swatch";
      sw.style.background = manualColor;
      row.appendChild(sw);
      row.appendChild(document.createTextNode("Manual"));
      el.fileList.appendChild(row);
      const count = document.createElement("div");
      count.className = "file-count";
      count.textContent = `عدد النقاط: ${state.manualPoints.length}`;
      el.fileList.appendChild(count);
    }
  }

  function updatePreview() {
    if (!el.previewBox) return;
    // Collect all points from datasets and manual
    let allPoints = [];
    state.datasets.forEach(ds => {
      allPoints = allPoints.concat(ds.points);
    });
    allPoints = allPoints.concat(state.manualPoints);

    // If no points, show message
    if (!allPoints.length) {
      el.previewBox.textContent = "No points to preview.";
      return;
    }

    // Estimate how many rows fit in the box
    const box = el.previewBox;
    // Clear previous content
    box.innerHTML = "";
    // Create a table for preview
    const table = document.createElement("table");
    table.style.width = "100%";
    table.style.borderCollapse = "collapse";
    table.style.fontSize = "13px";
    table.style.lineHeight = "1.4";
    // Add header
    const header = document.createElement("tr");
    header.innerHTML = `<th style='text-align:left;padding:2px 6px;'>ID</th><th style='text-align:left;padding:2px 6px;'>Northing</th><th style='text-align:left;padding:2px 6px;'>Easting</th><th style='text-align:left;padding:2px 6px;'>Elevation</th><th style='text-align:left;padding:2px 6px;'>Code</th>`;
    table.appendChild(header);

    // Calculate how many rows fit (estimate by box height and row height)
    const rowHeight = 22; // px, approx
    const maxRows = Math.floor(box.offsetHeight / rowHeight) - 1; // minus header
    const showRows = Math.min(allPoints.length, maxRows > 0 ? maxRows : 20);

    for (let i = 0; i < showRows; i++) {
      const pt = allPoints[i];
      const tr = document.createElement("tr");
      tr.innerHTML = `<td style='padding:2px 6px;'>${pt.id ?? ""}</td><td style='padding:2px 6px;'>${pt.n}</td><td style='padding:2px 6px;'>${pt.e}</td><td style='padding:2px 6px;'>${pt.z ?? 0}</td><td style='padding:2px 6px;'>${pt.code ?? ""}</td>`;
      table.appendChild(tr);
    }
    box.appendChild(table);
    // If fewer points than box can fit, show all
    // No scroll, just fill the box
  }



  // ---------- Exports ----------
  function handleExport() {
    if (!exportController) {
      initExportController();
    }
    if (exportController && typeof exportController.open === "function") {
      exportController.open();
      return;
    }
    el.status.textContent = "Export module not available.";
  }
})();


// Utility: robust digit length ignoring decimals and sign
function digitLength(value) {
  if (!Number.isFinite(value)) return 0;
  const abs = Math.abs(value);
  if (abs < 1) return 1;
  return Math.floor(Math.log10(abs)) + 1;
}
