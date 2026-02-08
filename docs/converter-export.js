(function (global) {
  "use strict";

  const DEFAULT_API_BASE = "https://worker.geotools.workers.dev";
  const EXPORT_STYLE_ID = "converter-export-style";
  const EXPORT_MODAL_ID = "converter-export-modal";

  function ensureExportStyles() {
    if (document.getElementById(EXPORT_STYLE_ID)) return;

    const style = document.createElement("style");
    style.id = EXPORT_STYLE_ID;
    style.textContent = `
      .conv-export-modal {
        position: fixed;
        inset: 0;
        z-index: 3000;
        display: none;
      }
      .conv-export-modal.is-open {
        display: block;
      }
      .conv-export-backdrop {
        position: absolute;
        inset: 0;
        background: rgba(15, 23, 42, 0.5);
      }
      .conv-export-panel {
        position: relative;
        width: min(560px, calc(100vw - 24px));
        margin: 9vh auto 0;
        background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
        border-radius: 16px;
        border: 1px solid #e5e7eb;
        box-shadow: 0 18px 50px rgba(15, 23, 42, 0.24);
        padding: 16px;
        overflow: hidden;
        isolation: isolate;
      }
      .conv-export-panel::before {
        content: "";
        position: absolute;
        top: -90px;
        right: -80px;
        width: 220px;
        height: 220px;
        border-radius: 50%;
        background: radial-gradient(
          circle at 30% 30%,
          rgba(59, 130, 246, 0.35),
          rgba(59, 130, 246, 0) 70%
        );
        pointer-events: none;
        z-index: 0;
      }
      .conv-export-panel::after {
        content: "";
        position: absolute;
        bottom: -100px;
        left: -90px;
        width: 200px;
        height: 200px;
        border-radius: 50%;
        background: radial-gradient(
          circle at 60% 40%,
          rgba(16, 185, 129, 0.28),
          rgba(16, 185, 129, 0) 70%
        );
        pointer-events: none;
        z-index: 0;
      }
      .conv-export-panel > * {
        position: relative;
        z-index: 1;
      }
      .conv-export-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
      }
      .conv-export-title {
        margin: 0;
        font-size: 20px;
        font-weight: 900;
        color: #111827;
      }
      .conv-export-close {
        border: 1px solid #d1d5db;
        background: #fff;
        color: #374151;
        width: 34px;
        height: 34px;
        border-radius: 10px;
        font-size: 20px;
        line-height: 1;
        cursor: pointer;
      }
      .conv-export-subtitle {
        margin: 8px 0 14px;
        color: #6b7280;
        font-size: 13px;
      }
      .conv-export-list {
        display: flex;
        flex-direction: column;
        gap: 10px;
        margin: 0;
        padding: 0;
        list-style: none;
      }
      .conv-export-btn {
        border: 1px solid #e5e7eb;
        background: #f8fafc;
        color: #111827;
        border-radius: 14px;
        padding: 12px 14px;
        font-weight: 800;
        font-size: 14px;
        cursor: pointer;
        transition: all 0.15s ease;
        display: flex;
        align-items: center;
        gap: 12px;
        width: 100%;
        text-align: left;
      }
      .conv-export-btn:hover:not(:disabled) {
        border-color: #111827;
        background: #eef2ff;
      }
      .conv-export-btn:hover:not(:disabled) .conv-export-icon {
        border-color: #111827;
        transform: translateY(-1px);
      }
      .conv-export-btn:disabled {
        opacity: 0.55;
        cursor: wait;
      }
      .conv-export-icon {
        width: 38px;
        height: 38px;
        border-radius: 12px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        background: #fff;
        border: 1px solid #e5e7eb;
        box-shadow: 0 8px 14px rgba(15, 23, 42, 0.08);
        color: #111827;
        flex: 0 0 auto;
        transition: all 0.15s ease;
      }
      .conv-export-icon svg {
        width: 20px;
        height: 20px;
        stroke: currentColor;
        fill: none;
        stroke-width: 1.7;
        stroke-linecap: round;
        stroke-linejoin: round;
      }
      .conv-export-label {
        flex: 1;
        font-weight: 800;
        letter-spacing: 0.2px;
      }
      .conv-export-meta {
        font-size: 12px;
        font-weight: 700;
        color: #64748b;
        background: #fff;
        border: 1px solid #e2e8f0;
        padding: 4px 8px;
        border-radius: 999px;
      }
      .conv-export-btn[data-export-format="sdr"] .conv-export-icon {
        background: #ecfeff;
        border-color: #99f6e4;
        color: #0f766e;
      }
      .conv-export-btn[data-export-format="dxf"] .conv-export-icon {
        background: #fff7ed;
        border-color: #fed7aa;
        color: #c2410c;
      }
      .conv-export-btn[data-export-format="txt"] .conv-export-icon {
        background: #eef2ff;
        border-color: #c7d2fe;
        color: #4338ca;
      }
      .conv-export-btn[data-export-format="csv"] .conv-export-icon {
        background: #f0fdf4;
        border-color: #bbf7d0;
        color: #15803d;
      }
      .conv-export-btn[data-export-format="kml"] .conv-export-icon {
        background: #fdf2f8;
        border-color: #fbcfe8;
        color: #be185d;
      }
      .conv-export-btn[data-export-format="geojson"] .conv-export-icon {
        background: #f5f3ff;
        border-color: #ddd6fe;
        color: #6d28d9;
      }
      @media (max-width: 480px) {
        .conv-export-panel {
          margin-top: 5vh;
          width: calc(100vw - 16px);
          padding: 14px;
        }
      }
    `;

    document.head.appendChild(style);
  }

  function createExportModal() {
    const existing = document.getElementById(EXPORT_MODAL_ID);
    if (existing) existing.remove();

    const modal = document.createElement("div");
    modal.id = EXPORT_MODAL_ID;
    modal.className = "conv-export-modal";
    modal.innerHTML = `
      <div class="conv-export-backdrop" data-export-close="true"></div>
      <div class="conv-export-panel" role="dialog" aria-modal="true" aria-labelledby="conv-export-title">
        <div class="conv-export-header">
          <h3 id="conv-export-title" class="conv-export-title">Export Points</h3>
          <button type="button" class="conv-export-close" data-export-close="true" aria-label="Close export dialog">&times;</button>
        </div>
        <p class="conv-export-subtitle">Choose a format to download your points.</p>
        <div class="conv-export-list" role="list">
          <button type="button" class="conv-export-btn" data-export-format="sdr">
            <span class="conv-export-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="8"></circle>
                <path d="M12 7v5l3 3"></path>
              </svg>
            </span>
            <span class="conv-export-label">SDR</span>
            <span class="conv-export-meta">.sdr</span>
          </button>
          <button type="button" class="conv-export-btn" data-export-format="dxf">
            <span class="conv-export-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <rect x="4" y="4" width="16" height="16" rx="2"></rect>
                <path d="M4 20L20 4"></path>
                <path d="M4 12h8"></path>
              </svg>
            </span>
            <span class="conv-export-label">DXF</span>
            <span class="conv-export-meta">.dxf</span>
          </button>
          <button type="button" class="conv-export-btn" data-export-format="txt">
            <span class="conv-export-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <path d="M6 7h12"></path>
                <path d="M6 12h12"></path>
                <path d="M6 17h8"></path>
              </svg>
            </span>
            <span class="conv-export-label">TXT</span>
            <span class="conv-export-meta">.txt</span>
          </button>
          <button type="button" class="conv-export-btn" data-export-format="csv">
            <span class="conv-export-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <rect x="4" y="5" width="16" height="14" rx="2"></rect>
                <path d="M8 5v14"></path>
                <path d="M16 5v14"></path>
                <path d="M4 10h16"></path>
                <path d="M4 15h16"></path>
              </svg>
            </span>
            <span class="conv-export-label">CSV</span>
            <span class="conv-export-meta">.csv</span>
          </button>
          <button type="button" class="conv-export-btn" data-export-format="kml">
            <span class="conv-export-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <path d="M12 21s6-5 6-10a6 6 0 1 0-12 0c0 5 6 10 6 10z"></path>
                <circle cx="12" cy="11" r="2.5"></circle>
              </svg>
            </span>
            <span class="conv-export-label">KML</span>
            <span class="conv-export-meta">.kml</span>
          </button>
          <button type="button" class="conv-export-btn" data-export-format="geojson">
            <span class="conv-export-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <circle cx="6" cy="12" r="2.5"></circle>
                <circle cx="18" cy="6" r="2.5"></circle>
                <circle cx="18" cy="18" r="2.5"></circle>
                <path d="M8.5 11L15.5 7.5"></path>
                <path d="M8.5 13L15.5 16.5"></path>
              </svg>
            </span>
            <span class="conv-export-label">GeoJSON</span>
            <span class="conv-export-meta">.geojson</span>
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    return modal;
  }

  function normalizeLines(text) {
    return String(text || "")
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
  }

  function looksLikeHeader(line) {
    return /point|pnt|name|id|north|east|level|code/i.test(line || "");
  }

  function detectDelimiter(line) {
    const counts = { ",": 0, ";": 0, "\t": 0 };
    for (const char of String(line || "")) {
      if (Object.prototype.hasOwnProperty.call(counts, char)) {
        counts[char] += 1;
      }
    }
    return Object.keys(counts).reduce((a, b) => (counts[a] > counts[b] ? a : b));
  }

  function splitDelimitedLine(line, delim) {
    const result = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (!inQuotes && ch === delim) {
        result.push(current);
        current = "";
      } else {
        current += ch;
      }
    }

    result.push(current);
    return result;
  }

  function parseFloatSmart(value) {
    const cleaned = String(value || "").replace(/\s+/g, "");
    if (!cleaned) return NaN;
    return cleaned.includes(",") ? parseFloat(cleaned.replace(/,/g, ".")) : parseFloat(cleaned);
  }

  function parseCsvPoints(text, format) {
    const lines = normalizeLines(text);
    if (!lines.length) return [];

    const points = [];
    const delimiter = detectDelimiter(lines[0] || "");
    const startIndex = looksLikeHeader(lines[0] || "") ? 1 : 0;

    for (let i = startIndex; i < lines.length; i++) {
      const cols = splitDelimitedLine(lines[i], delimiter);
      const pointName = (cols[0] || "").trim();
      const nRaw = format === "NEZ" ? cols[1] : cols[2];
      const eRaw = format === "NEZ" ? cols[2] : cols[1];
      const zRaw = cols[3];
      const codeRaw = cols[4];
      const n = parseFloatSmart(nRaw);
      const e = parseFloatSmart(eRaw);
      const z = parseFloatSmart(zRaw);

      if (!isFinite(n) || !isFinite(e)) continue;

      points.push({
        p: pointName,
        n: n,
        e: e,
        z: isFinite(z) ? z : null,
        code: (codeRaw || "").trim(),
      });
    }

    return points;
  }

  function parseSdrPoints(sdrText) {
    const lines = String(sdrText || "").replace(/\r/g, "").split("\n");
    const points = [];

    for (const line of lines) {
      if (!line.startsWith("08KI")) continue;

      const pointName = line.slice(4, 20).trim();
      const n = parseFloatSmart(line.slice(20, 36).trim());
      const e = parseFloatSmart(line.slice(36, 52).trim());
      const z = parseFloatSmart(line.slice(52, 68).trim());
      const code = line.slice(68, 84).trim();

      if (!isFinite(n) || !isFinite(e)) continue;

      points.push({
        p: pointName,
        n: n,
        e: e,
        z: isFinite(z) ? z : null,
        code: code,
      });
    }

    return points;
  }

  function toNumberText(value) {
    return typeof value === "number" && isFinite(value) ? String(value) : "";
  }

  function csvCell(value) {
    const str = value == null ? "" : String(value);
    if (/[",\n]/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }

  function pointsToCsv(points) {
    const rows = ["P,N,E,Z,Code"];
    for (let i = 0; i < points.length; i++) {
      const pt = points[i];
      rows.push(
        [
          csvCell(pt.p || `P${i + 1}`),
          csvCell(toNumberText(pt.n)),
          csvCell(toNumberText(pt.e)),
          csvCell(toNumberText(pt.z)),
          csvCell(pt.code || ""),
        ].join(","),
      );
    }
    return rows.join("\n") + "\n";
  }

  function pointsToTxt(points) {
    const rows = ["PointID\tN\tE\tZ\tCode"];
    for (let i = 0; i < points.length; i++) {
      const pt = points[i];
      rows.push(
        [
          pt.p || `P${i + 1}`,
          toNumberText(pt.n),
          toNumberText(pt.e),
          toNumberText(pt.z),
          pt.code || "",
        ].join("\t"),
      );
    }
    return rows.join("\n") + "\n";
  }

  function escapeXml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");
  }

  function pointsToKml(points) {
    const placemarks = points
      .map((pt, index) => {
        const pointName = escapeXml(pt.p || `P${index + 1}`);
        const pointCode = escapeXml(pt.code || "");
        const z = toNumberText(pt.z || 0) || "0";
        const coords = `${toNumberText(pt.e)},${toNumberText(pt.n)},${z}`;

        return [
          "<Placemark>",
          `<name>${pointName}</name>`,
          `<description>${pointCode}</description>`,
          "<Point>",
          `<coordinates>${coords}</coordinates>`,
          "</Point>",
          "</Placemark>",
        ].join("");
      })
      .join("");

    return [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<kml xmlns="http://www.opengis.net/kml/2.2">',
      "<Document>",
      "<name>GeoTools Export</name>",
      placemarks,
      "</Document>",
      "</kml>",
      "",
    ].join("\n");
  }

  function sanitizeDxfText(value) {
    return String(value || "").replace(/[\r\n]+/g, " ").trim();
  }

  function pointsToDxf(points) {
    const lines = [
      "0",
      "SECTION",
      "2",
      "HEADER",
      "0",
      "ENDSEC",
      "0",
      "SECTION",
      "2",
      "ENTITIES",
    ];

    points.forEach((pt, index) => {
      const x = toNumberText(pt.e) || "0";
      const y = toNumberText(pt.n) || "0";
      const z = toNumberText(pt.z) || "0";
      const label = sanitizeDxfText(pt.p || `P${index + 1}`).slice(0, 31);

      lines.push(
        "0",
        "POINT",
        "8",
        "POINTS",
        "10",
        x,
        "20",
        y,
        "30",
        z,
        "0",
        "TEXT",
        "8",
        "POINT_LABELS",
        "10",
        x,
        "20",
        y,
        "30",
        z,
        "40",
        "1.5",
        "1",
        label,
      );
    });

    lines.push("0", "ENDSEC", "0", "EOF", "");
    return lines.join("\n");
  }

  function pointsToGeoJson(points) {
    const featureCollection = {
      type: "FeatureCollection",
      features: points.map((pt, index) => {
        const coords = [pt.e, pt.n];
        if (typeof pt.z === "number" && isFinite(pt.z)) {
          coords.push(pt.z);
        }

        return {
          type: "Feature",
          properties: {
            pointId: pt.p || `P${index + 1}`,
            code: pt.code || "",
            z: typeof pt.z === "number" && isFinite(pt.z) ? pt.z : null,
          },
          geometry: {
            type: "Point",
            coordinates: coords,
          },
        };
      }),
    };

    return JSON.stringify(featureCollection, null, 2) + "\n";
  }

  function downloadText(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  async function requestSdrFromApi(apiBase, content, format) {
    const base = apiBase || global.API_BASE || DEFAULT_API_BASE;
    const response = await fetch(`${base}/api/csv-to-sdr`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: content, format: format }),
    });

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}`;
      try {
        const payload = await response.json();
        errorMessage = payload && payload.error ? payload.error : errorMessage;
      } catch (_jsonErr) {
        const fallbackText = await response.text();
        if (fallbackText) errorMessage = fallbackText;
      }
      throw new Error(errorMessage);
    }

    return await response.text();
  }

  function sanitizeBaseName(name) {
    const noExt = String(name || "points").replace(/\.[^/.]+$/, "");
    const safe = noExt.replace(/[^a-zA-Z0-9._-]+/g, "_").replace(/^_+|_+$/g, "");
    return safe || "points";
  }

  function buildSourceKey(source) {
    return `${source.isSdr ? "sdr" : "csv"}|${source.coordFormat}|${source.text}`;
  }

  function createExporter(options) {
    ensureExportStyles();
    const modal = createExportModal();
    const formatButtons = Array.from(modal.querySelectorAll("[data-export-format]"));

    let active = false;
    let sdrCache = { key: "", text: "" };

    function moveFocusOut() {
      if (!modal.contains(document.activeElement)) {
        return;
      }

      const returnEl =
        typeof options.getReturnFocusEl === "function" ? options.getReturnFocusEl() : null;

      if (returnEl && typeof returnEl.focus === "function") {
        returnEl.focus();
        return;
      }

      if (document.activeElement && typeof document.activeElement.blur === "function") {
        document.activeElement.blur();
      }

      if (document.body && typeof document.body.focus === "function") {
        const hadTabIndex = document.body.hasAttribute("tabindex");
        if (!hadTabIndex) {
          document.body.setAttribute("tabindex", "-1");
        }
        document.body.focus();
        if (!hadTabIndex) {
          document.body.removeAttribute("tabindex");
        }
      }
    }

    function setStatus(message, kind) {
      if (typeof options.setStatus === "function") {
        options.setStatus(message, kind);
      }
    }

    function hideStatus() {
      if (typeof options.hideStatus === "function") {
        options.hideStatus();
      }
    }

    function setBusy(busy) {
      formatButtons.forEach((btn) => {
        btn.disabled = busy;
      });
    }

    function closeModal() {
      moveFocusOut();
      modal.classList.remove("is-open");
      modal.setAttribute("aria-hidden", "true");
      active = false;
    }

    function getCurrentSource() {
      const text = String(
        typeof options.getSourceText === "function" ? options.getSourceText() || "" : "",
      );
      const coordFormat =
        typeof options.getCoordFormat === "function" ? options.getCoordFormat() || "NEZ" : "NEZ";
      const isSdr = Boolean(
        typeof options.getSourceIsSdr === "function" ? options.getSourceIsSdr() : false,
      );
      const baseName =
        typeof options.getBaseName === "function" ? options.getBaseName() || "points" : "points";

      return {
        text: text,
        coordFormat: coordFormat,
        isSdr: isSdr,
        baseName: sanitizeBaseName(baseName),
      };
    }

    function parsePoints(source) {
      if (source.isSdr) {
        return parseSdrPoints(source.text);
      }
      return parseCsvPoints(source.text, source.coordFormat);
    }

    async function getSdrText(source) {
      if (source.isSdr) {
        return source.text;
      }

      const sourceKey = buildSourceKey(source);
      if (sdrCache.key === sourceKey && sdrCache.text) {
        return sdrCache.text;
      }

      setStatus("Generating SDR export...", "loading");
      const sdr = await requestSdrFromApi(options.apiBase, source.text, source.coordFormat);
      sdrCache = { key: sourceKey, text: sdr };

      if (typeof options.onSdrReady === "function") {
        options.onSdrReady(sdr);
      }

      return sdr;
    }

    async function exportFormat(format) {
      const source = getCurrentSource();
      if (!source.text.trim()) {
        setStatus("Please choose a file and click Show Map first.", "error");
        return;
      }

      setBusy(true);
      try {
        if (format === "sdr") {
          const sdr = await getSdrText(source);
          downloadText(sdr, `${source.baseName}.sdr`, "text/plain");
          setStatus("SDR file exported successfully.", "ok");
          closeModal();
          return;
        }

        const points = parsePoints(source);
        if (!points.length) {
          throw new Error("No points found to export.");
        }

        if (format === "csv") {
          downloadText(pointsToCsv(points), `${source.baseName}.csv`, "text/csv");
        } else if (format === "txt") {
          downloadText(pointsToTxt(points), `${source.baseName}.txt`, "text/plain");
        } else if (format === "kml") {
          downloadText(
            pointsToKml(points),
            `${source.baseName}.kml`,
            "application/vnd.google-earth.kml+xml",
          );
        } else if (format === "dxf") {
          downloadText(pointsToDxf(points), `${source.baseName}.dxf`, "application/dxf");
        } else if (format === "geojson") {
          downloadText(pointsToGeoJson(points), `${source.baseName}.geojson`, "application/geo+json");
        } else {
          throw new Error(`Unsupported export format: ${format}`);
        }

        hideStatus();
        setStatus(`${format.toUpperCase()} file exported successfully.`, "ok");
        closeModal();
      } catch (err) {
        setStatus(`Export failed (${format.toUpperCase()}): ${err.message}`, "error");
      } finally {
        setBusy(false);
      }
    }

    function openModal() {
      const source = getCurrentSource();
      if (!source.text.trim()) {
        setStatus("Please choose a file and click Show Map first.", "error");
        return;
      }

      modal.classList.add("is-open");
      modal.removeAttribute("aria-hidden");
      active = true;

      const firstBtn = modal.querySelector("[data-export-format='sdr']");
      if (firstBtn) firstBtn.focus();
    }

    function onModalClick(event) {
      const closeTarget = event.target.closest("[data-export-close='true']");
      if (closeTarget) {
        closeModal();
        return;
      }

      const exportTarget = event.target.closest("[data-export-format]");
      if (exportTarget) {
        void exportFormat(exportTarget.getAttribute("data-export-format"));
      }
    }

    function onKeyDown(event) {
      if (active && event.key === "Escape") {
        closeModal();
      }
    }

    modal.addEventListener("click", onModalClick);
    modal.addEventListener("keydown", onKeyDown);

    return {
      open: openModal,
      close: closeModal,
      resetCache: function () {
        sdrCache = { key: "", text: "" };
      },
      getCachedSdr: function () {
        return sdrCache.text;
      },
      destroy: function () {
        modal.removeEventListener("keydown", onKeyDown);
        modal.removeEventListener("click", onModalClick);
        if (modal.parentNode) modal.parentNode.removeChild(modal);
      },
    };
  }

  global.ConverterExport = {
    createExporter: createExporter,
    parseSdrPoints: parseSdrPoints,
    parseCsvPoints: parseCsvPoints,
    pointsToCsv: pointsToCsv,
  };
})(window);
