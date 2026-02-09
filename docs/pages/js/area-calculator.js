      (function () {
        // --- Hard stop if Leaflet not loaded ---
        if (typeof L === "undefined") {
          const el = document.getElementById("message");
          el.className = "msg err";
          el.style.display = "block";
          el.textContent =
            "Leaflet لم يتم تحميله. تأكد أن الملف pages/area-calculator.html داخل مجلد docs وأن المسار docs/vendor/leaflet/leaflet.js موجود.";
          return;
        }

        // --- UI elements ---
        const elInput = document.getElementById("coordsInput");
        const elMsg = document.getElementById("message");
        const elResults = document.getElementById("areaResults");

        const btnDraw = document.getElementById("btnDraw");
        const btnImport = document.getElementById("btnImport");
        const btnClear = document.getElementById("btnClear");
        const fileInput = document.getElementById("fileInput");

        function showMsg(text, kind) {
          elMsg.style.display = "block";
          elMsg.className = "msg" + (kind ? " " + kind : "");
          elMsg.textContent = text;
        }
        function hideMsg() {
          elMsg.style.display = "none";
          elMsg.textContent = "";
        }
        function fmt(num, maxFrac) {
          const n = Number(num);
          const fixed = n.toFixed(maxFrac ?? 3);
          return parseFloat(fixed).toString();
        }

        // --- Robust parsing (supports: N,E | N E | id,N,E | id N E | extra cols -> last two) ---
        function extractNumbers(line) {
          const cleaned = (line || "").trim();
          if (!cleaned) return [];

          const tokens = cleaned
            .replace(/;/g, ",")
            .replace(/\t/g, " ")
            .split(/[, ]+/)
            .filter(Boolean);

          const nums = [];
          for (const raw of tokens) {
            let t = raw.trim();
            if (!/[0-9]/.test(t)) continue;

            // allow decimal comma in isolated token, convert to dot
            if (t.includes(",") && !t.includes(".")) {
              const c = (t.match(/,/g) || []).length;
              if (c === 1) t = t.replace(",", ".");
            }

            t = t.replace(/[^\d.+-]/g, "");
            const v = Number.parseFloat(t);
            if (Number.isFinite(v)) nums.push(v);
          }
          return nums;
        }

        function parsePoints(text) {
          const lines = String(text || "").split(/\r?\n/);
          const pts = [];
          const bad = [];
          let lastId = null;

          for (let i = 0; i < lines.length; i++) {
            const nums = extractNumbers(lines[i]);
            if (nums.length === 0) continue;

            let N,
              E,
              id = null;
            if (nums.length === 2) {
              [N, E] = nums;
            } else if (nums.length >= 3) {
              // يوجد عمود ID في البداية => id, N, E
              id = nums[0];
              N = nums[nums.length - 2];
              E = nums[nums.length - 1];
            } else {
              bad.push(i + 1);
              continue;
            }

            if (!Number.isFinite(N) || !Number.isFinite(E)) {
              bad.push(i + 1);
              continue;
            }
            pts.push({ N, E, id });
            lastId = id;
          }

          return { pts, badLines: bad };
        }

        function pointsEqual(a, b, tolerance = 1e-9) {
          return (
            Math.abs(a.N - b.N) < tolerance && Math.abs(a.E - b.E) < tolerance
          );
        }

        function normalizeClosedDuplicate(pts) {
          if (pts.length >= 2 && pointsEqual(pts[0], pts[pts.length - 1])) {
            return pts.slice(0, -1);
          }
          return pts;
        }

        // --- Math (Shoelace with x=E, y=N) ---
        function computeAreaPerimeter(pts) {
          const n = pts.length;
          if (n < 2) return { area: 0, perimeter: 0 };

          let sum = 0;
          let per = 0;

          for (let i = 0; i < n; i++) {
            const a = pts[i];
            const b = pts[(i + 1) % n];

            // perimeter always computed for closed loop intent
            per += Math.hypot(b.E - a.E, b.N - a.N);

            if (n >= 3) {
              sum += a.E * b.N - b.E * a.N;
            }
          }

          const area = n >= 3 ? Math.abs(sum) / 2 : 0;
          return { area, perimeter: per };
        }

        // --- Leaflet map (planar / CRS.Simple) ---
        let map = null;

        function initializeMap() {
          if (map) return;

          const mapEl = document.getElementById("map");
          if (!mapEl) return;

          // تنظيف أي معرفات قديمة
          if (mapEl._leaflet_id) {
            try {
              delete mapEl._leaflet_id;
            } catch {}
          }

          map = L.map("map", {
            crs: L.CRS.Simple,
            minZoom: -10,
            zoomSnap: 0.25,
            zoomDelta: 0.25,
            attributionControl: false,
            zoomControl: true,
          });

          // إعادة حساب الحجم
          setTimeout(() => {
            try {
              map.invalidateSize(true);
            } catch (e) {
              console.log("Error sizing map:", e);
            }
          }, 50);

          // مستمع resize
          if (!window._service2MapResizeListener) {
            window._service2MapResizeListener = true;
            window.addEventListener("resize", () => {
              if (map) {
                try {
                  map.invalidateSize(false);
                } catch (e) {
                  console.log("Error on resize:", e);
                }
              }
            });
          }
        }

        initializeMap();
        const fixMapSize = () => {
          if (map) {
            try {
              map.invalidateSize(true);
            } catch (e) {}
          }
        };
        setTimeout(fixMapSize, 0);
        setTimeout(fixMapSize, 250);
        window.addEventListener("resize", fixMapSize);

        // force Leaflet to compute sizes after layout
        setTimeout(() => map.invalidateSize(), 0);
        window.addEventListener("resize", () => map.invalidateSize());

        // Update card sizes to fit polygon interior in pixel space
        function updateCardSizes() {
          try {
            popupLayers.forEach((obj) => {
              const marker = obj.marker;
              const pts = obj.pts;
              const el = marker && marker.getElement && marker.getElement();
              if (!el) return;
              const inner = el.firstElementChild || el;
              // compute pixel bounding box of polygon points
              const ptsPx = pts.map((p) => map.latLngToLayerPoint([p.N, p.E]));
              const xs = ptsPx.map((p) => p.x);
              const ys = ptsPx.map((p) => p.y);
              const w = Math.max(
                40,
                Math.abs(Math.max(...xs) - Math.min(...xs)),
              );
              const h = Math.max(
                24,
                Math.abs(Math.max(...ys) - Math.min(...ys)),
              );
              inner.style.width = w + "px";
              inner.style.height = h + "px";
              inner.style.overflow = "hidden";
              inner.style.display = "flex";
              inner.style.alignItems = "center";
              inner.style.justifyContent = "center";
              // keep marker centered
              el.style.transform = "translate(-50%,-50%)";
            });
          } catch (e) {
            /*ignore*/
          }
        }
        map.on("zoomend", updateCardSizes);
        map.on("moveend", updateCardSizes);

        // Layers
        let gridLayer = null;
        let pointsLayer = null;
        let lineLayer = null;
        let polyLayer = null;
        let popupLayers = [];

        function clearDraw() {
          if (pointsLayer) {
            map.removeLayer(pointsLayer);
            pointsLayer = null;
          }
          if (lineLayer) {
            map.removeLayer(lineLayer);
            lineLayer = null;
          }
          if (polyLayer) {
            map.removeLayer(polyLayer);
            polyLayer = null;
          }
          // remove popups added for polygon cards
          if (popupLayers && popupLayers.length) {
            popupLayers.forEach((obj) => {
              try {
                if (obj && obj.marker) map.removeLayer(obj.marker);
              } catch (e) {}
            });
            popupLayers = [];
          }
          // remove any side polygon details element
          const existingDetails = document.getElementById("polygon-details");
          if (existingDetails && existingDetails.parentNode) {
            existingDetails.parentNode.removeChild(existingDetails);
          }
        }

        function buildGrid(bounds, step) {
          const yMin = bounds.getSouth(),
            yMax = bounds.getNorth();
          const xMin = bounds.getWest(),
            xMax = bounds.getEast();

          const lines = [];
          for (let x = Math.floor(xMin / step) * step; x <= xMax; x += step) {
            lines.push([
              [yMin, x],
              [yMax, x],
            ]);
          }
          for (let y = Math.floor(yMin / step) * step; y <= yMax; y += step) {
            lines.push([
              [y, xMin],
              [y, xMax],
            ]);
          }

          return L.polyline(lines, { weight: 1, opacity: 0.35 }); // كانت 0.25
        }

        function setGridToBounds(bounds) {
          if (gridLayer) {
            map.removeLayer(gridLayer);
            gridLayer = null;
          }

          const width = Math.abs(bounds.getEast() - bounds.getWest());
          const height = Math.abs(bounds.getNorth() - bounds.getSouth());
          const span = Math.max(width, height);

          let step = 100;
          if (span > 50000) step = 5000;
          else if (span > 10000) step = 1000;
          else if (span > 2000) step = 200;
          else if (span > 500) step = 50;
          else if (span > 100) step = 10;

          gridLayer = buildGrid(bounds, step).addTo(map);
        }

        // initial neutral view + grid
        const initBounds = L.latLngBounds([
          [0, 0],
          [1000, 1000],
        ]);
        map.fitBounds(initBounds);
        setGridToBounds(initBounds);

        function toLatLngs(pts) {
          // CRS.Simple expects [y, x] -> [N, E]
          return pts.map((p) => [p.N, p.E]);
        }

        function computePolygonCentroid(pts) {
          // Area-weighted centroid (uses shoelace formula)
          // pts: array of {N, E} where N=lat(Y), E=lng(X)
          let A = 0,
            Cx = 0,
            Cy = 0;
          const n = pts.length;
          for (let i = 0; i < n; i++) {
            const a = pts[i];
            const b = pts[(i + 1) % n];
            const x0 = a.E,
              y0 = a.N;
            const x1 = b.E,
              y1 = b.N;
            const cross = x0 * y1 - x1 * y0;
            A += cross;
            Cx += (x0 + x1) * cross;
            Cy += (y0 + y1) * cross;
          }
          A = A / 2;
          if (Math.abs(A) < 1e-9) {
            // fallback to simple average
            let sx = 0,
              sy = 0;
            for (const p of pts) {
              sx += p.E;
              sy += p.N;
            }
            return { N: sy / n, E: sx / n };
          }
          Cx = Cx / (6 * A);
          Cy = Cy / (6 * A);
          return { N: Cy, E: Cx };
        }

        function render(ptsInput) {
          hideMsg();
          clearDraw();

          // تقسيم النقاط إلى مضلعات متعددة
          const polygons = splitPolygonsAtClosingPoint(ptsInput);

          if (polygons.length === 0 || ptsInput.length < 2) {
            elResults.style.display = "none";
            showMsg("Enter at least 2 points to draw.", "warn");
            return;
          }

          // عرض كل مضلع بلون مختلف
          const colors = [
            "#FF6B6B",
            "#4ECDC4",
            "#45B7D1",
            "#FFA07A",
            "#98D8C8",
          ];
          pointsLayer = L.layerGroup();
          let allBounds = null;
          let totalArea = 0;
          let totalPerimeter = 0;

          polygons.forEach((polyPts, polyIdx) => {
            if (polyPts.length < 2) return;

            const latlngs = toLatLngs(polyPts);
            const color = colors[polyIdx % colors.length];

            // الماركرات
            latlngs.forEach((ll, idx) => {
              const m = L.circleMarker(ll, {
                radius: 6,
                weight: 2,
                fillOpacity: 0.85,
                color: color,
              });
              m.bindTooltip(
                `P${idx + 1}<br/>N=${fmt(polyPts[idx].N, 3)}<br/>E=${fmt(polyPts[idx].E, 3)}`,
                { sticky: true },
              );
              m.addTo(pointsLayer);
            });

            // الخط المغلق
            const closed = latlngs.slice();
            closed.push(latlngs[0]);
            L.polyline(closed, {
              weight: 3,
              opacity: 0.95,
              color: color,
            }).addTo(pointsLayer);

            // المضلع (مساحة)
            if (polyPts.length >= 3) {
              L.polygon(latlngs, {
                weight: 2,
                fillOpacity: 0.2,
                color: color,
              }).addTo(pointsLayer);
            }

            // حساب الإحصائيات
            const stats = computeAreaPerimeter(polyPts);
            totalArea += stats.area;
            totalPerimeter += stats.perimeter;

            // حساب مركز المضلع لعرض البطاقة
            const centroid = computePolygonCentroid(polyPts);

            // إنشاء بطاقة HTML
            const cardHTML = `
        <div style="
          background: ${color}dd;
          border: 2px solid ${color};
          border-radius: 8px;
          padding: 10px;
          min-width: 150px;
          font-size: 12px;
          color: white;
          font-weight: bold;
          box-shadow: 0 2px 8px rgba(0,0,0,0.2);
          text-align: center;
          font-family: monospace;
        ">
          <div style="font-size: 13px; margin-bottom: 6px; text-decoration: underline;">Polygon ${polyIdx + 1}</div>
          <div style="font-size: 11px; margin: 3px 0;">Points: ${polyPts.length}</div>
          <div style="font-size: 11px; margin: 3px 0;">Area: ${fmt(stats.area, 2)} m²</div>
          <div style="font-size: 11px; margin: 3px 0;">Perimeter: ${fmt(stats.perimeter, 2)} m</div>
        </div>
      `;

            // إضافة البطاقة على الخريطة كـ marker مع divIcon (ثابتة الحجم، لا تتغير مع الزووم)
            const icon = L.divIcon({
              className: "polygon-card",
              html: cardHTML,
              iconSize: null,
            });
            const marker = L.marker([centroid.N, centroid.E], {
              icon,
              interactive: false,
            }).addTo(map);
            // track marker with associated polygon points so we can size it later
            popupLayers.push({ marker: marker, pts: polyPts });

            // تحديث الحدود
            if (!allBounds) allBounds = L.latLngBounds(latlngs);
            else allBounds.extend(latlngs);
          });

          pointsLayer.addTo(map);

          // عرض النتائج
          if (allBounds) {
            map.fitBounds(allBounds.pad(0.2));
            setGridToBounds(allBounds.pad(0.2));
          }

          // إظهار الإجمالي والتفاصيل
          document.getElementById("res-count").innerText = String(
            ptsInput.length,
          );
          document.getElementById("res-area").innerText = fmt(totalArea, 3);
          document.getElementById("res-perimeter").innerText = fmt(
            totalPerimeter,
            3,
          );

          elResults.style.display = "grid";

          if (polygons.length > 1) {
            showMsg(
              `Detected ${polygons.length} polygons. Area and perimeter calculated for each.`,
              "",
            );
          } else if (ptsInput.length < 3) {
            showMsg(
              "Drawing complete. Area calculation requires at least 3 points.",
              "warn",
            );
          } else {
            showMsg("Drawing and calculation completed successfully.", "");
          }
        }

        // دالة جديدة: تقسيم النقاط إلى مضلعات متعددة
        function splitPolygonsAtClosingPoint(pts) {
          const method =
            document.getElementById("splitMethod")?.value || "auto";

          // If many points include an ID field, prefer ID splitting automatically
          const idCount = pts.reduce(
            (c, p) => c + (p && p.id !== undefined ? 1 : 0),
            0,
          );
          const idRatio = pts.length ? idCount / pts.length : 0;

          if (method === "duplicates") {
            return splitByDuplicates(pts);
          } else if (method === "gaps") {
            return splitByGaps(pts);
          } else if (method === "id") {
            return splitByIdReset(pts);
          } else {
            // auto: if many rows contain an ID, use ID-based splitting first
            if (idRatio > 0.3) {
              const idResult = splitByIdReset(pts);
              if (idResult.length > 1) return idResult;
            }
            // fallback to auto heuristic
            return splitByAuto(pts);
          }
        }

        function splitByDuplicates(pts) {
          const polygons = [];
          let currentPolygon = [];

          for (let i = 0; i < pts.length; i++) {
            const currentPt = pts[i];

            if (currentPolygon.length === 0) {
              currentPolygon.push(currentPt);
            } else {
              const firstPt = currentPolygon[0];

              // البحث عن نقطة متطابقة مع البداية
              if (
                pointsEqual(currentPt, firstPt, 0.01) &&
                currentPolygon.length > 2
              ) {
                // حفظ المضلع بدون النقطة الأخيرة (المكررة)
                polygons.push(currentPolygon);
                currentPolygon = [currentPt];
              } else {
                currentPolygon.push(currentPt);
              }
            }
          }

          if (currentPolygon.length >= 2) {
            polygons.push(currentPolygon);
          }

          return polygons.length > 0 ? polygons : [pts];
        }

        function splitByGaps(pts) {
          const polygons = [];
          let currentPolygon = [];
          const gapThreshold = 1000; // متر

          for (let i = 0; i < pts.length; i++) {
            const currentPt = pts[i];

            if (currentPolygon.length === 0) {
              currentPolygon.push(currentPt);
            } else {
              const prevPt = currentPolygon[currentPolygon.length - 1];
              const distN = Math.abs(currentPt.N - prevPt.N);
              const distE = Math.abs(currentPt.E - prevPt.E);
              const distance = Math.sqrt(distN * distN + distE * distE);

              // إذا كانت الفجوة كبيرة جداً
              if (distance > gapThreshold && currentPolygon.length >= 2) {
                polygons.push(currentPolygon);
                currentPolygon = [currentPt];
              } else {
                currentPolygon.push(currentPt);
              }
            }
          }

          if (currentPolygon.length >= 2) {
            polygons.push(currentPolygon);
          }

          return polygons.length > 0 ? polygons : [pts];
        }

        function splitByAuto(pts) {
          const polygons = [];
          let currentPolygon = [];
          const gapThreshold = 1000; // متر

          for (let i = 0; i < pts.length; i++) {
            const currentPt = pts[i];

            if (currentPolygon.length === 0) {
              currentPolygon.push(currentPt);
            } else {
              const firstPt = currentPolygon[0];
              const prevPt = currentPolygon[currentPolygon.length - 1];

              // الحالة 1: نقطة متطابقة مع البداية
              const isDuplicate =
                pointsEqual(currentPt, firstPt, 0.01) &&
                currentPolygon.length > 2;

              // الحالة 2: فجوة كبيرة
              const distN = Math.abs(currentPt.N - prevPt.N);
              const distE = Math.abs(currentPt.E - prevPt.E);
              const distance = Math.sqrt(distN * distN + distE * distE);
              const hasGap =
                distance > gapThreshold && currentPolygon.length >= 2;

              if (isDuplicate || hasGap) {
                polygons.push(currentPolygon);
                currentPolygon = [currentPt];
              } else {
                currentPolygon.push(currentPt);
              }
            }
          }

          if (currentPolygon.length >= 2) {
            polygons.push(currentPolygon);
          }

          return polygons.length > 0 ? polygons : [pts];
        }

        function splitByIdReset(pts) {
          // الفصل حسب عمود ID: عندما ينخفض ID من قيمة أعلى للقيمة 1، يكون هناك مضلع جديد
          const polygons = [];
          let currentPolygon = [];

          for (let i = 0; i < pts.length; i++) {
            const currentPt = pts[i];

            if (currentPolygon.length === 0) {
              currentPolygon.push(currentPt);
            } else {
              const prevPt = currentPolygon[currentPolygon.length - 1];

              // التحقق من انخفاض ID (إشارة لبداية مضلع جديد)
              const prevId = prevPt.id !== undefined ? prevPt.id : 1;
              const currId = currentPt.id !== undefined ? currentPt.id : 1;

              // إذا كان ID أقل من السابق بكثير أو انخفض للـ 1 أو 2، فهو مضلع جديد
              if (currId < prevId * 0.5 || (currId <= 2 && prevId > 5)) {
                polygons.push(currentPolygon);
                currentPolygon = [currentPt];
              } else {
                currentPolygon.push(currentPt);
              }
            }
          }

          if (currentPolygon.length >= 2) {
            polygons.push(currentPolygon);
          }

          return polygons.length > 0 ? polygons : [pts];
        }

        function importFromFile(file) {
          const reader = new FileReader();
          reader.onload = () => {
            const content = String(reader.result || "");
            const { pts, badLines } = parsePoints(content);

            if (!pts.length) {
              showMsg("No valid points found in file.", "err");
              return;
            }
            if (badLines.length) {
              showMsg(
                `Imported with ignored unreadable lines: ${badLines.join(", ")}.`,
                "warn",
              );
            } else {
              showMsg("Points imported successfully.", "");
            }

            // Preserve original content so any ID column remains available for splitting
            elInput.value = content.trim() + "\n";
          };
          reader.onerror = () => showMsg("Failed to read file.", "err");
          reader.readAsText(file);
        }

        // --- Events ---
        btnDraw.addEventListener("click", () => {
          const { pts, badLines } = parsePoints(elInput.value);
          if (badLines.length) {
            showMsg(
              `Unreadable lines: ${badLines.join(", ")}. Each line must contain N and E.`,
              "err",
            );
            return;
          }
          if (!pts.length) {
            showMsg("Enter points first.", "warn");
            return;
          }
          render(pts);
        });

        btnImport.addEventListener("click", () => {
          fileInput.value = "";
          fileInput.click();
        });

        fileInput.addEventListener("change", (e) => {
          const f = e.target.files && e.target.files[0];
          if (f) importFromFile(f);
        });

        btnClear.addEventListener("click", () => {
          elInput.value = "";
          elResults.style.display = "none";
          clearDraw();
          hideMsg();
          showMsg("Input and drawing cleared.", "");
        });

        showMsg('Ready. Enter your points then click "Draw & Calculate".', "");
      })();
    
