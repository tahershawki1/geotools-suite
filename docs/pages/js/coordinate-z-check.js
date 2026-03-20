(function () {
  const SCRIPT_URL = document.currentScript?.src || window.location.href;
  const GRID_URL = new URL("../../Geoids/Global/EGM2008/EGM2008.grd", SCRIPT_URL).href;
  const PDF_MODULE_URL = new URL("../../vendor/pdf.mjs", SCRIPT_URL).href;
  const PDF_WORKER_URL = new URL("../../vendor/pdf.worker.mjs", SCRIPT_URL).href;
  const MODEL_NAME = "EGM2008";
  const COORDINATE_MATCH_DECIMALS = 3;
  const COORDINATE_MATCH_TOLERANCE = 0.05;
  const PDF_LINE_TOLERANCE = 2;

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
  const state = {
    beforeDataset: null,
    afterDataset: null,
    lastCopiedText: "",
  };

  let pdfLibPromise = null;

  const dom = {
    beforeFile: document.getElementById("zcompare-before-file"),
    afterFile: document.getElementById("zcompare-after-file"),
    beforeText: document.getElementById("zcompare-before-text"),
    afterText: document.getElementById("zcompare-after-text"),
    beforeSummary: document.getElementById("zcompare-before-summary"),
    afterSummary: document.getElementById("zcompare-after-summary"),
    status: document.getElementById("zcompare-status"),
    flagsWrap: document.getElementById("zcompare-flags-wrap"),
    flagsList: document.getElementById("zcompare-flags-list"),
    run: document.getElementById("zcompare-run"),
    clear: document.getElementById("zcompare-clear"),
    outputBody: document.getElementById("zcompare-output-body"),
    resultsWrap: document.getElementById("zcompare-results-wrap"),
    count: document.getElementById("zcompare-count"),
    copy: document.getElementById("zcompare-copy"),
  };

  function setStatus(message, tone) {
    dom.status.textContent = message;
    dom.status.dataset.tone = tone || "info";
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  function formatMeters(value) {
    return Number(value).toFixed(3);
  }

  function diffClass(absDiff) {
    if (absDiff < 0.05) return "zcompare-diff-good";
    if (absDiff < 0.2) return "zcompare-diff-warn";
    return "zcompare-diff-bad";
  }

  function normalizePointKey(value) {
    return String(value || "").trim().toLowerCase();
  }

  function buildCoordinateKey(northing, easting) {
    if (!Number.isFinite(northing) || !Number.isFinite(easting)) return "";
    return `${northing.toFixed(COORDINATE_MATCH_DECIMALS)}|${easting.toFixed(COORDINATE_MATCH_DECIMALS)}`;
  }

  function getCoordinateDistance(leftRow, rightRow) {
    if (!leftRow || !rightRow) return Number.POSITIVE_INFINITY;
    return Math.hypot(leftRow.nValue - rightRow.nValue, leftRow.eValue - rightRow.eValue);
  }

  function isNumericToken(token) {
    return /^[-+]?\d+(?:\.\d+)?$/.test(String(token || "").trim());
  }

  function getIntegerDigitCount(token) {
    const normalized = String(token || "").trim().replace(/^[+-]/, "");
    if (!/^\d+(?:\.\d+)?$/.test(normalized)) return -1;
    return normalized.split(".")[0].length;
  }

  function getNumericCandidates(tokens) {
    return tokens
      .map((token, index) => {
        const value = Number(token);
        if (!isNumericToken(token) || !Number.isFinite(value)) return null;
        return {
          token,
          index,
          value,
          integerDigits: getIntegerDigitCount(token),
        };
      })
      .filter(Boolean);
  }

  function getNumericCellCandidates(cells) {
    return cells
      .map((cell, index) => {
        const token = String(cell || "").trim();
        const value = Number(token);
        if (!isNumericToken(token) || !Number.isFinite(value)) return null;
        return {
          token,
          index,
          value,
          integerDigits: getIntegerDigitCount(token),
        };
      })
      .filter(Boolean);
  }

  function buildParseError(rowNumber, rawLine, point, zRaw, message) {
    return {
      ok: false,
      rowNumber,
      rawLine,
      point: point || `LINE-${rowNumber}`,
      nRaw: "",
      eRaw: "",
      zRaw: zRaw || "",
      message,
    };
  }

  function buildParsedRow(rowNumber, rawLine, point, north, east, zCandidate, message) {
    return {
      ok: true,
      rowNumber,
      rawLine,
      point,
      nRaw: north.token,
      eRaw: east.token,
      zRaw: zCandidate.token,
      nValue: north.value,
      eValue: east.value,
      zValue: zCandidate.value,
      message: message || "Ready",
    };
  }

  async function getPdfLib() {
    if (!pdfLibPromise) {
      pdfLibPromise = import(PDF_MODULE_URL).then((pdfjsLib) => {
        if (pdfjsLib?.GlobalWorkerOptions) {
          pdfjsLib.GlobalWorkerOptions.workerSrc = PDF_WORKER_URL;
        }
        return pdfjsLib;
      });
    }

    return pdfLibPromise;
  }

  function incrementReasonCount(map, reason, amount) {
    map[reason] = (map[reason] || 0) + (amount || 1);
  }

  function getDirectCellCandidate(cells, index, digits) {
    const token = String(cells[index] || "").trim();
    const value = Number(token);
    if (!isNumericToken(token) || !Number.isFinite(value)) return null;
    if (digits != null && getIntegerDigitCount(token) !== digits) return null;
    return {
      token,
      index,
      value,
      integerDigits: getIntegerDigitCount(token),
    };
  }

  function isLikelyHeaderCells(cells) {
    const joined = cells.map((cell) => String(cell || "").trim()).join(" ").toLowerCase();
    return (
      !/\d{6,7}(?:\.\d+)?/.test(joined) &&
      /(point|name|north|northing|east|easting|level|elev|height|station|id\b|no\b)/.test(joined)
    );
  }

  function getStructuredZCandidate(cells, excludedIndices) {
    const numericCells = getNumericCellCandidates(cells).filter(
      (item) => !excludedIndices.includes(item.index),
    );
    const preferredZIndices = [3, 4, 10];

    for (const preferredIndex of preferredZIndices) {
      const candidate = numericCells.find((item) => item.index === preferredIndex);
      if (candidate) return candidate;
    }

    const counts = new Map();
    numericCells.forEach((item) => {
      counts.set(item.token, (counts.get(item.token) || 0) + 1);
    });

    const duplicatedValue = numericCells.find((item) => counts.get(item.token) > 1);
    if (duplicatedValue) return duplicatedValue;

    const commonHeight = numericCells.find(
      (item) => item.integerDigits <= 3 && Math.abs(item.value) >= 1,
    );
    if (commonHeight) return commonHeight;

    const shortNumeric = numericCells.find((item) => item.integerDigits <= 3);
    if (shortNumeric) return shortNumeric;

    return numericCells[0] || null;
  }

  function parseLegacyLine(line, rowNumber) {
    const parts = line.split(/[\t ]+/).filter(Boolean);
    if (parts.length < 4) {
      return buildParseError(rowNumber, line, "", "", "Not enough values in line.");
    }

    const hasSerialAndPoint = parts.length >= 5;
    const point = hasSerialAndPoint ? parts[1] : parts[0];
    if (!point) {
      return {
        ignored: true,
        rowNumber,
        rawLine: line,
        reason: "Unnamed point",
      };
    }

    const valueTokens = hasSerialAndPoint ? parts.slice(2) : parts.slice(1);
    const numericCandidates = getNumericCandidates(valueTokens);
    const northCandidates = numericCandidates.filter((item) => item.integerDigits === 7);
    const eastCandidates = numericCandidates.filter((item) => item.integerDigits === 6);

    if (northCandidates.length !== 1) {
      const reason = northCandidates.length
        ? "More than one 7-digit northing candidate was found."
        : "No 7-digit northing candidate was found.";
      return buildParseError(rowNumber, line, point, "", reason);
    }

    if (eastCandidates.length !== 1) {
      const reason = eastCandidates.length
        ? "More than one 6-digit easting candidate was found."
        : "No 6-digit easting candidate was found.";
      return buildParseError(rowNumber, line, point, "", reason);
    }

    const north = northCandidates[0];
    const east = eastCandidates[0];
    const remainingNumeric = numericCandidates.filter(
      (item) => item.index !== north.index && item.index !== east.index,
    );
    const zCandidate = remainingNumeric[remainingNumeric.length - 1];

    if (!zCandidate) {
      return buildParseError(rowNumber, line, point, "", "No Z value was found.");
    }

    return buildParsedRow(rowNumber, line, point, north, east, zCandidate, "TXT ready");
  }

  function parseStructuredCells(cells, rowNumber, sourceLabel) {
    const normalized = cells.map((cell) => String(cell || "").trim());
    if (!normalized.some(Boolean)) return null;

    if (isLikelyHeaderCells(normalized)) {
      return {
        ignored: true,
        rowNumber,
        rawLine: normalized.join(","),
        reason: "Header row",
      };
    }

    const point = normalized[0];
    if (!point) {
      return {
        ignored: true,
        rowNumber,
        rawLine: normalized.join(","),
        reason: "Unnamed point",
      };
    }

    const numericCells = getNumericCellCandidates(normalized);
    let north = getDirectCellCandidate(normalized, 1, 7);
    let east = getDirectCellCandidate(normalized, 2, 6);

    if (!north) {
      const northCandidates = numericCells.filter((item) => item.integerDigits === 7);
      if (northCandidates.length !== 1) {
        const reason = northCandidates.length
          ? "More than one 7-digit northing candidate was found."
          : "No 7-digit northing candidate was found.";
        return buildParseError(rowNumber, normalized.join(","), point, "", reason);
      }
      north = northCandidates[0];
    }

    if (!east) {
      const eastCandidates = numericCells.filter((item) => item.integerDigits === 6);
      if (eastCandidates.length !== 1) {
        const reason = eastCandidates.length
          ? "More than one 6-digit easting candidate was found."
          : "No 6-digit easting candidate was found.";
        return buildParseError(rowNumber, normalized.join(","), point, "", reason);
      }
      east = eastCandidates[0];
    }

    const zCandidate = getStructuredZCandidate(normalized, [north.index, east.index]);
    if (!zCandidate) {
      return buildParseError(rowNumber, normalized.join(","), point, "", "No Z value was found.");
    }

    return buildParsedRow(rowNumber, normalized.join(","), point, north, east, zCandidate, sourceLabel);
  }

  function isLikelyPdfHeaderOrFooter(line) {
    return /(orthometric|height|point_id|point id|northing|easting|s\.?no|survey department|dubai municipality|government of dubai|certificate|attached|page\s+\d+|footnote|transaction|please be informed|remarks?)/i.test(
      line,
    );
  }

  function isLikelyPdfDataLine(line) {
    return /\d{7}\.\d+/.test(line) || /\d{6}\.\d+/.test(line);
  }

  function buildPdfLineText(items) {
    return items
      .slice()
      .sort((left, right) => left.x - right.x)
      .map((item) => item.str)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function groupPdfItemsIntoLines(items) {
    const groups = [];

    items
      .filter((item) => String(item?.str || "").trim())
      .map((item) => ({
        str: String(item.str || "").trim(),
        x: Number(item?.transform?.[4]) || 0,
        y: Number(item?.transform?.[5]) || 0,
      }))
      .sort((left, right) => {
        if (Math.abs(right.y - left.y) > PDF_LINE_TOLERANCE) {
          return right.y - left.y;
        }
        return left.x - right.x;
      })
      .forEach((item) => {
        const current = groups[groups.length - 1];
        if (!current || Math.abs(current.y - item.y) > PDF_LINE_TOLERANCE) {
          groups.push({ y: item.y, items: [item] });
          return;
        }

        current.items.push(item);
      });

    return groups.map((group) => buildPdfLineText(group.items)).filter(Boolean);
  }

  function parsePdfLine(line, rowNumber) {
    const normalizedLine = String(line || "").replace(/\s+/g, " ").trim();
    if (!normalizedLine) return null;

    if (isLikelyPdfHeaderOrFooter(normalizedLine)) {
      return {
        ignored: true,
        rowNumber,
        rawLine: normalizedLine,
        reason: "PDF header/footer",
      };
    }

    if (!isLikelyPdfDataLine(normalizedLine)) {
      return {
        ignored: true,
        rowNumber,
        rawLine: normalizedLine,
        reason: "Non-data PDF line",
      };
    }

    const tokens = normalizedLine.split(/\s+/).filter(Boolean);
    const numericCandidates = getNumericCandidates(tokens);
    const north = numericCandidates.find((item) => item.integerDigits === 7);
    const east = numericCandidates.find(
      (item) => item.index > (north?.index ?? -1) && item.integerDigits === 6,
    );

    if (!north) {
      return buildParseError(
        rowNumber,
        normalizedLine,
        "",
        "",
        "No 7-digit northing candidate was found in PDF row.",
      );
    }

    if (!east) {
      return buildParseError(
        rowNumber,
        normalizedLine,
        "",
        "",
        "No 6-digit easting candidate was found in PDF row.",
      );
    }

    const tokensBeforeNorth = tokens.slice(0, north.index);
    if (tokensBeforeNorth.length < 2) {
      return {
        ignored: true,
        rowNumber,
        rawLine: normalizedLine,
        reason: "Unnamed point",
      };
    }

    const point = tokensBeforeNorth[tokensBeforeNorth.length - 1];
    if (!point) {
      return {
        ignored: true,
        rowNumber,
        rawLine: normalizedLine,
        reason: "Unnamed point",
      };
    }

    const zCandidate =
      numericCandidates.find((item) => item.index > east.index && item.integerDigits <= 3) ||
      numericCandidates.find((item) => item.index > east.index);

    if (!zCandidate) {
      return buildParseError(
        rowNumber,
        normalizedLine,
        point,
        "",
        "No orthometric height was found in PDF row.",
      );
    }

    return buildParsedRow(rowNumber, normalizedLine, point, north, east, zCandidate, "PDF ready");
  }

  function createEmptyStats(fileName, sourceType) {
    return {
      fileName,
      sourceType,
      sources: [],
      rows: [],
      readyCount: 0,
      flaggedCount: 0,
      ignoredCount: 0,
      ignoredReasons: {},
      flaggedRows: [],
      sheetName: "",
    };
  }

  function mergeStats(parts, roleLabel) {
    const merged = createEmptyStats(
      parts.map((part) => part.fileName).filter(Boolean).join(" + ") || `${roleLabel} source`,
      parts.map((part) => part.sourceType).filter(Boolean).join(" + ") || "Mixed",
    );

    merged.sources = parts.map((part) => ({
      fileName: part.fileName,
      sourceType: part.sourceType,
      readyCount: part.readyCount,
      flaggedCount: part.flaggedCount,
      ignoredCount: part.ignoredCount,
    }));

    parts.forEach((part) => {
      merged.rows.push(...part.rows);
      merged.readyCount += part.readyCount;
      merged.flaggedCount += part.flaggedCount;
      merged.ignoredCount += part.ignoredCount;
      merged.flaggedRows.push(...part.flaggedRows);

      Object.entries(part.ignoredReasons).forEach(([reason, count]) => {
        incrementReasonCount(merged.ignoredReasons, `${part.sourceType}: ${reason}`, count);
      });
    });

    return merged;
  }

  function collectParsed(stats, parsed) {
    if (!parsed) return;

    if (parsed.ignored) {
      stats.ignoredCount += 1;
      incrementReasonCount(stats.ignoredReasons, parsed.reason || "Ignored row");
      return;
    }

    stats.rows.push(parsed);
    if (parsed.ok) {
      stats.readyCount += 1;
      return;
    }

    stats.flaggedCount += 1;
    stats.flaggedRows.push(parsed);
  }

  function parseTextContent(text, fileName, sourceType) {
    const stats = createEmptyStats(fileName, sourceType);

    String(text || "")
      .split(/\r?\n/)
      .forEach((line, index) => {
        const trimmed = String(line || "").trim();
        if (!trimmed) return;

        const parsed = trimmed.includes(",")
          ? parseStructuredCells(trimmed.split(","), index + 1, `${sourceType} ready`)
          : parseLegacyLine(trimmed, index + 1);

        collectParsed(stats, parsed);
      });

    return stats;
  }

  function parseSpreadsheetBuffer(buffer, fileName) {
    if (!window.XLSX || typeof window.XLSX.read !== "function") {
      throw new Error("Excel support library is not available.");
    }

    const workbook = window.XLSX.read(buffer, { type: "array" });
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) {
      throw new Error("The Excel file does not contain any sheets.");
    }

    const sheet = workbook.Sheets[firstSheetName];
    const rows = window.XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      raw: false,
      defval: "",
      blankrows: false,
    });

    const stats = createEmptyStats(fileName, "Excel");
    stats.sheetName = firstSheetName;

    rows.forEach((cells, index) => {
      const parsed = parseStructuredCells(Array.isArray(cells) ? cells : [cells], index + 1, "Excel ready");
      collectParsed(stats, parsed);
    });

    return stats;
  }

  async function parsePdfBuffer(buffer, fileName) {
    const pdfjsLib = await getPdfLib();
    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(buffer),
      useWorkerFetch: false,
    });
    const pdf = await loadingTask.promise;
    const stats = createEmptyStats(fileName, "PDF");

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const textContent = await page.getTextContent();
      const lines = groupPdfItemsIntoLines(textContent.items || []);

      lines.forEach((line, index) => {
        const parsed = parsePdfLine(line, `P${pageNumber}:${index + 1}`);
        collectParsed(stats, parsed);
      });
    }

    if (typeof loadingTask.destroy === "function") {
      await loadingTask.destroy();
    }

    return stats;
  }

  function getFileExtension(fileName) {
    const match = String(fileName || "").toLowerCase().match(/\.[^.]+$/);
    return match ? match[0] : "";
  }

  async function readDatasetFromFile(file) {
    const extension = getFileExtension(file.name);
    if (extension === ".xlsx" || extension === ".xls") {
      const buffer = await file.arrayBuffer();
      return parseSpreadsheetBuffer(buffer, file.name);
    }

    if (extension === ".pdf") {
      const buffer = await file.arrayBuffer();
      return parsePdfBuffer(buffer, file.name);
    }

    const text = await file.text();
    if (extension === ".csv") {
      return parseTextContent(text, file.name, "CSV");
    }

    return parseTextContent(text, file.name, "TXT");
  }

  function readDatasetFromManualText(text, roleLabel) {
    return parseTextContent(text, `${roleLabel} manual input`, "Manual");
  }

  async function buildDatasetFromInputs(role) {
    const isBefore = role === "before";
    const fileInput = isBefore ? dom.beforeFile : dom.afterFile;
    const textInput = isBefore ? dom.beforeText : dom.afterText;
    const roleLabel = isBefore ? "Before" : "After";
    const parts = [];

    const files = Array.from(fileInput.files || []);
    for (const file of files) {
      parts.push(await readDatasetFromFile(file));
    }

    const manualText = String(textInput.value || "").trim();
    if (manualText) {
      parts.push(readDatasetFromManualText(manualText, roleLabel));
    }

    if (!parts.length) {
      return null;
    }

    if (parts.length === 1) {
      return parts[0];
    }

    return mergeStats(parts, roleLabel);
  }

  function renderDatasetSummary(node, dataset, emptyMessage) {
    if (!dataset) {
      node.textContent = emptyMessage;
      return;
    }

    const samplePoints = dataset.rows
      .filter((row) => row.ok)
      .slice(0, 5)
      .map((row) => row.point)
      .join(", ") || "-";

    const ignoredText = dataset.ignoredCount
      ? Object.entries(dataset.ignoredReasons)
          .map(([reason, count]) => `${reason}${count > 1 ? ` x${count}` : ""}`)
          .join(" | ")
      : "0";

    const sourceNames = dataset.sources?.length
      ? dataset.sources.map((source) => `${source.sourceType}`).join(" + ")
      : dataset.sourceType;
    const sourceCount = dataset.sources?.length || 1;
    const loadedNames = dataset.sources?.length
      ? dataset.sources.map((source) => source.fileName).filter(Boolean).join(" + ")
      : dataset.fileName;

    node.innerHTML = `
      <div class="zcompare-summary-line"><span>Loaded Sources</span><strong>${sourceCount}</strong></div>
      <div class="zcompare-summary-line"><span>Source</span><strong>${escapeHtml(sourceNames || dataset.sourceType)}</strong></div>
      <div class="zcompare-summary-line"><span>Name</span><strong>${escapeHtml(loadedNames || dataset.fileName)}</strong></div>
      <div class="zcompare-summary-line"><span>Ready Points</span><strong>${dataset.readyCount}</strong></div>
      <div class="zcompare-summary-line"><span>Flagged Rows</span><strong>${dataset.flaggedCount}</strong></div>
      <div class="zcompare-summary-line"><span>Ignored Rows</span><strong>${escapeHtml(ignoredText)}</strong></div>
      <div class="zcompare-summary-line"><span>Sample Points</span><strong>${escapeHtml(samplePoints)}</strong></div>
    `;
  }

  function renderAllSummaries() {
    renderDatasetSummary(
      dom.beforeSummary,
      state.beforeDataset,
      "No before-conversion source loaded yet.",
    );
    renderDatasetSummary(
      dom.afterSummary,
      state.afterDataset,
      "No after-conversion source loaded yet.",
    );
  }

  function renderFlags() {
    const lines = [];

    if (state.beforeDataset?.flaggedRows?.length) {
      state.beforeDataset.flaggedRows.forEach((row) => {
        lines.push(`[Before] line ${row.rowNumber}: ${row.rawLine} --> ${row.message}`);
      });
    }

    if (state.afterDataset?.flaggedRows?.length) {
      state.afterDataset.flaggedRows.forEach((row) => {
        lines.push(`[After] line ${row.rowNumber}: ${row.rawLine} --> ${row.message}`);
      });
    }

    if (!lines.length) {
      dom.flagsWrap.hidden = true;
      dom.flagsList.textContent = "";
      return;
    }

    dom.flagsWrap.hidden = false;
    dom.flagsList.textContent = lines.join("\n");
  }

  async function convertDltmToWgs84(easting, northing) {
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
      throw new Error("DLTM to WGS84 conversion failed.");
    }

    return { lat: converted.y, lon: converted.x };
  }

  function buildBeforeIndex(dataset) {
    const nameIndex = new Map();
    const duplicateNames = new Set();
    const coordinateIndex = new Map();
    const duplicateCoordinates = new Set();
    const readyRows = [];

    dataset.rows
      .filter((row) => row.ok)
      .forEach((row) => {
        readyRows.push(row);

        const nameKey = normalizePointKey(row.point);
        if (nameKey) {
          if (nameIndex.has(nameKey)) {
            duplicateNames.add(nameKey);
          } else {
            nameIndex.set(nameKey, row);
          }
        }

        const coordinateKey = buildCoordinateKey(row.nValue, row.eValue);
        if (!coordinateKey) return;
        if (coordinateIndex.has(coordinateKey)) {
          duplicateCoordinates.add(coordinateKey);
          return;
        }
        coordinateIndex.set(coordinateKey, row);
      });

    return {
      nameIndex,
      duplicateNames,
      coordinateIndex,
      duplicateCoordinates,
      readyRows,
    };
  }

  function findBeforeRowMatch(afterRow, beforeIndexInfo) {
    const nameKey = normalizePointKey(afterRow.point);
    const coordinateKey = buildCoordinateKey(afterRow.nValue, afterRow.eValue);
    const exactCoordinateDuplicate =
      coordinateKey && beforeIndexInfo.duplicateCoordinates.has(coordinateKey);
    const exactCoordinateRow =
      coordinateKey && !exactCoordinateDuplicate
        ? beforeIndexInfo.coordinateIndex.get(coordinateKey)
        : null;

    if (nameKey && !beforeIndexInfo.duplicateNames.has(nameKey)) {
      const namedRow = beforeIndexInfo.nameIndex.get(nameKey);
      if (namedRow) {
        const distance = getCoordinateDistance(namedRow, afterRow);
        if (distance <= COORDINATE_MATCH_TOLERANCE) {
          return {
            row: namedRow,
            method: "name",
          };
        }
      }
    }

    if (exactCoordinateDuplicate) {
      return {
        error: "Duplicate coordinates found in before file.",
      };
    }

    if (exactCoordinateRow) {
      return {
        row: exactCoordinateRow,
        method: normalizePointKey(exactCoordinateRow.point) === nameKey ? "name" : "coordinate",
      };
    }

    let nearestRow = null;
    let nearestDistance = Number.POSITIVE_INFINITY;
    let nearestCount = 0;

    beforeIndexInfo.readyRows.forEach((row) => {
      const distance = getCoordinateDistance(row, afterRow);
      if (distance > COORDINATE_MATCH_TOLERANCE) return;

      if (distance + 1e-9 < nearestDistance) {
        nearestRow = row;
        nearestDistance = distance;
        nearestCount = 1;
        return;
      }

      if (Math.abs(distance - nearestDistance) <= 1e-9) {
        nearestCount += 1;
      }
    });

    if (nearestRow && nearestCount === 1) {
      return {
        row: nearestRow,
        method: normalizePointKey(nearestRow.point) === nameKey ? "name" : "coordinate-near",
      };
    }

    if (nameKey && beforeIndexInfo.duplicateNames.has(nameKey)) {
      return {
        error: "Duplicate point name found in before file.",
      };
    }

    if (nameKey && beforeIndexInfo.nameIndex.has(nameKey)) {
      return {
        error: "Point name exists in before file, but its coordinates do not match the converted point.",
      };
    }

    if (nearestCount > 1) {
      return {
        error: "More than one before point matches the converted coordinates within tolerance.",
      };
    }

    return {
      error: "Point was not found in before file by name or coordinates.",
    };
  }

  function getResultStatusText(result) {
    if (!result.ok) {
      return result.message;
    }

    if (result.matchMethod === "coordinate") {
      return `OK by coordinates -> ${result.beforePoint}`;
    }

    if (result.matchMethod === "coordinate-near") {
      return `OK by near coordinates -> ${result.beforePoint}`;
    }

    return "OK by name";
  }

  function outputRowHtml(result) {
    if (!result.ok) {
      return `
        <tr>
          <td>${escapeHtml(result.point)}</td>
          <td>${escapeHtml(result.beforeHText || "-")}</td>
          <td>${escapeHtml(result.geoidNText || "-")}</td>
          <td>${escapeHtml(result.calcHText || "-")}</td>
          <td>${escapeHtml(result.afterHText || "-")}</td>
          <td>-</td>
          <td class="zcompare-status-error">${escapeHtml(result.message)}</td>
        </tr>
      `;
    }

    return `
      <tr>
        <td>${escapeHtml(result.point)}</td>
        <td>${formatMeters(result.beforeH)}</td>
        <td>${formatMeters(result.geoidN)}</td>
        <td>${formatMeters(result.calcH)}</td>
        <td>${formatMeters(result.afterH)}</td>
        <td class="${diffClass(Math.abs(result.diff))}">${formatMeters(result.diff)}</td>
        <td class="zcompare-status-ok">${escapeHtml(getResultStatusText(result))}</td>
      </tr>
    `;
  }

  async function processComparisonRow(afterRow, beforeIndexInfo) {
    if (!afterRow.ok) {
      return {
        ok: false,
        point: afterRow.point,
        afterHText: afterRow.zRaw || "-",
        message: `After file line ${afterRow.rowNumber}: ${afterRow.message}`,
      };
    }

    const key = normalizePointKey(afterRow.point);
    if (!key) {
      return {
        ok: false,
        point: `LINE-${afterRow.rowNumber}`,
        afterHText: afterRow.zRaw || "-",
        message: "Point name is empty in after file.",
      };
    }

    const match = findBeforeRowMatch(afterRow, beforeIndexInfo);
    if (match?.error) {
      return {
        ok: false,
        point: afterRow.point,
        afterHText: afterRow.zRaw || "-",
        message: match.error,
      };
    }

    const beforeRow = match.row;

    try {
      const wgs = await convertDltmToWgs84(beforeRow.eValue, beforeRow.nValue);
      const geoidN = await gridClient.getUndulation(wgs.lat, wgs.lon);
      const calcH = beforeRow.zValue - geoidN;
      return {
        ok: true,
        point: afterRow.point,
        beforeH: beforeRow.zValue,
        geoidN,
        calcH,
        afterH: afterRow.zValue,
        diff: afterRow.zValue - calcH,
        matchMethod: match.method,
        beforePoint: beforeRow.point,
      };
    } catch (error) {
      return {
        ok: false,
        point: afterRow.point,
        beforeHText: formatMeters(beforeRow.zValue),
        afterHText: afterRow.zRaw || "-",
        message: error.message || String(error),
      };
    }
  }

  async function runComparison() {
    state.beforeDataset = await buildDatasetFromInputs("before");
    state.afterDataset = await buildDatasetFromInputs("after");
    renderAllSummaries();
    renderFlags();

    if (!state.beforeDataset || !state.afterDataset) {
      setStatus("Provide before and after data by one or more files, manual input, or both before comparison.", "error");
      return;
    }

    const afterRows = state.afterDataset.rows;
    if (!afterRows.length) {
      setStatus("No valid named rows were found in the after-conversion source.", "error");
      return;
    }

    dom.run.disabled = true;
    dom.copy.disabled = true;
    dom.outputBody.innerHTML = "";
    setStatus(
      `Comparing ${afterRows.length} after-conversion point(s) against before source...`,
      "info",
    );

    const beforeIndexInfo = buildBeforeIndex(state.beforeDataset);
    const results = [];

    for (let i = 0; i < afterRows.length; i += 1) {
      const result = await processComparisonRow(afterRows[i], beforeIndexInfo);
      results.push(result);
      dom.status.textContent = `Compared ${i + 1} of ${afterRows.length} after-conversion point(s)...`;
    }

    dom.outputBody.innerHTML = results.map(outputRowHtml).join("");
    dom.resultsWrap.style.display = "block";
    dom.count.textContent = `${results.length} converted points compared`;

    const okCount = results.filter((item) => item.ok).length;
    const errorCount = results.length - okCount;
    const nameMatchCount = results.filter((item) => item.ok && item.matchMethod === "name").length;
    const coordinateMatchCount = results.filter(
      (item) => item.ok && item.matchMethod !== "name",
    ).length;
    const ignoredTotal =
      (state.beforeDataset?.ignoredCount || 0) + (state.afterDataset?.ignoredCount || 0);

    state.lastCopiedText = results
      .map((item) => {
        if (!item.ok) {
          return [
            item.point,
            item.beforeHText || "",
            item.geoidNText || "",
            item.calcHText || "",
            item.afterHText || "",
            "",
            item.message,
          ].join("\t");
        }

        return [
          item.point,
          formatMeters(item.beforeH),
          formatMeters(item.geoidN),
          formatMeters(item.calcH),
          formatMeters(item.afterH),
          formatMeters(item.diff),
          getResultStatusText(item),
        ].join("\t");
      })
      .join("\n");

    dom.copy.disabled = results.length === 0;

    setStatus(
      `${MODEL_NAME} completed. ${okCount} point(s) matched (${nameMatchCount} by name, ${coordinateMatchCount} by coordinates), ${errorCount} point(s) need review${ignoredTotal ? `, ${ignoredTotal} row(s) ignored` : ""}.`,
      errorCount ? "error" : ignoredTotal ? "info" : "success",
    );

    dom.run.disabled = false;
  }

  async function copyResults() {
    if (!state.lastCopiedText) return;
    const header = "POINT\tBEFORE_h\tGEOID_N\tCALC_H\tAFTER_H\tDIFF\tSTATUS\n";
    await navigator.clipboard.writeText(header + state.lastCopiedText);
    setStatus("Results copied to clipboard.", "success");
  }

  function clearAll() {
    state.beforeDataset = null;
    state.afterDataset = null;
    state.lastCopiedText = "";
    dom.beforeFile.value = "";
    dom.afterFile.value = "";
    dom.beforeText.value = "";
    dom.afterText.value = "";
    dom.outputBody.innerHTML = "";
    dom.resultsWrap.style.display = "none";
    dom.copy.disabled = true;
    dom.count.textContent = "0 converted points compared";
    dom.flagsWrap.hidden = true;
    dom.flagsList.textContent = "";
    renderAllSummaries();
    setStatus("Ready. Add data in before and after sections using file upload, manual input, or both.", "info");
  }

  async function refreshRoleDataset(role, options) {
    const dataset = await buildDatasetFromInputs(role);
    const roleLabel = role === "before" ? "Before" : "After";

    if (role === "before") {
      state.beforeDataset = dataset;
    } else {
      state.afterDataset = dataset;
    }

    renderAllSummaries();
    renderFlags();

    if (options?.silent) {
      return dataset;
    }

    if (!dataset) {
      setStatus(`${roleLabel} source cleared.`, "info");
      return dataset;
    }

    const sourceCount = dataset.sources?.length || 1;
    const tone = dataset.flaggedCount ? "error" : dataset.ignoredCount ? "info" : "success";
    const ignoredText = dataset.ignoredCount
      ? `, ${dataset.ignoredCount} ignored`
      : "";
    setStatus(
      `${roleLabel} source loaded: ${dataset.readyCount} ready, ${dataset.flaggedCount} flagged${ignoredText}, ${sourceCount} source(s).`,
      tone,
    );

    return dataset;
  }

  async function handleFileSelection(role, file) {
    const isBefore = role === "before";
    const files = Array.from((isBefore ? dom.beforeFile.files : dom.afterFile.files) || []);

    if (!files.length) {
      await refreshRoleDataset(role, { silent: false });
      return;
    }

    const fileLabel =
      files.length === 1 ? files[0].name : `${files.length} file(s) selected`;
    setStatus(`Reading ${role} source: ${fileLabel}`, "info");

    try {
      await refreshRoleDataset(role, { silent: false });
    } catch (error) {
      setStatus(error.message || String(error), "error");
    }
  }

  async function handleManualInput(role) {
    try {
      const dataset = await refreshRoleDataset(role, { silent: false });
      if (!dataset) return;

      const roleLabel = role === "before" ? "Before" : "After";
      const tone = dataset.flaggedCount ? "error" : dataset.ignoredCount ? "info" : "success";
      setStatus(
        `${roleLabel} manual input updated: ${dataset.readyCount} ready, ${dataset.flaggedCount} flagged${dataset.ignoredCount ? `, ${dataset.ignoredCount} ignored` : ""}.`,
        tone,
      );
    } catch (error) {
      setStatus(error.message || String(error), "error");
    }
  }

  async function warmupModel() {
    try {
      const meta = await gridClient.ensureHeader();
      const resolutionMinutes = (meta.latStep * 60).toFixed(1);
      setStatus(
        `${MODEL_NAME} ready. Upload one or more before/after files, then compare converted points on a ${meta.rows} x ${meta.cols} grid at ${resolutionMinutes}' resolution.`,
        "success",
      );
    } catch (error) {
      setStatus(error.message || String(error), "error");
    }
  }

  dom.beforeFile.addEventListener("change", () => {
    handleFileSelection("before", dom.beforeFile.files).catch((error) => {
      setStatus(error.message || String(error), "error");
    });
  });

  dom.afterFile.addEventListener("change", () => {
    handleFileSelection("after", dom.afterFile.files).catch((error) => {
      setStatus(error.message || String(error), "error");
    });
  });

  dom.beforeText.addEventListener("change", () => {
    handleManualInput("before").catch((error) => {
      setStatus(error.message || String(error), "error");
    });
  });

  dom.afterText.addEventListener("change", () => {
    handleManualInput("after").catch((error) => {
      setStatus(error.message || String(error), "error");
    });
  });

  dom.run.addEventListener("click", () => {
    runComparison().catch((error) => {
      dom.run.disabled = false;
      setStatus(error.message || String(error), "error");
    });
  });

  dom.clear.addEventListener("click", clearAll);
  dom.copy.addEventListener("click", () => {
    copyResults().catch((error) => {
      setStatus(error.message || "Copy failed.", "error");
    });
  });

  clearAll();
  warmupModel();
})();
