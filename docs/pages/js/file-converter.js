  window.API_BASE = window.API_BASE ?? "https://worker.geotools.workers.dev";

  (function () {
    let map = null;
    let pointsLayer = null;
    let measureLayer = null;
    let lastBounds = null;
    let sdrResult = null;
    let currentInputIsSdr = false;
    let isMeasuring = false;
    let measurePoints = [];
    let measureLine = null;

    // SDR -> CSV state
    let loadedFileText = "";
    let csvFromSdr = "";
    const pointAnchorIcon = L.divIcon({
      className: "pt-anchor-marker",
      html: "",
      iconSize: [1, 1],
      iconAnchor: [0, 0],
    });

    const sdrNotice = document.getElementById("sdrNotice");
    const convertSdrBtn = document.getElementById("convertSdrBtn");
    const downloadCsvBtn = document.getElementById("downloadCsvBtn");
    const sdrPreviewWrap = document.getElementById("sdrPreviewWrap");
    const closePreviewBtn = document.getElementById("closePreviewBtn");
    const exportBtn = document.getElementById("exportBtn");
    let exportController = null;

    if (window.ConverterExport && typeof window.ConverterExport.createExporter === "function") {
      exportController = window.ConverterExport.createExporter({
        apiBase: window.API_BASE,
        getSourceText: function () {
          return loadedFileText;
        },
        getSourceIsSdr: function () {
          return currentInputIsSdr;
        },
        getCoordFormat: function () {
          return document.getElementById("coordFormat").value;
        },
        getBaseName: function () {
          const file = document.getElementById("csvFile").files[0];
          return file ? file.name : "points";
        },
        setStatus: setStatus,
        hideStatus: hideStatus,
        getReturnFocusEl: function () {
          return document.getElementById("exportBtn");
        },
        onSdrReady: function (sdr) {
          sdrResult = sdr;
        },
      });
    }

    document.getElementById("csvFile").addEventListener("change", function () {
      const f = this.files && this.files[0];
      document.getElementById("fileName").textContent = f
        ? f.name
        : "No file selected";
      sdrNotice.style.display = "none";
      downloadCsvBtn.style.display = "none";
      csvFromSdr = "";
      loadedFileText = "";
      sdrResult = null;
      currentInputIsSdr = false;
      if (exportController && typeof exportController.resetCache === "function") {
        exportController.resetCache();
      }
    });

    document
      .getElementById("converterForm")
      .addEventListener("submit", function (e) {
        e.preventDefault();
        run();
      });

    document.getElementById("fitBtn").addEventListener("click", zoomExtents);

    document
      .getElementById("measureBtn")
      .addEventListener("click", function () {
        isMeasuring = !isMeasuring;
        this.style.background = isMeasuring ? "var(--primary-light)" : "";
        this.style.borderColor = isMeasuring ? "var(--primary)" : "";
        if (!isMeasuring) {
          if (measureLayer) measureLayer.clearLayers();
          measurePoints = [];
        } else {
          setStatus("Click on the map to start measuring.", "ok");
        }
      });

    document
      .getElementById("previewBtn")
      .addEventListener("click", function () {
        const previewContent = currentInputIsSdr
          ? loadedFileText
          : sdrResult || (exportController && exportController.getCachedSdr());

        if (!previewContent) {
          setStatus(
            "No SDR preview available yet. Export SDR first from Export Points.",
            "error",
          );
          return;
        }

        const lines = previewContent.split("\n").slice(0, 20).join("\n");
        document.getElementById("sdrPreviewText").textContent = lines;
        sdrPreviewWrap.style.display = "block";
        sdrPreviewWrap.scrollIntoView({ behavior: "smooth" });
      });

    closePreviewBtn.addEventListener("click", function () {
      sdrPreviewWrap.style.display = "none";
    });

    document.getElementById("clearBtn").addEventListener("click", function () {
      if (pointsLayer) pointsLayer.clearLayers();
      if (measureLayer) measureLayer.clearLayers();
      lastBounds = null;
      document.getElementById("pointsCount").textContent = "0";
      sdrPreviewWrap.style.display = "none";
      setStatus("Map cleared.", "ok");
    });

    exportBtn.addEventListener("click", function () {
      if (!exportController) {
        setStatus("Export module failed to load. Please refresh and try again.", "error");
        return;
      }
      exportController.open();
    });

    convertSdrBtn.addEventListener("click", function () {
      const file = document.getElementById("csvFile").files[0];
      if (!file) {
        setStatus("Please select an SDR file first.", "error");
        return;
      }
      if (!loadedFileText) {
        const reader = new FileReader();
        reader.onload = function (e) {
          loadedFileText = String(e.target.result || "");
          doSdrToCsvConversion();
        };
        reader.readAsText(file);
      } else {
        doSdrToCsvConversion();
      }
    });

    function doSdrToCsvConversion() {
      try {
        csvFromSdr = convertSdrTextToCsv(loadedFileText);
        if (!csvFromSdr.trim()) {
          setStatus("No 08KI point lines found in this SDR.", "error");
          return;
        }
        downloadCsvBtn.style.display = "inline-block";
        setStatus("SDR converted to CSV successfully.", "ok");
      } catch (err) {
        setStatus("Conversion failed: " + err.message, "error");
      }
    }

    downloadCsvBtn.addEventListener("click", function () {
      if (!csvFromSdr) return;
      downloadText(csvFromSdr, "output.csv", "text/csv");
    });

    function setStatus(msg, type) {
      const div = document.getElementById("status-conv");
      div.className = "";
      div.style.display = "block";
      div.setAttribute("aria-hidden", "false");
      div.textContent = msg;
      if (type === "loading") div.classList.add("st-loading");
      else if (type === "error") div.classList.add("st-error");
      else div.classList.add("st-ok");
    }

    function hideStatus() {
      const div = document.getElementById("status-conv");
      div.style.display = "none";
      div.setAttribute("aria-hidden", "true");
    }

    function initMapIfNeeded() {
      if (map) return;
      map = L.map("map", {
        crs: L.CRS.Simple,
        minZoom: -10,
        zoomSnap: 0.25,
        zoomDelta: 0.25,
        attributionControl: false,
        zoomControl: true,
      });
      map.zoomControl.setPosition("topleft");
      pointsLayer = L.layerGroup().addTo(map);
      measureLayer = L.layerGroup().addTo(map);
      addZoomExtentsControl();

      map.on("click", function (e) {
        if (!isMeasuring) return;
        measurePoints.push(e.latlng);
        L.circleMarker(e.latlng, { radius: 3, color: "red" }).addTo(
          measureLayer,
        );

        if (measurePoints.length > 1) {
          const p1 = measurePoints[measurePoints.length - 2];
          const p2 = measurePoints[measurePoints.length - 1];
          const dist = Math.sqrt(
            Math.pow(p2.lat - p1.lat, 2) + Math.pow(p2.lng - p1.lng, 2),
          );

          L.polyline([p1, p2], {
            color: "red",
            weight: 2,
            dashArray: "5, 5",
          }).addTo(measureLayer);
          L.marker([(p1.lat + p2.lat) / 2, (p1.lng + p2.lng) / 2], {
            icon: L.divIcon({
              className: "measure-label",
              html: `<span style="background:white; border:1px solid red; padding:2px 4px; border-radius:4px; font-size:10px; color:red; font-weight:bold;">${dist.toFixed(2)}m</span>`,
              iconSize: [40, 20],
            }),
          }).addTo(measureLayer);
        }
      });
    }

    function zoomExtents() {
      if (!map || !lastBounds) return;
      map.fitBounds(lastBounds.pad(0.1));
    }

    function addZoomExtentsControl() {
      const ZoomExtControl = L.Control.extend({
        options: { position: "topleft" },
        onAdd: function () {
          const container = L.DomUtil.create(
            "div",
            "leaflet-control leaflet-bar",
          );
          const a = L.DomUtil.create("a", "", container);
          a.href = "#";
          a.title = "Zoom Extents";
          a.setAttribute("aria-label", "Zoom to extents");
          a.innerHTML = "Fit";
          a.style.display = "flex";
          a.style.alignItems = "center";
          a.style.justifyContent = "center";
          a.style.width = "36px";
          a.style.height = "36px";
          L.DomEvent.disableClickPropagation(container);
          L.DomEvent.on(a, "click", L.DomEvent.stop).on(
            a,
            "click",
            zoomExtents,
          );
          return container;
        },
      });
      map.addControl(new ZoomExtControl());
    }

    function run() {
      const file = document.getElementById("csvFile").files[0];
      if (!file) {
        setStatus("Please choose a file first.", "error");
        return;
      }
      const format = document.getElementById("coordFormat").value;
      setStatus("Reading file...", "loading");
      const reader = new FileReader();
      reader.onload = function (ev) {
        const content = String(ev.target.result || "");
        initMapIfNeeded();
        document.getElementById("mapWrap").style.display = "block";
        document.getElementById("mapTools").style.display = "flex";
        document.getElementById("metrics").style.display = "flex";
        document.getElementById("exportBtn").style.display = "block";

        loadedFileText = content;
        currentInputIsSdr = content.includes("08KI");
        sdrResult = null;
        if (exportController && typeof exportController.resetCache === "function") {
          exportController.resetCache();
        }

        if (currentInputIsSdr) {
          sdrResult = content;
          sdrNotice.style.display = "block";
          const pts = parseSdrToPoints(content);
          drawPoints(pts);
          hideStatus();
        } else {
          sdrNotice.style.display = "none";
          drawPointsFromCsv(normalizeLines(content), format);
          setStatus("Map loaded. Use Export Points to download required formats.", "ok");
        }
        setTimeout(() => map.invalidateSize(), 100);
      };
      reader.readAsText(file);
    }

    function normalizeLines(text) {
      return (text || "")
        .replace(/\r\n/g, "\n")
        .replace(/\r/g, "\n")
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);
    }

    function drawPointsFromCsv(csvLines, format) {
      pointsLayer.clearLayers();
      lastBounds = null;
      let minE = Infinity,
        minN = Infinity,
        maxE = -Infinity,
        maxN = -Infinity,
        plotted = 0;
      const delim = detectDelimiter(csvLines[0] || "");
      const startIndex = looksLikeHeader(csvLines[0] || "") ? 1 : 0;

      for (let i = startIndex; i < csvLines.length; i++) {
        const cols = splitDelimitedLine(csvLines[i], delim);
        const P = (cols[0] ?? "").trim();
        // Fixed: Handle column order correctly
        // For format 'ENZ': cols[0]=ID, cols[1]=E, cols[2]=N
        // For format 'NEZ': cols[0]=ID, cols[1]=N, cols[2]=E
        let E = format === "NEZ" ? cols[2] : cols[1];
        let N = format === "NEZ" ? cols[1] : cols[2];
        const n = parseFloat(N),
          e = parseFloat(E);
        if (!isFinite(n) || !isFinite(e)) continue;

        minE = Math.min(minE, e);
        maxE = Math.max(maxE, e);
        minN = Math.min(minN, n);
        maxN = Math.max(maxN, n);

        const marker = L.marker([n, e], { icon: pointAnchorIcon }).addTo(
          pointsLayer,
        );
        if (P) {
          marker.bindTooltip(buildPointTooltip(P), {
            permanent: true,
            direction: "top",
            offset: [0, -6],
            className: "pt-label",
            opacity: 1,
          });
        }
        plotted++;
      }
      document.getElementById("pointsCount").textContent = plotted;
      if (plotted > 0) {
        lastBounds = L.latLngBounds([minN, minE], [maxN, maxE]);
        map.fitBounds(lastBounds.pad(0.1));
      }
    }

    function looksLikeHeader(line) {
      return /point|pnt|name|id|north|east|level|code/i.test(line);
    }
    function detectDelimiter(line) {
      const counts = { ",": 0, ";": 0, "\t": 0 };
      for (let char of line) if (counts.hasOwnProperty(char)) counts[char]++;
      return Object.keys(counts).reduce((a, b) =>
        counts[a] > counts[b] ? a : b,
      );
    }
    function splitDelimitedLine(line, delim) {
      const res = [];
      let cur = "",
        inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') inQuotes = !inQuotes;
        else if (!inQuotes && ch === delim) {
          res.push(cur);
          cur = "";
        } else cur += ch;
      }
      res.push(cur);
      return res;
    }

    function buildPointTooltip(pointName) {
      return (
        '<div class="pt-label-wrap"><div class="pt-label-num">' +
        escapeHtml(pointName) +
        '</div><span class="pt-pin" aria-hidden="true"></span></div>'
      );
    }

    function parseSdrToPoints(sdrText) {
      const lines = sdrText.replace(/\r/g, "").split("\n");
      const pts = [];
      for (const line of lines) {
        if (!line.startsWith("08KI")) continue;
        const p = line.slice(4, 20).trim(),
          nS = line.slice(20, 36).trim(),
          eS = line.slice(36, 52).trim();
        const n = parseFloatSmart(nS),
          e = parseFloatSmart(eS);
        if (isFinite(n) && isFinite(e)) pts.push({ p, n, e });
      }
      return pts;
    }

    function drawPoints(points) {
      pointsLayer.clearLayers();
      lastBounds = null;
      let minE = Infinity,
        minN = Infinity,
        maxE = -Infinity,
        maxN = -Infinity;
      for (const pt of points) {
        minE = Math.min(minE, pt.e);
        maxE = Math.max(maxE, pt.e);
        minN = Math.min(minN, pt.n);
        maxN = Math.max(maxN, pt.n);
        const marker = L.marker([pt.n, pt.e], { icon: pointAnchorIcon }).addTo(
          pointsLayer,
        );
        if (pt.p)
          marker.bindTooltip(buildPointTooltip(pt.p), {
            permanent: true,
            direction: "top",
            offset: [0, -6],
            className: "pt-label",
          });
      }
      document.getElementById("pointsCount").textContent = points.length;
      if (points.length) {
        lastBounds = L.latLngBounds([minN, minE], [maxN, maxE]);
        map.fitBounds(lastBounds.pad(0.1));
      }
    }

    function convertSdrTextToCsv(sdrText) {
      const lines = sdrText.replace(/\r/g, "").split("\n");
      const out = ["P,N,E,Z,Code"];
      for (const line of lines) {
        if (!line.startsWith("08KI")) continue;
        out.push(
          [
            line.slice(4, 20).trim(),
            line.slice(20, 36).trim(),
            line.slice(36, 52).trim(),
            line.slice(52, 68).trim(),
            line.slice(68, 84).trim(),
          ].join(","),
        );
      }
      return out.join("\n") + "\n";
    }

    function parseFloatSmart(v) {
      let s = String(v).replace(/\s+/g, "");
      return s.includes(",") ? parseFloat(s.replace(/,/g, ".")) : parseFloat(s);
    }
    function escapeHtml(str) {
      return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
    }
    function downloadText(c, f, m) {
      const b = new Blob([c], { type: m });
      const u = URL.createObjectURL(b);
      const a = document.createElement("a");
      a.href = u;
      a.download = f;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(u);
    }
  })();
