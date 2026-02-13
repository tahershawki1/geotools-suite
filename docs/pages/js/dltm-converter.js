  (function () {
    // ----------------------------
    // Minimal Loader Fallback
    // (Index.html already includes showLoader)
    // ----------------------------
    function safeShowLoader(show) {
      try {
        if (typeof showLoader === "function") return showLoader(show);
      } catch {}
      // fallback: no-op
    }

    // ----------------------------
    // Local Storage for Last Inputs
    // ----------------------------
    function saveLastInputs() {
      const e = document.getElementById("inp-e").value;
      const n = document.getElementById("inp-n").value;
      const lon = document.getElementById("inp-lon").value;
      const lat = document.getElementById("inp-lat").value;
      const format = document.getElementById("out-format").value;
      const precision = document.getElementById("out-prec").value;

      localStorage.setItem("dltm_lastE", e);
      localStorage.setItem("dltm_lastN", n);
      localStorage.setItem("dltm_lastLon", lon);
      localStorage.setItem("dltm_lastLat", lat);
      localStorage.setItem("dltm_lastFormat", format);
      localStorage.setItem("dltm_lastPrecision", precision);
    }

    function loadLastInputs() {
      const e = localStorage.getItem("dltm_lastE");
      const n = localStorage.getItem("dltm_lastN");
      const lon = localStorage.getItem("dltm_lastLon");
      const lat = localStorage.getItem("dltm_lastLat");
      const format = localStorage.getItem("dltm_lastFormat") || "dms";
      const precision = localStorage.getItem("dltm_lastPrecision") || "8";

      if (e) document.getElementById("inp-e").value = e;
      if (n) document.getElementById("inp-n").value = n;
      if (lon) document.getElementById("inp-lon").value = lon;
      if (lat) document.getElementById("inp-lat").value = lat;
      document.getElementById("out-format").value = format;
      document.getElementById("out-prec").value = precision;
    }

    function clearLastInputs() {
      localStorage.removeItem("dltm_lastE");
      localStorage.removeItem("dltm_lastN");
      localStorage.removeItem("dltm_lastLon");
      localStorage.removeItem("dltm_lastLat");
      localStorage.removeItem("dltm_lastFormat");
      localStorage.removeItem("dltm_lastPrecision");
    }

    // ----------------------------
    // Tabs
    // ----------------------------
    window.switchDltmTab = function (el, tab) {
      document
        .querySelectorAll(".dltm-tab")
        .forEach((t) => t.classList.remove("active"));
      document
        .querySelectorAll(".tool-section")
        .forEach((s) => s.classList.remove("active"));
      el.classList.add("active");
      document.getElementById("section-" + tab).classList.add("active");
    };

    window.switchBatchDirection = function (dir) {
      const textarea = document.getElementById("batchPaste");
      if (dir === "wgs-to-dltm") {
        textarea.placeholder =
          "WGS84 Example:\n55.123456,25.123456\n55.234567,25.234567\nOr with commas/spaces/Tab";
      } else {
        textarea.placeholder =
          "DLTM Example:\n489817.908,2768047.013\n489790.938,2768033.067\nOr with commas/spaces/Tab";
      }
    };

    // ----------------------------
    // Core Math (Ported from DLTM_Utils.gs)
    // Parameters from your screenshot:
    // - WGS84 ellipsoid
    // - TM: lon0 = 55°20'00"E, k0=1.0, FE=500000, FN=0
    // ----------------------------
    function degToRad(deg) {
      return (deg * Math.PI) / 180;
    }
    function radToDeg(rad) {
      return (rad * 180) / Math.PI;
    }

    function calculateMeridionalArc(phi, a, e2) {
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

    function latLonToUTM(latDeg, lonDeg) {
      // WGS84
      const a = 6378137.0;
      const invF = 298.257223563;
      const f = 1 / invF;
      const b = a * (1 - f);

      const e2 = (a * a - b * b) / (a * a);
      const ep2 = (a * a - b * b) / (b * b);

      const lat = degToRad(latDeg);
      const lon = degToRad(lonDeg);

      let zone = Math.floor((lonDeg + 180) / 6) + 1;
      if (zone < 1) zone = 1;
      if (zone > 60) zone = 60;

      const hemisphere = latDeg >= 0 ? "N" : "S";
      const lon0Deg = (zone - 1) * 6 - 180 + 3;
      const lon0 = degToRad(lon0Deg);

      const k0 = 0.9996;
      const E0 = 500000.0;
      const N0 = hemisphere === "S" ? 10000000.0 : 0.0;

      const sinLat = Math.sin(lat);
      const cosLat = Math.cos(lat);
      const tanLat = Math.tan(lat);

      const N = a / Math.sqrt(1 - e2 * sinLat * sinLat);
      const T = tanLat * tanLat;
      const C = ep2 * cosLat * cosLat;
      const A = (lon - lon0) * cosLat;

      const M = calculateMeridionalArc(lat, a, e2);

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
          (M +
            N *
              tanLat *
              (Math.pow(A, 2) / 2 +
                ((5 - T + 9 * C + 4 * C * C) * Math.pow(A, 4)) / 24 +
                ((61 - 58 * T + T * T + 600 * C - 330 * ep2) * Math.pow(A, 6)) /
                  720));

      return { zone, hemisphere, easting, northing };
    }

    function convertDLTMtoWGS84(easting, northing) {
      try {
        const E = Number(easting);
        const N = Number(northing);
        if (!Number.isFinite(E) || !Number.isFinite(N))
          throw new Error("Invalid input");

        // WGS84
        const a = 6378137.0;
        const invF = 298.257223563;
        const f = 1 / invF;
        const b = a * (1 - f);

        const e2 = (a * a - b * b) / (a * a);
        const ep2 = (a * a - b * b) / (b * b);

        // DLTM params
        const k0 = 1.0;
        const lon0 = degToRad(55 + 20 / 60); // 55°20'
        const lat0 = 0.0;
        const E0 = 500000.0;
        const N0 = 0.0;

        const dx = E - E0;
        const dy = N - N0;

        const M0 = calculateMeridionalArc(lat0, a, e2);
        const M = M0 + dy / k0;

        const mu =
          M /
          (a * (1 - e2 / 4 - (3 * e2 * e2) / 64 - (5 * Math.pow(e2, 3)) / 256));

        const e1 = (1 - Math.sqrt(1 - e2)) / (1 + Math.sqrt(1 - e2));

        const phi1 =
          mu +
          ((3 * e1) / 2 - (27 * Math.pow(e1, 3)) / 32) * Math.sin(2 * mu) +
          ((21 * e1 * e1) / 16 - (55 * Math.pow(e1, 4)) / 32) *
            Math.sin(4 * mu) +
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
              ((5 + 3 * T1 + 10 * C1 - 4 * C1 * C1 - 9 * ep2) *
                Math.pow(D, 4)) /
                24 +
              ((61 +
                90 * T1 +
                298 * C1 +
                45 * T1 * T1 -
                3 * C1 * C1 -
                252 * ep2) *
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

        const lat = radToDeg(latRad);
        const lon = radToDeg(lonRad);
        const utm = latLonToUTM(lat, lon);

        return { success: true, latitude: lat, longitude: lon, utm };
      } catch (err) {
        return { success: false, error: String(err?.message || err) };
      }
    }

    // DMS conversion helpers
    function toDMS(value, isLon) {
      // value: decimal degrees
      const dir = isLon ? (value >= 0 ? "E" : "W") : value >= 0 ? "N" : "S";
      const abs = Math.abs(value);

      const deg = Math.floor(abs);
      const minFloat = (abs - deg) * 60;
      const min = Math.floor(minFloat);
      const sec = (minFloat - min) * 60;

      // 3 decimals like screenshot (12.036")
      const secStr = sec.toFixed(3).padStart(6, "0"); // ensures 00.000 style if needed

      return `${deg}°${String(min).padStart(2, "0")}'${secStr}" ${dir}`;
    }

    function toDMSNoDir(value) {
      // If you prefer without N/E letters
      const abs = Math.abs(value);
      const deg = Math.floor(abs);
      const minFloat = (abs - deg) * 60;
      const min = Math.floor(minFloat);
      const sec = (minFloat - min) * 60;
      const secStr = sec.toFixed(3).padStart(6, "0");
      return `${deg}°${String(min).padStart(2, "0")}'${secStr}"`;
    }

    function toDDM(value, isLon) {
      const dir = isLon ? (value >= 0 ? "E" : "W") : value >= 0 ? "N" : "S";
      const abs = Math.abs(value);
      const deg = Math.floor(abs);
      const minutes = (abs - deg) * 60;
      return `${deg}°${minutes.toFixed(3).padStart(6, "0")}' ${dir}`;
    }

    function formatCoord(value, isLon) {
      const fmt = document.getElementById("out-format")?.value || "dms";
      const prec = Number(document.getElementById("out-prec")?.value || 8);
      if (fmt === "dd")
        return `${value.toFixed(prec)} ${isLon ? (value >= 0 ? "E" : "W") : value >= 0 ? "N" : "S"}`;
      if (fmt === "ddm") return toDDM(value, isLon);
      return toDMS(value, isLon);
    }

    function validateAndMaybeSwap(E, N) {
      const E_ok = E > 200000 && E < 900000;
      const N_ok = N > 2000000 && N < 4000000;
      const swapLikely =
        !E_ok &&
        !N_ok &&
        N > 200000 &&
        N < 900000 &&
        E > 2000000 &&
        E < 4000000;
      if (swapLikely)
        return {
          E: N,
          N: E,
          swapped: true,
          warn: "East/North seems swapped; values were switched automatically.",
        };
      const warn =
        !E_ok || !N_ok
          ? "Warning: coordinates are outside expected range. Verify CRS/values."
          : "";
      return { E, N, swapped: false, warn };
    }

    function convertWGS84toDLTM(latDeg, lonDeg) {
      try {
        const lat = Number(latDeg),
          lon = Number(lonDeg);
        if (!Number.isFinite(lat) || !Number.isFinite(lon))
          throw new Error("Invalid input");
        const a = 6378137.0;
        const invF = 298.257223563;
        const f = 1 / invF;
        const b = a * (1 - f);
        const e2 = (a * a - b * b) / (a * a);
        const ep2 = (a * a - b * b) / (b * b);
        const k0 = 1.0;
        const lon0 = degToRad(55 + 20 / 60);
        const lat0 = 0.0;
        const E0 = 500000.0;
        const N0 = 0.0;
        const phi = degToRad(lat);
        const lam = degToRad(lon);
        const sinPhi = Math.sin(phi);
        const cosPhi = Math.cos(phi);
        const tanPhi = Math.tan(phi);
        const N = a / Math.sqrt(1 - e2 * sinPhi * sinPhi);
        const T = tanPhi * tanPhi;
        const C = ep2 * cosPhi * cosPhi;
        const A = (lam - lon0) * cosPhi;
        const M = calculateMeridionalArc(phi, a, e2);
        const M0 = calculateMeridionalArc(lat0, a, e2);
        const East =
          E0 +
          k0 *
            N *
            (A +
              ((1 - T + C) * Math.pow(A, 3)) / 6 +
              ((5 - 18 * T + T * T + 72 * C - 58 * ep2) * Math.pow(A, 5)) /
                120);
        const North =
          N0 +
          k0 *
            (M -
              M0 +
              N *
                tanPhi *
                (Math.pow(A, 2) / 2 +
                  ((5 - T + 9 * C + 4 * C * C) * Math.pow(A, 4)) / 24 +
                  ((61 - 58 * T + T * T + 600 * C - 330 * ep2) *
                    Math.pow(A, 6)) /
                    720));
        return { success: true, easting: East, northing: North };
      } catch (err) {
        return { success: false, error: String(err?.message || err) };
      }
    }

    // ----------------------------
    // Single Conversion
    // ----------------------------
    window.runSingleDltm = function () {
      const e = parseFloat(document.getElementById("inp-e").value);
      const n = parseFloat(document.getElementById("inp-n").value);
      if (isNaN(e) || isNaN(n)) return alert("Enter valid coordinates");

      saveLastInputs();

      const btn = document.getElementById("btn-convert-single");
      btn.disabled = true;
      btn.innerText = "Converting...";

      // Local compute (no backend)
      const v = validateAndMaybeSwap(e, n);
      const res = convertDLTMtoWGS84(v.E, v.N);

      btn.disabled = false;
      btn.innerText = "Convert Now ✨";

      if (!res.success) return alert("Error: " + res.error);

      // Longitude/Latitude (formatCoord changes based on selection)
      document.getElementById("res-lon-dms").innerText = formatCoord(
        res.longitude,
        true,
      );
      document.getElementById("res-lat-dms").innerText = formatCoord(
        res.latitude,
        false,
      );

      document.getElementById("res-lon-dd").innerText =
        res.longitude.toFixed(8);
      document.getElementById("res-lat-dd").innerText = res.latitude.toFixed(8);

      // UTM
      document.getElementById("res-utm-z").innerText =
        String(res.utm.zone) + String(res.utm.hemisphere);
      document.getElementById("res-utm-e").innerText = Number(
        res.utm.easting,
      ).toFixed(3);
      document.getElementById("res-utm-n").innerText = Number(
        res.utm.northing,
      ).toFixed(3);

      if (v.warn) {
        const note = document.getElementById("res-note");
        if (note) {
          note.style.display = "block";
          note.innerText = v.warn;
        }
      }

      document.getElementById("res-box-single").style.display = "block";
      showPointOnMap(res.latitude, res.longitude);
    };

    // ----------------------------
    // Batch Conversion (CSV/TXT)
    // Supports:
    // [E, N] or [E, N, PointID, Code]
    // ----------------------------
    let batchData = [];

    window.handleBatchFile = function (input) {
      const file = input.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = function (ev) {
        const content = String(ev.target.result || "");
        const lines = content.split(/\r?\n/).filter((l) => l.trim());
        const rows = [];

        lines.forEach((line, i) => {
          if (i === 0 && /[a-zA-Z]/.test(line)) return; // Skip header
          const parts = line
            .split(/[,\t;]+/)
            .map((p) => p.trim())
            .filter(Boolean);
          if (parts.length < 2) return;

          // Identify columns by digit count: N has 7 digits, E has 6 digits
          let pointId = null,
            northing = null,
            easting = null,
            zValue = null,
            code = null;

          for (let j = 0; j < parts.length; j++) {
            const val = parts[j];
            const integerPart = val.split(".")[0];
            const integerDigits = integerPart.replace(/[^0-9]/g, "").length;
            const isNumeric = !isNaN(parseFloat(val)) && isFinite(val);

            // Identify by digit count first
            if (isNumeric && integerDigits === 7 && northing === null) {
              northing = parseFloat(val);
            } else if (isNumeric && integerDigits === 6 && easting === null) {
              easting = parseFloat(val);
            } else if (
              isNumeric &&
              integerDigits <= 4 &&
              northing !== null &&
              easting !== null &&
              zValue === null
            ) {
              // Small number after N,E = Z value
              zValue = parseFloat(val);
            } else if (!isNumeric && pointId === null) {
              // Text = Point ID
              pointId = val;
            } else if (isNumeric && integerDigits <= 2 && pointId === null) {
              // Small number first = Point ID
              pointId = String(val);
            } else if (!isNumeric && code === null && pointId !== null) {
              // Text after others = Code
              code = val;
            }
          }

          if (northing !== null && easting !== null) {
            rows.push({
              pointId: pointId || "",
              northing,
              easting,
              zValue: zValue || 0,
              code: code || "",
            });
          }
        });

        if (!rows.length) return alert("No valid data found");
        safeShowLoader(true);

        // Convert DLTM to WGS84 and then to UTM Zone 40N
        const results = rows.map((r) => {
          const conv = convertDLTMtoWGS84(r.easting, r.northing);

          if (!conv.success) {
            return {
              error: conv.error,
              pointId: r.pointId,
            };
          }

          // Convert to UTM Zone 40N
          const utm40 = convertWGS84toUTMZone40N(conv.latitude, conv.longitude);

          return {
            pointId: r.pointId,
            nDltm: r.northing,
            eDltm: r.easting,
            zDltm: r.zValue,
            code: r.code,
            latitude: conv.latitude,
            longitude: conv.longitude,
            utmN: utm40.northing,
            utmE: utm40.easting,
            utmZone: "40N",
            altitude: r.zValue || "",
          };
        });

        safeShowLoader(false);
        batchData = results;
        renderBatchResults(results);
      };

      reader.readAsText(file);
    };

    // Helper function to convert WGS84 to UTM Zone 40N
    function convertWGS84toUTMZone40N(lat, lon) {
      const zone = 40;
      const lonOrigin = (zone - 0.5) * 6 - 180; // Central meridian for zone 40
      const a = 6378137.0; // WGS84 semi-major axis
      const b = 6356752.314245; // WGS84 semi-minor axis
      const f = 1 / 298.257223563; // WGS84 flattening
      const k0 = 0.9996; // UTM scale factor
      const e2 = f * (2 - f);
      const e4 = e2 * e2;
      const e6 = e4 * e2;

      const latRad = (lat * Math.PI) / 180;
      const lonRad = (lon * Math.PI) / 180;
      const lonOriginRad = (lonOrigin * Math.PI) / 180;

      const N = a / Math.sqrt(1 - e2 * Math.sin(latRad) * Math.sin(latRad));
      const T = Math.tan(latRad) * Math.tan(latRad);
      const C = (e2 / (1 - e2)) * Math.cos(latRad) * Math.cos(latRad);
      const A = Math.cos(latRad) * (lonRad - lonOriginRad);
      const M =
        a *
        ((1 - e2 / 4 - (3 * e4) / 64 - (5 * e6) / 256) * latRad -
          ((3 * e2) / 8 + (3 * e4) / 32 - (45 * e6) / 1024) *
            Math.sin(2 * latRad) +
          ((15 * e4) / 256 - (45 * e6) / 1024) * Math.sin(4 * latRad) -
          ((35 * e6) / 3072) * Math.sin(6 * latRad));

      const easting =
        k0 *
          N *
          (A +
            ((A * A * A) / 6) * (1 - T + C) +
            (Math.pow(A, 5) / 120) * (1 - 5 * T + 9 * C + 4 * C * C)) +
        500000;
      const northing =
        k0 *
        (M +
          N *
            Math.tan(latRad) *
            ((A * A) / 2 +
              (Math.pow(A, 4) / 24) * (5 - T + 9 * C + 4 * C * C) +
              (Math.pow(A, 6) / 720) *
                (61 - 58 * T + T * T + 600 * C - 330 * e2)));

      return { easting, northing };
    }

    function renderBatchResults(results) {
      const tbody = document.querySelector("#batchTable tbody");
      tbody.innerHTML = "";

      results.forEach((r) => {
        if (r.error) return;
        const tr = document.createElement("tr");

        // Format numbers safely
        const formatNum = (val, decimals) => {
          if (val === null || val === undefined || val === "") return "";
          const num = Number(val);
          return isFinite(num) ? num.toFixed(decimals) : "";
        };

        tr.innerHTML =
          `<td>${escapeHtml(r.pointId || "")}</td>` +
          `<td>${escapeHtml(r.pointId || "")}</td>` +
          `<td>${formatNum(r.nDltm, 2)}</td>` +
          `<td>${formatNum(r.eDltm, 2)}</td>` +
          `<td>${formatNum(r.zDltm, 2)}</td>` +
          `<td>${escapeHtml(r.code || "")}</td>` +
          `<td>${formatNum(r.utmN, 2)}</td>` +
          `<td>${formatNum(r.utmE, 2)}</td>` +
          `<td>${r.utmZone || "40N"}</td>` +
          `<td>${formatNum(r.latitude, 6)}</td>` +
          `<td>${formatNum(r.longitude, 6)}</td>` +
          `<td>${formatNum(r.altitude, 2)}</td>` +
          `<td>${escapeHtml(r.code || "")}</td>`;

        // Click to show on map
        tr.style.cursor = "pointer";
        tr.addEventListener("click", () =>
          showPointOnMap(r.latitude, r.longitude),
        );

        tbody.appendChild(tr);
      });

      const okCount = results.filter((r) => !r.error).length;
      document.getElementById("batchCount").innerText =
        okCount + " points converted";
      document.getElementById("batchResultsWrap").style.display = "block";
    }

    window.downloadBatchCsv = function () {
      if (!batchData.length) return;
      let csv =
        "POINT,ID,N_DLTM,E_DLTM,Z_DLTM,Code,UTM_N,UTM_E,UTM_Z,Latitude,Longitude,altitude,code\n";
      let filename = "DLTM_to_UTM_Zone40N.csv";

      batchData.forEach((r) => {
        if (r.error) return;
        csv += `${safeCsv(r.pointId)},${safeCsv(r.pointId)},${r.nDltm},${r.eDltm},${r.zDltm},${safeCsv(r.code)},${r.utmN},${r.utmE},${r.utmZone},${r.latitude},${r.longitude},${r.altitude},${safeCsv(r.code)}\n`;
      });

      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    };

    window.runBatchFromPaste = function () {
      const text = (document.getElementById("batchPaste").value || "").trim();
      if (!text) return alert("Paste coordinates first");
      const direction =
        document.querySelector("input[name='batch-direction']:checked")
          ?.value || "dltm-to-wgs";

      const lines = text
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean);
      const rows = [];
      for (const line of lines) {
        const parts = line
          .split(/[,\t; ]+/)
          .map((p) => p.trim())
          .filter(Boolean);
        if (parts.length < 2) continue;
        const val1 = parseFloat(parts[0]);
        const val2 = parseFloat(parts[1]);
        const pId = parts.length >= 3 ? parts[2] : "";
        const code = parts.length >= 4 ? parts[3] : "";
        if (Number.isFinite(val1) && Number.isFinite(val2))
          rows.push([val1, val2, pId, code]);
      }
      if (!rows.length) return alert("No valid rows found");
      safeShowLoader(true);

      let results;
      if (direction === "wgs-to-dltm") {
        results = rows.map(([lon, lat, pId, code]) => {
          const conv = convertWGS84toDLTM(lat, lon);
          if (!conv.success)
            return {
              pId,
              code,
              longitude: lon,
              latitude: lat,
              error: conv.error,
            };
          const utm = latLonToUTM(lat, lon);
          return {
            pId,
            code,
            easting: conv.easting,
            northing: conv.northing,
            latitude: lat,
            longitude: lon,
            utmE: utm.easting,
            utmN: utm.northing,
            utmZone: String(utm.zone) + String(utm.hemisphere),
          };
        });
      } else {
        results = rows.map(([east, north, pId, code]) => {
          const v = validateAndMaybeSwap(east, north);
          const conv = convertDLTMtoWGS84(v.E, v.N);
          if (!conv.success)
            return {
              pId,
              code,
              easting: east,
              northing: north,
              error: conv.error,
            };
          return {
            pId,
            code,
            easting: east,
            northing: north,
            latitude: conv.latitude,
            longitude: conv.longitude,
            utmE: conv.utm.easting,
            utmN: conv.utm.northing,
            utmZone: String(conv.utm.zone) + String(conv.utm.hemisphere),
          };
        });
      }

      safeShowLoader(false);
      batchData = results;
      renderBatchResults(results);
    };

    window.downloadBatch = function () {
      const t = document.getElementById("batchExportType")?.value || "csv";
      if (t === "kml") return downloadBatchKml();
      if (t === "geojson") return downloadBatchGeoJson();
      return downloadBatchCsv();
    };

    function downloadBatchKml() {
      const ok = batchData.filter((r) => !r.error);
      if (!ok.length) return alert("No data to export");
      const direction =
        document.querySelector("input[name='batch-direction']:checked")
          ?.value || "dltm-to-wgs";
      const filename =
        direction === "wgs-to-dltm" ? "WGS84_to_DLTM.kml" : "DLTM_to_WGS84.kml";
      const placemarks = ok
        .map(
          (r, i) => `
    <Placemark>
      <name>${r.pId || "P" + (i + 1)}</name>
      <description>${r.code || ""}</description>
      <Point><coordinates>${r.longitude},${r.latitude},0</coordinates></Point>
    </Placemark>`,
        )
        .join("\n");
      const kml = `<?xml version="1.0" encoding="UTF-8"?>
  <kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>${placemarks}
  </Document>
  </kml>`;
      const blob = new Blob([kml], {
        type: "application/vnd.google-earth.kml+xml;charset=utf-8",
      });
      const u = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = u;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(u);
    }

    function downloadBatchGeoJson() {
      const ok = batchData.filter((r) => !r.error);
      if (!ok.length) return alert("No data to export");
      const direction =
        document.querySelector("input[name='batch-direction']:checked")
          ?.value || "dltm-to-wgs";
      const filename =
        direction === "wgs-to-dltm"
          ? "WGS84_to_DLTM.geojson"
          : "DLTM_to_WGS84.geojson";
      const geo = {
        type: "FeatureCollection",
        features: ok.map((r, i) => ({
          type: "Feature",
          properties: {
            point: r.pId || "P" + (i + 1),
            code: r.code || "",
            e_dltm: r.easting,
            n_dltm: r.northing,
            utm_zone: r.utmZone,
            utm_e: r.utmE,
            utm_n: r.utmN,
          },
          geometry: { type: "Point", coordinates: [r.longitude, r.latitude] },
        })),
      };
      const blob = new Blob([JSON.stringify(geo, null, 2)], {
        type: "application/geo+json;charset=utf-8",
      });
      const u = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = u;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(u);
    }

    let _map = null;
    let _marker = null;
    let _lastLatLon = null;

    function destroyMapIfAny() {
      try {
        if (_map) {
          _map.remove(); // Fixes "Map container is already initialized" issue
          _map = null;
          _marker = null;
        }
      } catch (e) {
        _map = null;
        _marker = null;
      }
    }

    function ensureMap() {
      // If the page reloads inside SPA and keeps the same id
      if (_map) return;

      const mapEl = document.getElementById("map");
      if (!mapEl) return;

      // If Leaflet sees the container affected by previous initialization
      if (mapEl._leaflet_id) {
        destroyMapIfAny();
        // Clear old leaflet id
        try {
          delete mapEl._leaflet_id;
        } catch {}
      }

      _map = L.map("map", { zoomControl: true }).setView([25.2, 55.3], 10);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap",
      }).addTo(_map);
    }

    function showPointOnMap(lat, lon) {
      _lastLatLon = { lat, lon };

      const box = document.getElementById("mapBox");
      if (box) box.style.display = "block";

      // Important: wait one frame after showing the div
      requestAnimationFrame(() => {
        ensureMap();
        if (!_map) return;

        _map.setView([lat, lon], 17);

        if (_marker) _map.removeLayer(_marker);

        // Use embedded SVG marker instead of relying on external CDN
        const markerIcon = L.divIcon({
          html: `<svg width="40" height="50" viewBox="0 0 40 50" xmlns="http://www.w3.org/2000/svg">
            <path d="M 20 0 C 8.954 0 0 8.954 0 20 C 0 35 20 50 20 50 S 40 35 40 20 C 40 8.954 31.046 0 20 0 Z" fill="#FF0000" stroke="#FFF" stroke-width="2"/>
            <circle cx="20" cy="20" r="8" fill="#FFF"/>
          </svg>`,
          className: "custom-marker",
          iconSize: [40, 50],
          iconAnchor: [20, 50],
          popupAnchor: [0, -50],
        });

        _marker = L.marker([lat, lon], { icon: markerIcon })
          .addTo(_map)
          .bindPopup(
            `<div style="font-family: Cairo, sans-serif; color: #333;"><b>📍 Point</b><br/>Lat: ${lat.toFixed(6)}<br/>Lon: ${lon.toFixed(6)}</div>`,
            {
              className: "custom-popup",
            },
          );

        // Open marker popup automatically
        _marker.openPopup();

        // Most important: force Leaflet to recalculate sizes
        setTimeout(() => {
          try {
            _map.invalidateSize(true);
          } catch {}
        }, 120);
      });
    }

    window.openGoogleMapsLink = function () {
      if (!_lastLatLon) return alert("No point available to display");
      const url = `https://www.google.com/maps?q=${_lastLatLon.lat},${_lastLatLon.lon}`;
      window.open(url, "_blank");
    };

    window.downloadSingleKml = function () {
      if (!_lastLatLon) return alert("No point available to export");
      const { lat, lon } = _lastLatLon;
      const kml = `<?xml version="1.0" encoding="UTF-8"?>
  <kml xmlns="http://www.opengis.net/kml/2.2">
    <Placemark>
      <name>DLTM Convert</name>
      <Point><coordinates>${lon},${lat},0</coordinates></Point>
    </Placemark>
  </kml>`;
      const blob = new Blob([kml], {
        type: "application/vnd.google-earth.kml+xml;charset=utf-8",
      });
      const u = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = u;
      a.download = "point.kml";
      a.click();
      URL.revokeObjectURL(u);
    };

    window.runReverseDltm = function () {
      const inputType =
        document.querySelector("input[name='rev-input-type']:checked")?.value ||
        "wgs84";

      if (inputType === "wgs84") {
        const lon = parseFloat(document.getElementById("inp-lon").value);
        const lat = parseFloat(document.getElementById("inp-lat").value);
        if (isNaN(lat) || isNaN(lon))
          return alert("Enter valid Latitude/Longitude");
        saveLastInputs();
        const r = convertWGS84toDLTM(lat, lon);
        if (!r.success) return alert("Error: " + r.error);
        document.getElementById("res-dltm-e").innerText = r.easting.toFixed(3);
        document.getElementById("res-dltm-n").innerText = r.northing.toFixed(3);
        const note = document.getElementById("reverse-note");
        if (note) {
          note.style.display = "block";
          note.innerText =
            "Converted from WGS84 using DLTM parameters (lon0=55°20′, FE=500000, k0=1.0).";
        }
        document.getElementById("reverse-box").style.display = "block";
      } else {
        // Convert from UTM
        const zone = document.getElementById("inp-utm-zone").value.trim();
        const utmE = parseFloat(document.getElementById("inp-utm-e").value);
        const utmN = parseFloat(document.getElementById("inp-utm-n").value);
        if (!zone || isNaN(utmE) || isNaN(utmN))
          return alert("Enter valid UTM Zone, Easting, and Northing");

        saveLastInputs();
        const r = convertUTMtoDLTM(zone, utmE, utmN);
        if (!r.success) return alert("Error: " + r.error);
        document.getElementById("res-dltm-e").innerText = r.easting.toFixed(3);
        document.getElementById("res-dltm-n").innerText = r.northing.toFixed(3);
        const note = document.getElementById("reverse-note");
        if (note) {
          note.style.display = "block";
          note.innerText = "Converted from UTM to DLTM.";
        }
        document.getElementById("reverse-box").style.display = "block";
      }
    };

    window.copyReverse = async function (mode) {
      const e = document.getElementById("res-dltm-e")?.innerText || "";
      const n = document.getElementById("res-dltm-n")?.innerText || "";
      const lon = document.getElementById("inp-lon")?.value || "";
      const lat = document.getElementById("inp-lat")?.value || "";
      const text =
        mode === "dltm"
          ? `Easting: ${e}\nNorthing: ${n}`
          : `Longitude: ${lon}\nLatitude: ${lat}`;
      const ok = await copyTextSmart(text);
      alert(ok ? "Copied ✅" : "Copy failed ❌");
    };

    window.showOnMapFromWgs = function () {
      const inputType =
        document.querySelector("input[name='rev-input-type']:checked")?.value ||
        "wgs84";

      if (inputType === "wgs84") {
        const lon = parseFloat(document.getElementById("inp-lon").value);
        const lat = parseFloat(document.getElementById("inp-lat").value);
        if (isNaN(lat) || isNaN(lon))
          return alert("Enter valid Latitude/Longitude");
        showPointOnMap(lat, lon);
      } else {
        const zone = document.getElementById("inp-utm-zone").value.trim();
        const utmE = parseFloat(document.getElementById("inp-utm-e").value);
        const utmN = parseFloat(document.getElementById("inp-utm-n").value);
        if (!zone || isNaN(utmE) || isNaN(utmN))
          return alert("Enter valid UTM Zone, Easting, and Northing");
        const wgs = convertUTMtoWGS84(zone, utmE, utmN);
        if (!wgs.success) return alert("Error: " + wgs.error);
        showPointOnMap(wgs.latitude, wgs.longitude);
      }
    };

    function escapeHtml(s) {
      return String(s ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    }

    function safeCsv(s) {
      const v = String(s ?? "");
      if (/[",\n]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
      return v;
    }

    function fallbackCopyText(text) {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.top = "-9999px";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      ta.setSelectionRange(0, ta.value.length);

      let ok = false;
      try {
        ok = document.execCommand("copy");
      } catch (e) {
        ok = false;
      }
      document.body.removeChild(ta);
      return ok;
    }

    async function copyTextSmart(text) {
      // Try modern clipboard first
      try {
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(text);
          return true;
        }
      } catch (e) {
        // ignore and fallback
      }
      // Fallback
      return fallbackCopyText(text);
    }

    window.copySingle = async function (mode) {
      const lonDms = document.getElementById("res-lon-dms")?.innerText || "";
      const latDms = document.getElementById("res-lat-dms")?.innerText || "";
      const lonDd = document.getElementById("res-lon-dd")?.innerText || "";
      const latDd = document.getElementById("res-lat-dd")?.innerText || "";
      const utmZ = document.getElementById("res-utm-z")?.innerText || "";
      const utmE = document.getElementById("res-utm-e")?.innerText || "";
      const utmN = document.getElementById("res-utm-n")?.innerText || "";

      let text = "";
      if (mode === "dms")
        text = `Longitude (DMS): ${lonDms}\nLatitude (DMS): ${latDms}`;
      else if (mode === "dd")
        text = `Longitude (Decimal): ${lonDd}\nLatitude (Decimal): ${latDd}`;
      else text = `UTM: ${utmZ}\nEasting: ${utmE}\nNorthing: ${utmN}`;

      const ok = await copyTextSmart(text);
      alert(ok ? "Copied ✅" : "Copy failed ❌");
    };

    // ----------------------------
    // Local Storage for Last Inputs
    // ----------------------------
    window.saveLastInputs = function () {
      const e = document.getElementById("inp-e").value;
      const n = document.getElementById("inp-n").value;
      const lon = document.getElementById("inp-lon").value;
      const lat = document.getElementById("inp-lat").value;
      const format = document.getElementById("out-format").value;
      const precision = document.getElementById("out-prec").value;

      localStorage.setItem("dltm_lastE", e);
      localStorage.setItem("dltm_lastN", n);
      localStorage.setItem("dltm_lastLon", lon);
      localStorage.setItem("dltm_lastLat", lat);
      localStorage.setItem("dltm_lastFormat", format);
      localStorage.setItem("dltm_lastPrecision", precision);
    };

    window.loadLastInputs = function () {
      const e = localStorage.getItem("dltm_lastE");
      const n = localStorage.getItem("dltm_lastN");
      const lon = localStorage.getItem("dltm_lastLon");
      const lat = localStorage.getItem("dltm_lastLat");
      const format = localStorage.getItem("dltm_lastFormat") || "dms";
      const precision = localStorage.getItem("dltm_lastPrecision") || "8";

      if (e) document.getElementById("inp-e").value = e;
      if (n) document.getElementById("inp-n").value = n;
      if (lon) document.getElementById("inp-lon").value = lon;
      if (lat) document.getElementById("inp-lat").value = lat;
      document.getElementById("out-format").value = format;
      document.getElementById("out-prec").value = precision;
    };

    window.clearLastInputs = function () {
      localStorage.removeItem("dltm_lastE");
      localStorage.removeItem("dltm_lastN");
      localStorage.removeItem("dltm_lastLon");
      localStorage.removeItem("dltm_lastLat");
      localStorage.removeItem("dltm_lastFormat");
      localStorage.removeItem("dltm_lastPrecision");
      localStorage.removeItem("dltm_lastUtmZone");
      localStorage.removeItem("dltm_lastUtmE");
      localStorage.removeItem("dltm_lastUtmN");
      localStorage.removeItem("dltm_lastInputType");
      document.getElementById("inp-e").value = "";
      document.getElementById("inp-n").value = "";
      document.getElementById("inp-lon").value = "";
      document.getElementById("inp-lat").value = "";
      document.getElementById("inp-utm-zone").value = "";
      document.getElementById("inp-utm-e").value = "";
      document.getElementById("inp-utm-n").value = "";
      alert("Saved data cleared ✨");
    };

    // Switch input type for reverse conversion
    window.switchReverseInputType = function (type) {
      const wgs84Inputs = document.getElementById("wgs84-inputs");
      const utmInputs = document.getElementById("utm-inputs");

      if (type === "wgs84") {
        wgs84Inputs.style.display = "grid";
        utmInputs.style.display = "none";
      } else {
        wgs84Inputs.style.display = "none";
        utmInputs.style.display = "grid";
      }

      localStorage.setItem("dltm_lastInputType", type);
    };

    // Function to convert UTM to WGS84
    function convertUTMtoWGS84(zone, easting, northing) {
      try {
        const a = 6378137.0;
        const invF = 298.257223563;
        const f = 1 / invF;
        const b = a * (1 - f);
        const e2 = (a * a - b * b) / (a * a);
        const ep2 = (a * a - b * b) / (b * b);

        // Extract hemisphere from zone (e.g., "40N" -> hemisphere = "N")
        const hemMatch = zone.match(/([NSEW])$/i);
        const hemisphere = hemMatch ? hemMatch[1].toUpperCase() : "N";
        const zoneNum = parseInt(zone.match(/\d+/)[0]);

        const k0 = 0.9996;
        const lon0 = degToRad((zoneNum - 1) * 6 - 180 + 3);
        const lat0 = 0;
        const E0 = 500000;
        const N0 = hemisphere === "N" ? 0 : 10000000;

        const x = easting - E0;
        const y = northing - N0;

        const M = y / k0;
        const mu =
          M /
          (a * (1 - e2 / 4 - (3 * e2 * e2) / 64 - (5 * e2 * e2 * e2) / 256));

        const C1 =
          (3 * e2) / 8 + (3 * e2 * e2) / 32 + (45 * e2 * e2 * e2) / 1024;
        const C2 = (15 * e2 * e2) / 256 + (45 * e2 * e2 * e2) / 1024;
        const C3 = (35 * e2 * e2 * e2) / 3072;

        const p1 =
          mu -
          C1 * Math.sin(2 * mu) +
          C2 * Math.sin(4 * mu) -
          C3 * Math.sin(6 * mu);

        const p1sin = Math.sin(p1);
        const p1cos = Math.cos(p1);

        const N = a / Math.sqrt(1 - e2 * p1sin * p1sin);
        const T = Math.tan(p1) * Math.tan(p1);
        const C = ep2 * p1cos * p1cos;
        const R =
          (a * (1 - e2)) / Math.sqrt(Math.pow(1 - e2 * p1sin * p1sin, 3));
        const D = x / (N * k0);

        const lat =
          p1 -
          (Math.tan(p1) / R) *
            ((D * D) / 2 -
              ((D * D * D * D) / 24) *
                (5 + 3 * T + 10 * C - 4 * C * C - 9 * ep2) +
              ((D * D * D * D * D * D) / 720) *
                (61 + 90 * T + 28 * T * T + 45 * C - 252 * ep2 - 3 * C * C));

        const lon =
          (D -
            ((D * D * D) / 6) * (1 + 2 * T + C) +
            ((D * D * D * D * D) / 120) *
              (5 - 2 * C + 28 * T - 3 * C * C + 8 * ep2 + 24 * T * T)) /
            p1cos +
          lon0;

        return {
          success: true,
          latitude: radToDeg(lat),
          longitude: radToDeg(lon),
        };
      } catch (e) {
        return { success: false, error: e.message };
      }
    }

    // Function to convert UTM to DLTM
    function convertUTMtoDLTM(zone, easting, northing) {
      try {
        const wgs = convertUTMtoWGS84(zone, easting, northing);
        if (!wgs.success) return wgs;

        return convertWGS84toDLTM(wgs.latitude, wgs.longitude);
      } catch (e) {
        return { success: false, error: e.message };
      }
    }

    // Update save logic
    window.saveLastInputs = function () {
      const e = document.getElementById("inp-e").value;
      const n = document.getElementById("inp-n").value;
      const lon = document.getElementById("inp-lon").value;
      const lat = document.getElementById("inp-lat").value;
      const format = document.getElementById("out-format").value;
      const precision = document.getElementById("out-prec").value;
      const inputType =
        document.querySelector("input[name='rev-input-type']:checked")?.value ||
        "wgs84";
      const utmZone = document.getElementById("inp-utm-zone").value;
      const utmE = document.getElementById("inp-utm-e").value;
      const utmN = document.getElementById("inp-utm-n").value;

      localStorage.setItem("dltm_lastE", e);
      localStorage.setItem("dltm_lastN", n);
      localStorage.setItem("dltm_lastLon", lon);
      localStorage.setItem("dltm_lastLat", lat);
      localStorage.setItem("dltm_lastFormat", format);
      localStorage.setItem("dltm_lastPrecision", precision);
      localStorage.setItem("dltm_lastInputType", inputType);
      localStorage.setItem("dltm_lastUtmZone", utmZone);
      localStorage.setItem("dltm_lastUtmE", utmE);
      localStorage.setItem("dltm_lastUtmN", utmN);
    };

    // Update load logic
    window.loadLastInputs = function () {
      const e = localStorage.getItem("dltm_lastE");
      const n = localStorage.getItem("dltm_lastN");
      const lon = localStorage.getItem("dltm_lastLon");
      const lat = localStorage.getItem("dltm_lastLat");
      const format = localStorage.getItem("dltm_lastFormat") || "dms";
      const precision = localStorage.getItem("dltm_lastPrecision") || "8";
      const inputType = localStorage.getItem("dltm_lastInputType") || "wgs84";
      const utmZone = localStorage.getItem("dltm_lastUtmZone");
      const utmE = localStorage.getItem("dltm_lastUtmE");
      const utmN = localStorage.getItem("dltm_lastUtmN");

      if (e) document.getElementById("inp-e").value = e;
      if (n) document.getElementById("inp-n").value = n;
      if (lon) document.getElementById("inp-lon").value = lon;
      if (lat) document.getElementById("inp-lat").value = lat;
      if (utmZone) document.getElementById("inp-utm-zone").value = utmZone;
      if (utmE) document.getElementById("inp-utm-e").value = utmE;
      if (utmN) document.getElementById("inp-utm-n").value = utmN;

      document.getElementById("out-format").value = format;
      document.getElementById("out-prec").value = precision;

      // Switch reverse conversion input type
      document.querySelector(
        `input[name='rev-input-type'][value='${inputType}']`,
      ).checked = true;
      switchReverseInputType(inputType);
    };

    // Load saved inputs on page load
    loadLastInputs();

    // Test function for batch conversion
    window.testBatchConversion = function () {
      // Use data loaded from file or table
      if (!batchData || batchData.length === 0) {
        console.log("❌ No data loaded. Please upload a CSV file first.");
        return;
      }

      console.log("✓ Loaded data processing test:", batchData.length, "rows");
      console.table(batchData);

      return batchData;
    };
  })();



