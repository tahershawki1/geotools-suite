(function () {
  const SCRIPT_URL = document.currentScript?.src || window.location.href;
  const GRID_URL = new URL("../../Geoids/Global/EGM2008/EGM2008.grd", SCRIPT_URL).href;
  const MODEL_NAME = "EGM2008";
  const MODE_STORAGE_KEY = "orthometric_height_mode";

  class EGM2008GridClient {
    constructor(url) {
      this.url = url;
      this.headerPromise = null;
      this.fullBufferPromise = null;
      this.segmentCache = new Map();
      this.fetchStrategy = "range";
    }

    async fetchBytes(start, end) {
      if (this.fullBufferPromise) {
        const buffer = await this.fullBufferPromise;
        return buffer.slice(start, end + 1);
      }

      const headers = {};
      if (this.fetchStrategy !== "full") {
        headers.Range = `bytes=${start}-${end}`;
      }

      const response = await fetch(this.url, { headers });
      if (!response.ok) {
        throw new Error(`Failed to load geoid grid (HTTP ${response.status}).`);
      }

      const buffer = await response.arrayBuffer();
      if (response.status === 206) {
        this.fetchStrategy = "range";
        return buffer;
      }

      if (buffer.byteLength < end + 1) {
        throw new Error("Geoid grid response was shorter than expected.");
      }

      this.fetchStrategy = "full";
      this.fullBufferPromise = Promise.resolve(buffer);
      return buffer.slice(start, end + 1);
    }

    async ensureHeader() {
      if (!this.headerPromise) {
        this.headerPromise = (async () => {
          const headerBytes = await this.fetchBytes(0, 27);
          if (headerBytes.byteLength < 28) {
            throw new Error("Invalid EGM2008 grid header.");
          }

          const view = new DataView(headerBytes);
          const headerLength = view.getUint32(0, true);
          const minLat = view.getFloat32(4, true);
          const maxLat = view.getFloat32(8, true);
          const minLon = view.getFloat32(12, true);
          const maxLon = view.getFloat32(16, true);
          const rows = Math.trunc(view.getFloat32(20, true));
          const cols = Math.trunc(view.getFloat32(24, true));

          if (!Number.isFinite(rows) || !Number.isFinite(cols) || rows < 2 || cols < 2) {
            throw new Error("Unsupported EGM2008 grid dimensions.");
          }

          return {
            headerLength,
            dataOffset: 4 + headerLength,
            minLat,
            maxLat,
            minLon,
            maxLon,
            rows,
            cols,
            latStep: (maxLat - minLat) / (rows - 1),
            lonStep: (maxLon - minLon) / (cols - 1),
          };
        })();
      }

      return this.headerPromise;
    }

    normalizeLongitude(lon, meta) {
      const width = meta.maxLon - meta.minLon;
      let value = lon;
      while (value < meta.minLon) value += width;
      while (value > meta.maxLon) value -= width;
      return Math.max(meta.minLon, Math.min(meta.maxLon, value));
    }

    rememberSegment(key, pair) {
      if (this.segmentCache.has(key)) {
        this.segmentCache.delete(key);
      }
      this.segmentCache.set(key, pair);
      if (this.segmentCache.size > 256) {
        const oldestKey = this.segmentCache.keys().next().value;
        this.segmentCache.delete(oldestKey);
      }
    }

    async readPair(row, col) {
      const key = `${row}:${col}`;
      if (this.segmentCache.has(key)) {
        return this.segmentCache.get(key);
      }

      const meta = await this.ensureHeader();
      const start = meta.dataOffset + ((row * meta.cols) + col) * 4;
      const segment = await this.fetchBytes(start, start + 7);
      if (segment.byteLength < 8) {
        throw new Error("Incomplete EGM2008 row segment.");
      }

      const view = new DataView(segment);
      const pair = [view.getFloat32(0, true), view.getFloat32(4, true)];
      this.rememberSegment(key, pair);
      return pair;
    }

    async getUndulation(lat, lon) {
      const meta = await this.ensureHeader();
      if (lat < meta.minLat || lat > meta.maxLat) {
        throw new Error("Latitude is outside the supported geoid grid range.");
      }

      const normalizedLon = this.normalizeLongitude(lon, meta);
      const rowPosition = (lat - meta.minLat) / meta.latStep;
      const colPosition = (normalizedLon - meta.minLon) / meta.lonStep;
      const rowBase = Math.max(0, Math.min(meta.rows - 2, Math.floor(rowPosition)));
      const colBase = Math.max(0, Math.min(meta.cols - 2, Math.floor(colPosition)));
      const rowFraction = Math.max(0, Math.min(1, rowPosition - rowBase));
      const colFraction = Math.max(0, Math.min(1, colPosition - colBase));

      const southPair = await this.readPair(rowBase, colBase);
      const northPair = await this.readPair(rowBase + 1, colBase);

      const southInterpolated =
        southPair[0] * (1 - colFraction) + southPair[1] * colFraction;
      const northInterpolated =
        northPair[0] * (1 - colFraction) + northPair[1] * colFraction;

      return southInterpolated * (1 - rowFraction) + northInterpolated * rowFraction;
    }
  }

  const gridClient = new EGM2008GridClient(GRID_URL);
  const dom = {
    form: document.getElementById("orthometric-form"),
    submit: document.getElementById("orthometric-submit"),
    clear: document.getElementById("orthometric-clear"),
    copy: document.getElementById("orthometric-copy"),
    status: document.getElementById("orthometric-status"),
    result: document.getElementById("orthometric-result"),
    modeButtons: Array.from(document.querySelectorAll(".orthometric-mode-btn")),
    panels: Array.from(document.querySelectorAll("[data-input-panel]")),
    resultH: document.getElementById("result-h"),
    resultN: document.getElementById("result-n"),
    resultSource: document.getElementById("result-source"),
    resultLat: document.getElementById("result-lat"),
    resultLon: document.getElementById("result-lon"),
    resultEllipsoidal: document.getElementById("result-ellipsoidal"),
    resultFormula: document.getElementById("result-formula"),
    resultFetchMode: document.getElementById("result-fetch-mode"),
  };

  let activeMode = "wgs84";
  let lastResultText = "";

  function setStatus(message, tone) {
    dom.status.textContent = message;
    dom.status.dataset.tone = tone || "info";
  }

  function formatAngle(value) {
    return `${Number(value).toFixed(8)}°`;
  }

  function formatMeters(value) {
    return `${Number(value).toFixed(3)} m`;
  }

  function formatSignedMeters(value) {
    const sign = value >= 0 ? "+" : "-";
    return `${sign}${Math.abs(Number(value)).toFixed(3)} m`;
  }

  function getFetchModeLabel() {
    return gridClient.fetchStrategy === "full"
      ? "Full-grid fallback loaded in memory"
      : "HTTP range reads from local grid";
  }

  function switchMode(nextMode) {
    activeMode = nextMode;
    try {
      localStorage.setItem(MODE_STORAGE_KEY, activeMode);
    } catch {}

    dom.modeButtons.forEach((button) => {
      const isActive = button.dataset.mode === activeMode;
      button.classList.toggle("is-active", isActive);
      button.classList.toggle("active", isActive);
      button.setAttribute("aria-selected", String(isActive));
      button.tabIndex = isActive ? 0 : -1;
    });

    dom.panels.forEach((panel) => {
      panel.hidden = panel.getAttribute("data-input-panel") !== activeMode;
    });
  }

  function readNumber(id, label) {
    const field = document.getElementById(id);
    const value = Number(field.value);
    if (!Number.isFinite(value)) {
      throw new Error(`Enter a valid ${label}.`);
    }
    return value;
  }

  function requireProj4() {
    if (!window.proj4) {
      throw new Error("Proj4 is not loaded.");
    }
  }

  async function toWgs84FromUtm() {
    requireProj4();
    const zone = Math.trunc(readNumber("utm-zone", "UTM zone"));
    const hemisphere = String(document.getElementById("utm-hemi").value || "N")
      .trim()
      .toUpperCase();
    const easting = readNumber("utm-e", "UTM easting");
    const northing = readNumber("utm-n", "UTM northing");
    const ellipsoidalHeight = readNumber("utm-h", "ellipsoidal height");

    if (zone < 1 || zone > 60) {
      throw new Error("UTM zone must be between 1 and 60.");
    }
    if (hemisphere !== "N" && hemisphere !== "S") {
      throw new Error("UTM hemisphere must be North or South.");
    }

    const utmProj =
      `+proj=utm +zone=${zone} ` +
      (hemisphere === "S" ? "+south " : "") +
      "+ellps=WGS84 +datum=WGS84 +units=m +no_defs";

    const result = proj4(utmProj, "EPSG:4326", [easting, northing]);
    const lon = result[0];
    const lat = result[1];
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      throw new Error("Could not convert the UTM point to WGS84.");
    }

    return {
      sourceLabel: `UTM Zone ${zone}${hemisphere}`,
      lat,
      lon,
      ellipsoidalHeight,
    };
  }

  async function toWgs84FromDltm() {
    const easting = readNumber("dltm-e", "DLTM easting");
    const northing = readNumber("dltm-n", "DLTM northing");
    const ellipsoidalHeight = readNumber("dltm-h", "ellipsoidal height");

    if (!window.GeoCRS || typeof window.GeoCRS.convert !== "function") {
      throw new Error("GeoCRS is not available for DLTM conversion.");
    }
    if (typeof window.GeoCRS.ready === "function") {
      await window.GeoCRS.ready();
    }

    const converted = window.GeoCRS.convert({
      from: "dltm",
      to: "epsg4326",
      coord: { x: easting, y: northing },
    });

    if (!Number.isFinite(converted?.y) || !Number.isFinite(converted?.x)) {
      throw new Error("Could not convert the DLTM point to WGS84.");
    }

    return {
      sourceLabel: "DLTM",
      lat: converted.y,
      lon: converted.x,
      ellipsoidalHeight,
    };
  }

  async function readCurrentInput() {
    if (activeMode === "utm") {
      return toWgs84FromUtm();
    }
    if (activeMode === "dltm") {
      return toWgs84FromDltm();
    }

    const lat = readNumber("wgs-lat", "latitude");
    const lon = readNumber("wgs-lon", "longitude");
    const ellipsoidalHeight = readNumber("wgs-h", "ellipsoidal height");

    if (lat < -90 || lat > 90) {
      throw new Error("Latitude must be between -90 and 90 degrees.");
    }
    if (lon < -180 || lon > 180) {
      throw new Error("Longitude must be between -180 and 180 degrees.");
    }

    return {
      sourceLabel: "WGS84",
      lat,
      lon,
      ellipsoidalHeight,
    };
  }

  function renderResult(solution) {
    dom.result.hidden = false;
    dom.result.style.display = "block";
    dom.copy.disabled = false;
    dom.resultH.textContent = formatMeters(solution.orthometricHeight);
    dom.resultN.textContent = formatSignedMeters(solution.geoidUndulation);
    dom.resultSource.textContent = solution.sourceLabel;
    dom.resultLat.textContent = formatAngle(solution.lat);
    dom.resultLon.textContent = formatAngle(solution.lon);
    dom.resultEllipsoidal.textContent = formatMeters(solution.ellipsoidalHeight);
    dom.resultFormula.textContent =
      `H = h - N = ${solution.ellipsoidalHeight.toFixed(3)} - (${solution.geoidUndulation.toFixed(3)}) = ${solution.orthometricHeight.toFixed(3)} m`;
    dom.resultFetchMode.textContent = getFetchModeLabel();

    lastResultText = [
      "Orthometric Height Converter",
      `Model: ${MODEL_NAME}`,
      `Input system: ${solution.sourceLabel}`,
      `Latitude: ${solution.lat.toFixed(8)}`,
      `Longitude: ${solution.lon.toFixed(8)}`,
      `Ellipsoidal height h: ${solution.ellipsoidalHeight.toFixed(3)} m`,
      `Geoid separation N: ${solution.geoidUndulation.toFixed(3)} m`,
      `Orthometric height H: ${solution.orthometricHeight.toFixed(3)} m`,
      `Formula: H = h - N = ${solution.orthometricHeight.toFixed(3)} m`,
    ].join("\n");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    dom.submit.disabled = true;
    setStatus("Converting point and reading the EGM2008 grid...", "info");

    try {
      const input = await readCurrentInput();
      const geoidUndulation = await gridClient.getUndulation(input.lat, input.lon);
      const orthometricHeight = input.ellipsoidalHeight - geoidUndulation;

      renderResult({
        ...input,
        geoidUndulation,
        orthometricHeight,
      });

      setStatus(
        `${MODEL_NAME} solved successfully. ${getFetchModeLabel()}.`,
        "success",
      );
    } catch (error) {
      dom.result.hidden = true;
      dom.result.style.display = "none";
      dom.copy.disabled = true;
      setStatus(error.message || String(error), "error");
    } finally {
      dom.submit.disabled = false;
    }
  }

  function clearAll() {
    dom.form.reset();
    dom.result.hidden = true;
    dom.result.style.display = "none";
    dom.copy.disabled = true;
    lastResultText = "";
    switchMode(activeMode);
    setStatus("Fields cleared. Enter a point to compute H from h.", "info");
  }

  async function copyResult() {
    if (!lastResultText) return;
    await navigator.clipboard.writeText(lastResultText);
    setStatus("Result copied to clipboard.", "success");
  }

  async function warmupModel() {
    try {
      const meta = await gridClient.ensureHeader();
      const resolutionMinutes = (meta.latStep * 60).toFixed(1);
      setStatus(
        `${MODEL_NAME} ready. Grid: ${meta.rows} x ${meta.cols}, resolution ${resolutionMinutes}' (${getFetchModeLabel()}).`,
        "success",
      );
    } catch (error) {
      setStatus(error.message || String(error), "error");
    }
  }

  dom.modeButtons.forEach((button) => {
    button.addEventListener("click", () => switchMode(button.dataset.mode || "wgs84"));
  });

  dom.form.addEventListener("submit", handleSubmit);
  dom.clear.addEventListener("click", clearAll);
  dom.copy.addEventListener("click", () => {
    copyResult().catch((error) => {
      setStatus(error.message || "Copy failed.", "error");
    });
  });

  try {
    const savedMode = localStorage.getItem(MODE_STORAGE_KEY);
    if (savedMode === "utm" || savedMode === "dltm" || savedMode === "wgs84") {
      activeMode = savedMode;
    }
  } catch {}

  switchMode(activeMode);
  warmupModel();
})();
