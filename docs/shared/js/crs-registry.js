// GeoTools Suite — Central CRS registry and conversion helpers
(function () {
  if (!window) return;

  const DEFAULT_DEFS = [
    {
      key: "epsg4326",
      label: "WGS84 (EPSG:4326)",
      proj4: "EPSG:4326",
      type: "geographic",
    },
    {
      key: "utm39n",
      label: "UTM Zone 39N (WGS84)",
      proj4: "+proj=utm +zone=39 +ellps=WGS84 +datum=WGS84 +units=m +no_defs",
      type: "projected",
    },
    {
      key: "utm40n",
      label: "UTM Zone 40N (WGS84)",
      proj4: "+proj=utm +zone=40 +ellps=WGS84 +datum=WGS84 +units=m +no_defs",
      type: "projected",
    },
    {
      key: "dltm",
      label: "Dubai Local Transverse Mercator (DLTM)",
      proj4: null,
      type: "projected",
      adapter: "dltm",
    },
    {
      key: "me-crs",
      label: "Middle East CRS (placeholder)",
      proj4: "+proj=tmerc +lat_0=0 +lon_0=44 +k=1 +x_0=500000 +y_0=0 +ellps=WGS84 +units=m +no_defs",
      type: "projected",
    },
  ];

  const defs = {};
  let readyPromise = null;

  function normalizeKey(value) {
    return String(value || "").toLowerCase().trim();
  }

  function seedDefaults() {
    DEFAULT_DEFS.forEach((def) => {
      if (!def || !def.key) return;
      defs[normalizeKey(def.key)] = { ...def, key: normalizeKey(def.key) };
    });
  }

  seedDefaults();

  function resolveDataUrl() {
    const base = document.currentScript?.src || location.href;
    return new URL("../data/crs-defs.json", base).href;
  }

  async function loadJson(url, silent) {
    try {
      const res = await fetch(url, { cache: "no-cache" });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const data = await res.json();
      if (!Array.isArray(data)) throw new Error("CRS JSON must be an array");
      applyDefs(data);
      return true;
    } catch (err) {
      if (!silent) console.warn("CRS registry load failed:", err);
      return false;
    }
  }

  function applyDefs(list) {
    if (!Array.isArray(list)) return;
    list.forEach((item) => {
      if (!item || !item.key) return;
      const key = normalizeKey(item.key);
      defs[key] = {
        key,
        label: item.label || key,
        type: item.type || "projected",
        proj4: item.proj4 || null,
        adapter: item.adapter || null,
      };
    });
  }

  function ensureProj4() {
    if (!window.proj4) {
      throw new Error("Proj4 is required but not loaded (vendor/proj4.js).");
    }
  }

  // -------- DLTM adapter math --------
  const a = 6378137.0;
  const invF = 298.257223563;
  const f = 1 / invF;
  const b = a * (1 - f);
  const e2 = (a * a - b * b) / (a * a);
  const ep2 = (a * a - b * b) / (b * b);
  const k0 = 1.0;
  const lon0 = degToRad(55 + 20 / 60); // 55°20'
  const lat0 = 0.0;
  const E0 = 500000.0;
  const N0 = 0.0;

  function degToRad(deg) {
    return (deg * Math.PI) / 180;
  }
  function radToDeg(rad) {
    return (rad * 180) / Math.PI;
  }

  function calculateMeridionalArc(phi) {
    return (
      a *
      ((1 - e2 / 4 - (3 * e2 * e2) / 64 - (5 * Math.pow(e2, 3)) / 256) * phi -
        ((3 * e2) / 8 + (3 * e2 * e2) / 32 + (45 * Math.pow(e2, 3)) / 1024) *
          Math.sin(2 * phi) +
        ((15 * e2 * e2) / 256 + (45 * Math.pow(e2, 3)) / 1024) *
          Math.sin(4 * phi) -
        ((35 * Math.pow(e2, 3)) / 3072) * Math.sin(6 * phi))
    );
  }

  function convertDLTMtoWGS84(easting, northing) {
    const E = Number(easting);
    const N = Number(northing);
    if (!Number.isFinite(E) || !Number.isFinite(N)) {
      throw new Error("Invalid DLTM coordinates");
    }

    const dx = E - E0;
    const dy = N - N0;
    const M0 = calculateMeridionalArc(lat0);
    const M = M0 + dy / k0;
    const mu =
      M /
      (a * (1 - e2 / 4 - (3 * e2 * e2) / 64 - (5 * Math.pow(e2, 3)) / 256));
    const e1 = (1 - Math.sqrt(1 - e2)) / (1 + Math.sqrt(1 - e2));
    const phi1 =
      mu +
      ((3 * e1) / 2 - (27 * Math.pow(e1, 3)) / 32) * Math.sin(2 * mu) +
      ((21 * e1 * e1) / 16 - (55 * Math.pow(e1, 4)) / 32) * Math.sin(4 * mu) +
      ((151 * Math.pow(e1, 3)) / 96) * Math.sin(6 * mu) +
      ((1097 * Math.pow(e1, 4)) / 512) * Math.sin(8 * mu);

    const sin1 = Math.sin(phi1);
    const cos1 = Math.cos(phi1);
    const tan1 = Math.tan(phi1);
    const T1 = tan1 * tan1;
    const C1 = ep2 * cos1 * cos1;
    const N1 = a / Math.sqrt(1 - e2 * sin1 * sin1);
    const R1 = (a * (1 - e2)) / Math.pow(1 - e2 * sin1 * sin1, 1.5);
    const D = dx / (N1 * k0);

    const latRad =
      phi1 -
      ((N1 * tan1) / R1) *
        ((D * D) / 2 -
          ((5 + 3 * T1 + 10 * C1 - 4 * C1 * C1 - 9 * ep2) * Math.pow(D, 4)) / 24 +
          ((61 + 90 * T1 + 298 * C1 + 45 * T1 * T1 - 3 * C1 * C1 - 252 * ep2) *
            Math.pow(D, 6)) /
            720);

    const lonRad =
      lon0 +
      (D -
        ((1 + 2 * T1 + C1) * Math.pow(D, 3)) / 6 +
        ((5 - 2 * C1 + 28 * T1 - 3 * C1 * C1 + 8 * ep2 + 24 * T1 * T1) *
          Math.pow(D, 5)) /
          120) /
        cos1;

    return { x: radToDeg(lonRad), y: radToDeg(latRad) };
  }

  function convertWGS84toDLTM(latDeg, lonDeg) {
    const lat = Number(latDeg);
    const lon = Number(lonDeg);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      throw new Error("Invalid WGS84 coordinates");
    }

    const phi = degToRad(lat);
    const lam = degToRad(lon);
    const sinPhi = Math.sin(phi);
    const cosPhi = Math.cos(phi);
    const tanPhi = Math.tan(phi);
    const N = a / Math.sqrt(1 - e2 * sinPhi * sinPhi);
    const T = tanPhi * tanPhi;
    const C = ep2 * cosPhi * cosPhi;
    const A = (lam - lon0) * cosPhi;
    const M = calculateMeridionalArc(phi);
    const M0 = calculateMeridionalArc(lat0);

    const easting =
      E0 +
      k0 *
        N *
        (A +
          ((1 - T + C) * Math.pow(A, 3)) / 6 +
          ((5 - 18 * T + T * T + 72 * C - 58 * ep2) * Math.pow(A, 5)) / 120);

    const northing =
      N0 +
      k0 *
        (M -
          M0 +
          N *
            tanPhi *
            (Math.pow(A, 2) / 2 +
              ((5 - T + 9 * C + 4 * C * C) * Math.pow(A, 4)) / 24 +
              ((61 - 58 * T + T * T + 600 * C - 330 * ep2) * Math.pow(A, 6)) /
                720));

    return { x: easting, y: northing };
  }

  const adapters = {
    dltm: {
      toWgs84(coord) {
        const wgs = convertDLTMtoWGS84(coord.x, coord.y);
        return { x: wgs.x, y: wgs.y };
      },
      fromWgs84(coord) {
        const r = convertWGS84toDLTM(coord.y, coord.x);
        return { x: r.x, y: r.y };
      },
    },
  };

  function convertWithProj4(from, to, coord) {
    ensureProj4();
    const fromDef = defs[from];
    const toDef = defs[to];
    if (!fromDef || !toDef || !fromDef.proj4 || !toDef.proj4) {
      throw new Error("Unsupported proj4 conversion pair.");
    }
    if (fromDef.proj4 && !proj4.defs(from)) {
      proj4.defs(from, fromDef.proj4);
    }
    if (toDef.proj4 && !proj4.defs(to)) {
      proj4.defs(to, toDef.proj4);
    }
    const res = proj4(fromDef.proj4, toDef.proj4, [coord.x, coord.y]);
    return { x: res[0], y: res[1] };
  }

  function detectOrderFromDigits(row) {
    const parts = Array.isArray(row)
      ? row
      : String(row || "")
          .trim()
          .split(/[,\s;]+/)
          .filter(Boolean);

    const numeric = parts
      .map((p) => {
        const num = parseFloat(p);
        return Number.isFinite(num) ? num : null;
      })
      .filter((n) => n !== null);

    const lens = numeric.map((n) => Math.abs(Math.trunc(n)).toString().length);
    const northIdx = lens.findIndex((l) => l >= 7);
    const eastIdx = lens.findIndex((l) => l === 6);

    if (northIdx !== -1 && eastIdx !== -1 && northIdx !== eastIdx) {
      return { order: ["P", "N", "E", "CODE"], confidence: "high" };
    }

    return { order: ["P", "N", "E", "CODE"], confidence: "low" };
  }

  function parsePointRow(row, orderString) {
    const order = (orderString || "P,N,E,CODE")
      .split(/[, ]+/)
      .map((p) => p.trim().toUpperCase())
      .filter(Boolean);
    const parts = Array.isArray(row)
      ? row
      : String(row || "")
          .trim()
          .split(/[,\s;]+/)
          .filter(Boolean);

    const point = { id: null, e: null, n: null, code: null };
    order.forEach((token, idx) => {
      const value = parts[idx];
      if (value === undefined) return;
      if (token === "P" || token === "ID") point.id = value;
      if (token === "E" || token === "X") point.e = parseFloat(value);
      if (token === "N" || token === "Y") point.n = parseFloat(value);
      if (token.startsWith("CODE") || token === "C") point.code = value;
    });
    return point;
  }

  function dispatchUpdated() {
    window.dispatchEvent(new CustomEvent("geocrs:updated"));
  }

  async function initLoad() {
    const ok = await loadJson(resolveDataUrl(), true);
    if (!ok) seedDefaults();
    dispatchUpdated();
  }

  readyPromise = initLoad();

  window.GeoCRS = {
    ready() {
      return readyPromise || Promise.resolve();
    },
    async reload() {
      const url = resolveDataUrl() + "?v=" + Date.now();
      await loadJson(url, false);
      dispatchUpdated();
    },
    list() {
      return Object.values(defs);
    },
    get(key) {
      return defs[normalizeKey(key)] || null;
    },
    register(key, def) {
      defs[normalizeKey(key)] = { ...def, key: normalizeKey(key) };
      dispatchUpdated();
    },
    convert({ from, to, coord }) {
      const src = normalizeKey(from);
      const dst = normalizeKey(to);
      if (src === dst) return { x: coord.x, y: coord.y };

      const srcDef = defs[src];
      const dstDef = defs[dst];
      if (!srcDef || !dstDef) throw new Error("Unknown CRS.");

      const srcAdapter = srcDef.adapter && adapters[srcDef.adapter];
      const dstAdapter = dstDef.adapter && adapters[dstDef.adapter];

      if (srcAdapter && dst === "epsg4326") {
        const res = srcAdapter.toWgs84(coord);
        return { x: res.x, y: res.y, meta: { note: "adapter → WGS84" } };
      }
      if (dstAdapter && src === "epsg4326") {
        const res = dstAdapter.fromWgs84(coord);
        return { x: res.x, y: res.y, meta: { note: "WGS84 → adapter" } };
      }
      if (srcAdapter && dstAdapter) {
        const wgs = srcAdapter.toWgs84(coord);
        const res = dstAdapter.fromWgs84(wgs);
        return { x: res.x, y: res.y, meta: { note: "adapter → adapter via WGS84" } };
      }

      const result = convertWithProj4(src, dst, coord);
      return { x: result.x, y: result.y, meta: { note: "proj4" } };
    },
    detectOrderFromDigits,
    parsePointRow,
  };
})();
