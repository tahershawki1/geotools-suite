// Ellipsoidal → Orthometric Height Converter
// Formula: H = h - N  (orthometric = ellipsoidal - geoid undulation)
(function () {
  "use strict";

  // ---- Geoid undulation presets (approximate regional N values in metres) ----
  const GEOID_PRESETS = [
    { label: "Custom (manual entry)", value: null },
    { label: "Dubai / UAE (EGM96 ≈ +17.5 m)", value: 17.5 },
    { label: "Saudi Arabia – Riyadh (EGM96 ≈ +15.0 m)", value: 15.0 },
    { label: "Egypt – Cairo (EGM96 ≈ +21.0 m)", value: 21.0 },
    { label: "Jordan – Amman (EGM96 ≈ +16.0 m)", value: 16.0 },
    { label: "Iraq – Baghdad (EGM96 ≈ +13.5 m)", value: 13.5 },
    { label: "Kuwait (EGM96 ≈ +11.0 m)", value: 11.0 },
    { label: "Oman – Muscat (EGM96 ≈ +20.0 m)", value: 20.0 },
    { label: "Turkey – Istanbul (EGM96 ≈ +35.0 m)", value: 35.0 },
    { label: "Central Europe (EGM96 ≈ +46.0 m)", value: 46.0 },
  ];

  // ---- Tab switching ----
  window.switchHcTab = function (el, id) {
    document.querySelectorAll(".hc-tab").forEach((t) => t.classList.remove("active"));
    document.querySelectorAll(".tool-section").forEach((s) => s.classList.remove("active"));
    el.classList.add("active");
    const section = document.getElementById("section-hc-" + id);
    if (section) section.classList.add("active");
  };

  // ---- Populate geoid preset dropdowns ----
  function buildPresets(selectEl, onChangeCallback) {
    selectEl.innerHTML = "";
    GEOID_PRESETS.forEach(function (p) {
      const opt = document.createElement("option");
      opt.value = p.value === null ? "" : String(p.value);
      opt.textContent = p.label;
      selectEl.appendChild(opt);
    });
    selectEl.addEventListener("change", function () {
      onChangeCallback(this.value);
    });
  }

  // ---- Single conversion ----
  function initSingle() {
    const presetSel = document.getElementById("hc-preset-single");
    const nInput = document.getElementById("hc-n-single");

    buildPresets(presetSel, function (val) {
      if (val !== "") {
        nInput.value = val;
        nInput.readOnly = true;
      } else {
        nInput.value = "";
        nInput.readOnly = false;
        nInput.focus();
      }
    });
  }

  window.runSingleHc = function () {
    const h = parseFloat(document.getElementById("hc-h-single").value);
    const N = parseFloat(document.getElementById("hc-n-single").value);

    const resBox = document.getElementById("res-box-hc-single");

    if (!Number.isFinite(h)) {
      alert("Please enter a valid ellipsoidal height (h).");
      return;
    }
    if (!Number.isFinite(N)) {
      alert("Please enter a valid geoid undulation (N). Select a region preset or enter manually.");
      return;
    }

    const H = h - N;

    document.getElementById("hc-res-h").textContent = h.toFixed(3) + " m";
    document.getElementById("hc-res-n").textContent = N.toFixed(3) + " m";
    document.getElementById("hc-res-H").textContent = H.toFixed(3) + " m";
    document.getElementById("hc-res-note").textContent =
      "H = h − N = " + h.toFixed(3) + " − " + N.toFixed(3) + " = " + H.toFixed(3) + " m";

    resBox.style.display = "block";
  };

  window.copySingleHcResult = function () {
    const H = document.getElementById("hc-res-H").textContent;
    if (!H || H === "-") return;
    navigator.clipboard.writeText(H).then(function () {
      alert("Orthometric height copied: " + H);
    });
  };

  // ---- Batch conversion ----
  function initBatch() {
    const presetSel = document.getElementById("hc-preset-batch");
    const nInput = document.getElementById("hc-n-batch");

    buildPresets(presetSel, function (val) {
      if (val !== "") {
        nInput.value = val;
        nInput.readOnly = true;
      } else {
        nInput.value = "";
        nInput.readOnly = false;
        nInput.focus();
      }
    });
  }

  function parseBatchRows(text) {
    return text
      .split(/\r?\n/)
      .map(function (line) { return line.trim(); })
      .filter(function (line) { return line.length > 0 && !line.startsWith("#"); })
      .map(function (line, idx) {
        const parts = line.split(/[,\t;]+/);
        const id = parts.length >= 4 ? parts[0].trim() : String(idx + 1);
        const offsetH = parts.length >= 4 ? 1 : 0;
        const h = parseFloat(parts[offsetH]);
        const code = parts.length > offsetH + 1 ? (parts[offsetH + 1] || "").trim() : "";
        return { id: id, h: h, code: code, raw: line };
      });
  }

  function runBatch(N) {
    const textarea = document.getElementById("hc-batch-paste");
    const rows = parseBatchRows(textarea.value);
    if (!rows.length) {
      alert("No data found. Paste rows in the format: ID,h or just h (one per line).");
      return;
    }

    const tbody = document.querySelector("#hcBatchTable tbody");
    tbody.innerHTML = "";
    let valid = 0;
    rows.forEach(function (row) {
      const tr = document.createElement("tr");
      if (!Number.isFinite(row.h)) {
        tr.innerHTML =
          "<td>" + escHtml(row.id) + "</td><td>" + escHtml(row.raw) + "</td><td colspan='3' style='color:var(--error,#e55)'>Invalid row</td>";
      } else {
        const H = row.h - N;
        valid++;
        tr.innerHTML =
          "<td>" + escHtml(row.id) + "</td>" +
          "<td>" + row.h.toFixed(3) + "</td>" +
          "<td>" + N.toFixed(3) + "</td>" +
          "<td><strong>" + H.toFixed(3) + "</strong></td>" +
          "<td>" + escHtml(row.code) + "</td>";
      }
      tbody.appendChild(tr);
    });

    document.getElementById("hcBatchCount").textContent = valid + " / " + rows.length + " rows converted";
    document.getElementById("hcBatchResultsWrap").classList.add("visible");

    // Store for download
    window._hcBatchRows = rows.map(function (r) {
      return Number.isFinite(r.h) ? { id: r.id, h: r.h, N: N, H: r.h - N, code: r.code } : null;
    }).filter(Boolean);
  }

  window.runBatchHc = function () {
    const N = parseFloat(document.getElementById("hc-n-batch").value);
    if (!Number.isFinite(N)) {
      alert("Please enter a valid geoid undulation (N). Select a region preset or enter manually.");
      return;
    }
    runBatch(N);
  };

  window.handleBatchFileHc = function (input) {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function (e) {
      document.getElementById("hc-batch-paste").value = e.target.result;
    };
    reader.readAsText(file);
  };

  window.downloadBatchHc = function () {
    const rows = window._hcBatchRows;
    if (!rows || !rows.length) { alert("No results to download."); return; }
    const header = "ID,h_ellipsoidal_m,N_geoid_m,H_orthometric_m,Code\n";
    const csv = header + rows.map(function (r) {
      return [r.id, r.h.toFixed(3), r.N.toFixed(3), r.H.toFixed(3), r.code].join(",");
    }).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "orthometric_heights.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  function escHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  // ---- Init on DOM ready ----
  document.addEventListener("DOMContentLoaded", function () {
    initSingle();
    initBatch();
  });
})();
