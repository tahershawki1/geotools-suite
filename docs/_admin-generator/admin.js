(function () {
  document.body.classList.add("js-enabled");

  const titleEl = document.getElementById("titleInput");
  const idEl = document.getElementById("idInput");
  const descEl = document.getElementById("descInput");
  const htmlEl = document.getElementById("htmlInput");
  const cssEl = document.getElementById("cssInput");
  const jsEl = document.getElementById("jsInput");
  const cssFileSelect = document.getElementById("cssFileSelect");
  const jsFileSelect = document.getElementById("jsFileSelect");
  const htmlEditorHost = document.getElementById("htmlEditor");
  const cssEditorHost = document.getElementById("cssEditor");
  const jsEditorHost = document.getElementById("jsEditor");
  const instructionsEl = document.getElementById("instructions");
  const downloadBtn = document.getElementById("downloadBtn");
  const exportChangesBtn = document.getElementById("exportChangesBtn");
  const refreshPagesBtn = document.getElementById("refreshPagesBtn");
  const pagesTableBody = document.getElementById("pagesCardsGrid") || document.getElementById("pagesTableBody");
  const toolStatus = document.getElementById("toolStatus");
  const reviewSummary = document.getElementById("reviewSummary");
  const previewSummary = document.getElementById("previewSummary");
  const livePreviewFrame = document.getElementById("livePreviewFrame");
  const reviewHtmlDiff = document.getElementById("reviewHtmlDiff");
  const reviewCssDiff = document.getElementById("reviewCssDiff");
  const reviewJsDiff = document.getElementById("reviewJsDiff");
  const adminLoader = document.getElementById("admin-loader");
  const adminLoaderText = document.getElementById("admin-loader-text");

  const tabButtons = Array.from(document.querySelectorAll(".tab-btn"));
  const tabPanels = Array.from(document.querySelectorAll(".tab-panel"));
  const adminNavButtons = Array.from(document.querySelectorAll("[data-admin-nav-target]"));
  const adminSidebarToggle = document.querySelector("[data-admin-sidebar-toggle]");
  const adminSidebarBackdrop = document.querySelector("[data-admin-sidebar-backdrop]");

  const crsKeyEl = document.getElementById("crsKey");
  const crsLabelEl = document.getElementById("crsLabel");
  const crsTypeEl = document.getElementById("crsType");
  const crsProj4El = document.getElementById("crsProj4");
  const crsAdapterEl = document.getElementById("crsAdapter");
  const crsSaveBtn = document.getElementById("crsSaveBtn");
  const crsResetBtn = document.getElementById("crsResetBtn");
  const crsExportBtn = document.getElementById("crsExportBtn");
  const crsClearBtn = document.getElementById("crsClearBtn");
  const crsStatus = document.getElementById("crsStatus");
  const crsTableBody = document.getElementById("crsTableBody");

  const ADMIN_LOADER_HIDE_DELAY_MS = 2000;
  const ADMIN_LOADER_HIDE_ANIM_MS = 180;
  const ADMIN_SIDEBAR_BREAKPOINT = 1100;
  let adminLoaderHideTimer = null;

  function isCompactViewport() {
    return window.innerWidth <= ADMIN_SIDEBAR_BREAKPOINT;
  }

  function openAdminSidebar() {
    document.body.classList.add("admin-sidebar-open");
    if (adminSidebarToggle) adminSidebarToggle.setAttribute("aria-expanded", "true");
  }

  function closeAdminSidebar() {
    document.body.classList.remove("admin-sidebar-open");
    if (adminSidebarToggle) adminSidebarToggle.setAttribute("aria-expanded", "false");
  }

  if (adminSidebarToggle) {
    adminSidebarToggle.addEventListener("click", () => {
      if (document.body.classList.contains("admin-sidebar-open")) {
        closeAdminSidebar();
      } else {
        openAdminSidebar();
      }
    });
  }

  if (adminSidebarBackdrop) {
    adminSidebarBackdrop.addEventListener("click", () => {
      closeAdminSidebar();
    });
  }

  adminNavButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      setActiveTab(btn.dataset.adminNavTarget);
      if (isCompactViewport()) closeAdminSidebar();
    });
  });

  window.addEventListener("resize", () => {
    if (!isCompactViewport()) closeAdminSidebar();
  });

  function showAdminLoader(message) {
    if (!adminLoader) return;
    if (adminLoaderHideTimer) {
      clearTimeout(adminLoaderHideTimer);
      adminLoaderHideTimer = null;
    }
    if (adminLoaderText) {
      adminLoaderText.textContent = String(message || "Preparing your admin workspace...");
    }
    adminLoader.style.display = "flex";
    adminLoader.classList.remove("is-hidden");
    adminLoader.setAttribute("aria-hidden", "false");
  }

  function hideAdminLoaderAfterDelay() {
    if (!adminLoader) return;
    if (adminLoaderHideTimer) {
      clearTimeout(adminLoaderHideTimer);
    }
    adminLoaderHideTimer = setTimeout(() => {
      adminLoader.classList.add("is-hidden");
      adminLoader.setAttribute("aria-hidden", "true");
      window.setTimeout(() => {
        if (!adminLoader.classList.contains("is-hidden")) return;
        adminLoader.style.display = "none";
      }, ADMIN_LOADER_HIDE_ANIM_MS);
    }, ADMIN_LOADER_HIDE_DELAY_MS);
  }

  showAdminLoader("Welcome. Preparing your admin workspace...");
  if (document.readyState === "complete") {
    hideAdminLoaderAfterDelay();
  } else {
    window.addEventListener("load", hideAdminLoaderAfterDelay, { once: true });
  }

  function createAssetBucket() {
    return {
      files: [],
      selectedPath: "",
      editorPath: "",
      selectSeq: 0,
      originals: new Map(),
      drafts: new Map(),
    };
  }

  const state = {
    pages: [],
    crsList: [],
    currentPagePath: "",
    currentPage: null,
    expandedPagePath: "",
    assets: {
      css: createAssetBucket(),
      js: createAssetBucket(),
    },
    pageFiles: {
      originals: new Map(),
      drafts: new Map(),
    },
    editors: {
      html: null,
      css: null,
      js: null,
    },
    original: {
      html: "",
      css: "",
      js: "",
    },
    suppressEditorInput: 0,
  };

  if (downloadBtn) {
    downloadBtn.addEventListener("click", () => {
      const id = (idEl.value || "new-tool").trim();
      const title = titleEl.value || "New Tool";
      const desc = descEl.value || "";
      const html = getCodeValue("html") || buildHtml(id, title);
      const css = getCodeValue("css") || "/* tool styles */";
      const js = getCodeValue("js") || "(function(){ /* tool logic */ })();";

      downloadFile(`${id}.html`, html);
      downloadFile(`${id}.css`, css);
      downloadFile(`${id}.js`, js);
      instructionsEl.textContent = JSON.stringify(
        { id, title, desc, pagePath: `pages/${id}.html` },
        null,
        2,
      );
    });
  }

  if (refreshPagesBtn) {
    refreshPagesBtn.addEventListener("click", () => {
      discoverPages();
    });
  }

  if (exportChangesBtn) {
    exportChangesBtn.addEventListener("click", () => {
      exportChangesToProject().catch((err) => {
        setToolStatus(`Export failed: ${err.message}`);
      });
    });
  }

  if (pagesTableBody) {
    pagesTableBody.addEventListener("click", (event) => {
      const filesBtn = event.target.closest("button[data-toggle-files]");
      if (filesBtn) {
        const pagePath = filesBtn.getAttribute("data-toggle-files");
        togglePageAssets(pagePath);
        return;
      }

      const editBtn = event.target.closest("button[data-page]");
      if (!editBtn) return;
      const pagePath = editBtn.getAttribute("data-page");
      const page = state.pages.find((item) => item.pagePath === pagePath);
      if (page) {
        loadPageForEditing(page);
      }
    });
  }

  if (cssFileSelect) {
    cssFileSelect.addEventListener("change", () => {
      selectAssetFile("css", cssFileSelect.value).catch((err) => {
        setToolStatus(`Failed to switch CSS file: ${err.message}`);
      });
    });
  }

  if (jsFileSelect) {
    jsFileSelect.addEventListener("change", () => {
      selectAssetFile("js", jsFileSelect.value).catch((err) => {
        setToolStatus(`Failed to switch JS file: ${err.message}`);
      });
    });
  }

  tabButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      setActiveTab(btn.dataset.tab);
    });
  });

  if (crsSaveBtn) {
    crsSaveBtn.addEventListener("click", () => {
      const entry = readCrsForm();
      if (!entry) return;
      const existing = state.crsList.findIndex((item) => item.key === entry.key);
      if (existing >= 0) state.crsList[existing] = entry;
      else state.crsList.push(entry);
      renderCrsTable();
      setCrsStatus(`Saved ${entry.key}.`);
    });
  }

  if (crsResetBtn) {
    crsResetBtn.addEventListener("click", () => {
      fillCrsForm(null);
      setCrsStatus("Form reset.");
    });
  }

  if (crsExportBtn) {
    crsExportBtn.addEventListener("click", () => {
      const payload = JSON.stringify(state.crsList, null, 2);
      downloadFile("crs-defs.json", payload);
      setCrsStatus("CRS JSON exported.");
    });
  }

  if (crsClearBtn) {
    crsClearBtn.addEventListener("click", () => {
      state.crsList = [];
      renderCrsTable();
      setCrsStatus("CRS list cleared.");
    });
  }

  initCodeEditors();

  const reviewUpdate = debounce(() => {
    persistCurrentHtmlDraft();
    persistCurrentAssetDraft("css");
    persistCurrentAssetDraft("js");
    updateReview();
    updatePreview();
    updatePatchInstructions();
  }, 180);
  [htmlEl, cssEl, jsEl].forEach((el) => {
    if (!el) return;
    el.addEventListener("input", reviewUpdate);
  });

  function initCodeEditors() {
    if (!window.ace || !htmlEditorHost || !cssEditorHost || !jsEditorHost) return;

    try {
      if (window.ace.config && typeof window.ace.config.set === "function") {
        window.ace.config.set("basePath", "../vendor/ace");
      }

      state.editors.html = createEditor(htmlEditorHost, "ace/mode/html", htmlEl);
      state.editors.css = createEditor(cssEditorHost, "ace/mode/css", cssEl);
      state.editors.js = createEditor(jsEditorHost, "ace/mode/javascript", jsEl);
      document.body.classList.add("code-editor-enabled");
    } catch (_err) {
      // Keep textarea fallback if editor setup fails.
    }
  }

  function createEditor(host, mode, textarea) {
    const editor = window.ace.edit(host);
    editor.setTheme("ace/theme/one_dark");
    editor.session.setMode(mode);
    editor.session.setUseWorker(false);
    editor.session.setUseWrapMode(true);
    editor.session.setTabSize(2);
    editor.session.setUseSoftTabs(true);
    editor.setOptions({
      fontSize: "13px",
      showPrintMargin: false,
      highlightActiveLine: true,
      displayIndentGuides: true,
    });
    editor.setValue(textarea ? textarea.value || "" : "", -1);
    editor.clearSelection();

    editor.on("change", () => {
      if (!textarea) return;
      textarea.value = editor.getValue();
      if (state.suppressEditorInput > 0) return;
      textarea.dispatchEvent(new Event("input", { bubbles: true }));
    });

    return editor;
  }

  function getCodeTextarea(kind) {
    if (kind === "html") return htmlEl;
    if (kind === "css") return cssEl;
    if (kind === "js") return jsEl;
    return null;
  }

  function getCodeEditor(kind) {
    return state.editors[kind] || null;
  }

  function getCodeValue(kind) {
    const editor = getCodeEditor(kind);
    if (editor && typeof editor.getValue === "function") {
      return editor.getValue();
    }
    const textarea = getCodeTextarea(kind);
    return textarea ? textarea.value : "";
  }

  function setCodeValue(kind, value, options) {
    const opts = options || {};
    const silent = Boolean(opts.silent);
    const next = String(value || "");
    const textarea = getCodeTextarea(kind);
    if (textarea) textarea.value = next;

    const editor = getCodeEditor(kind);
    if (editor && editor.getValue() !== next) {
      if (silent) state.suppressEditorInput += 1;
      try {
        editor.setValue(next, -1);
        editor.clearSelection();
      } finally {
        if (silent) state.suppressEditorInput = Math.max(0, state.suppressEditorInput - 1);
      }
    }
  }

  function getAssetBucket(kind) {
    return state.assets[kind] || createAssetBucket();
  }

  function pickEditableAssetPaths(files, ext) {
    const pattern = ext === "css" ? /\.css$/i : /\.js$/i;
    const out = [];
    const seen = new Set();
    (files || []).forEach((path) => {
      if (!path || seen.has(path)) return;
      if (/^https?:\/\//i.test(path)) return;
      if (!pattern.test(path)) return;
      seen.add(path);
      out.push(path);
    });
    return out;
  }

  function chooseDefaultEditablePath(paths, preferredPath, kind) {
    if (preferredPath && paths.includes(preferredPath)) return preferredPath;
    const pagePattern = kind === "css" ? /^pages\/css\/.+\.css$/i : /^pages\/js\/.+\.js$/i;
    const sharedPattern = kind === "css" ? /^shared\/css\/.+\.css$/i : /^shared\/js\/.+\.js$/i;
    return (
      paths.find((path) => pagePattern.test(path)) ||
      paths.find((path) => sharedPattern.test(path)) ||
      paths[0] ||
      ""
    );
  }

  function resetPageDrafts() {
    state.pageFiles.originals = new Map();
    state.pageFiles.drafts = new Map();
  }

  function setPageFileSnapshot(path, text) {
    if (!path) return;
    const normalized = String(text || "");
    state.pageFiles.originals.set(path, normalized);
    state.pageFiles.drafts.set(path, normalized);
  }

  function getPageDraft(path) {
    if (!path) return "";
    if (state.pageFiles.drafts.has(path)) return state.pageFiles.drafts.get(path) || "";
    return "";
  }

  function getPageOriginal(path) {
    if (!path) return "";
    if (state.pageFiles.originals.has(path)) return state.pageFiles.originals.get(path) || "";
    return "";
  }

  function setPageDraft(path, text) {
    if (!path) return;
    state.pageFiles.drafts.set(path, String(text || ""));
  }

  function resetAssetBucket(kind, files, preferredPath) {
    const bucket = getAssetBucket(kind);
    bucket.files = pickEditableAssetPaths(files, kind);
    bucket.selectedPath = chooseDefaultEditablePath(bucket.files, preferredPath, kind);
    bucket.editorPath = "";
    bucket.selectSeq = 0;
    bucket.originals = new Map();
    bucket.drafts = new Map();
  }

  function renderAssetSelect(kind) {
    const select = kind === "css" ? cssFileSelect : jsFileSelect;
    const bucket = getAssetBucket(kind);
    if (!select) return;
    const picker = select.closest(".asset-picker");

    select.innerHTML = "";
    if (!bucket.files.length) {
      const opt = document.createElement("option");
      opt.value = "";
      opt.textContent = `No ${kind.toUpperCase()} file linked`;
      select.appendChild(opt);
      select.value = "";
      select.disabled = true;
      if (picker) picker.style.display = "flex";
      return;
    }

    bucket.files.forEach((path) => {
      const opt = document.createElement("option");
      opt.value = path;
      opt.textContent = path;
      select.appendChild(opt);
    });
    select.disabled = bucket.files.length <= 1;
    select.value = bucket.selectedPath;
    if (picker) picker.style.display = "flex";
  }

  function persistCurrentHtmlDraft() {
    if (!state.currentPagePath) return;
    setPageDraft(state.currentPagePath, getCodeValue("html"));
  }

  function persistCurrentAssetDraft(kind) {
    const bucket = getAssetBucket(kind);
    if (!bucket.editorPath) return;
    bucket.drafts.set(bucket.editorPath, getCodeValue(kind));
  }

  async function ensureAssetLoaded(kind, path) {
    if (!path) return "";
    const bucket = getAssetBucket(kind);
    if (bucket.drafts.has(path)) return bucket.drafts.get(path);
    const text = await fetchRepoText(path);
    bucket.originals.set(path, text);
    bucket.drafts.set(path, text);
    return text;
  }

  async function preloadAssetFiles(kind) {
    const bucket = getAssetBucket(kind);
    const tasks = bucket.files.map(async (path) => {
      try {
        await ensureAssetLoaded(kind, path);
      } catch (err) {
        setToolStatus(`Failed to preload ${path}: ${err.message}`);
      }
    });
    await Promise.all(tasks);
  }

  function getSelectedAssetPath(kind) {
    const bucket = getAssetBucket(kind);
    return bucket.selectedPath || "";
  }

  function getSelectedAssetDraft(kind) {
    const bucket = getAssetBucket(kind);
    const path = bucket.selectedPath;
    if (!path) return "";
    return bucket.drafts.get(path) || "";
  }

  function getSelectedAssetOriginal(kind) {
    const bucket = getAssetBucket(kind);
    const path = bucket.selectedPath;
    if (!path) return "";
    return bucket.originals.get(path) || "";
  }

  function collectChangedFiles() {
    persistCurrentHtmlDraft();
    persistCurrentAssetDraft("css");
    persistCurrentAssetDraft("js");

    const changed = new Map();

    if (state.currentPagePath) {
      const htmlOriginal = getPageOriginal(state.currentPagePath);
      const htmlDraft = getPageDraft(state.currentPagePath);
      if (htmlOriginal !== htmlDraft) {
        changed.set(state.currentPagePath, {
          path: state.currentPagePath,
          original: htmlOriginal,
          draft: htmlDraft,
        });
      }
    }

    ["css", "js"].forEach((kind) => {
      const bucket = getAssetBucket(kind);
      bucket.files.forEach((path) => {
        const original = bucket.originals.get(path) || "";
        const draft = bucket.drafts.has(path) ? bucket.drafts.get(path) || "" : original;
        if (original === draft) return;
        changed.set(path, { path, original, draft });
      });
    });

    return Array.from(changed.values()).sort((a, b) => a.path.localeCompare(b.path));
  }

  async function selectAssetFile(kind, nextPath) {
    const bucket = getAssetBucket(kind);
    persistCurrentAssetDraft(kind);
    bucket.selectedPath = nextPath || "";
    const selectSeq = (bucket.selectSeq || 0) + 1;
    bucket.selectSeq = selectSeq;

    if (kind === "css" && cssFileSelect && cssFileSelect.value !== bucket.selectedPath) {
      cssFileSelect.value = bucket.selectedPath;
    }
    if (kind === "js" && jsFileSelect && jsFileSelect.value !== bucket.selectedPath) {
      jsFileSelect.value = bucket.selectedPath;
    }

    let nextValue = "";
    let originalValue = "";
    if (bucket.selectedPath) {
      try {
        nextValue = await ensureAssetLoaded(kind, bucket.selectedPath);
        originalValue = bucket.originals.get(bucket.selectedPath) || "";
      } catch (err) {
        setToolStatus(`Failed to load ${bucket.selectedPath}: ${err.message}`);
      }
    }
    if (bucket.selectSeq !== selectSeq) return;

    setCodeValue(kind, nextValue, { silent: true });
    bucket.editorPath = bucket.selectedPath;
    state.original[kind] = originalValue;
    updatePatchInstructions();
    updateReview();
  }

  function setActiveTab(tabId) {
    tabButtons.forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.tab === tabId);
    });
    adminNavButtons.forEach((btn) => {
      const isActive = btn.dataset.adminNavTarget === tabId;
      btn.classList.toggle("active", isActive);
      if (isActive) btn.setAttribute("aria-current", "page");
      else btn.removeAttribute("aria-current");
    });
    tabPanels.forEach((panel) => {
      panel.classList.toggle("active", panel.dataset.tab === tabId);
    });
  }

  async function discoverPages() {
    setToolStatus("Scanning pages...");
    const registryTools = await loadRegistryTools();
    const registryMap = new Map();
    registryTools.forEach((tool) => {
      const path = normalizePagePath(tool.pagePath);
      if (!path) return;
      registryMap.set(path, tool);
    });

    const listedPages = await listPagesFromDirectory();
    const pageSet = new Set(["index.html"]);
    registryMap.forEach((_tool, path) => pageSet.add(path));
    listedPages.forEach((path) => pageSet.add(path));

    const pagePaths = Array.from(pageSet)
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b));

    const inspected = await Promise.all(
      pagePaths.map((pagePath) => inspectPage(pagePath, registryMap.get(pagePath))),
    );
    state.pages = inspected;
    renderPagesTable();
    setToolStatus(`Loaded ${state.pages.length} pages.`);
  }

  async function loadRegistryTools() {
    try {
      if (!window.GeoToolsRegistry) {
        await loadScript("../shared/js/tools-registry.js");
      }
      if (window.GeoToolsRegistry && typeof window.GeoToolsRegistry.list === "function") {
        return window.GeoToolsRegistry.list();
      }
    } catch (err) {
      setToolStatus("Registry load failed, using directory scan only.");
    }
    return [];
  }

  async function listPagesFromDirectory() {
    try {
      const res = await fetch("../pages/", { cache: "no-cache" });
      if (!res.ok) return [];
      const html = await res.text();
      const matches = Array.from(html.matchAll(/href="([^"]+\.html)"/gi));
      return matches
        .map((m) => normalizePagePath(m[1]))
        .filter(Boolean);
    } catch (_err) {
      return [];
    }
  }

  async function inspectPage(pagePath, registryTool) {
    const item = {
      pagePath,
      title: registryTool?.title || pagePath,
      desc: registryTool?.desc || "",
      cssFiles: [],
      jsFiles: [],
      editableCssFiles: [],
      editableJsFiles: [],
      editableCssPath: "",
      editableJsPath: "",
    };

    try {
      const pageUrl = toDocUrl(pagePath);
      const res = await fetch(pageUrl, { cache: "no-cache" });
      if (!res.ok) return item;
      const htmlText = await res.text();
      const parsed = collectAssetsFromHtml(htmlText, pageUrl);
      item.title = parsed.title || item.title;
      item.cssFiles = parsed.cssFiles;
      item.jsFiles = parsed.jsFiles;
      item.editableCssFiles = parsed.editableCssFiles;
      item.editableJsFiles = parsed.editableJsFiles;
      item.editableCssPath = parsed.editableCssPath;
      item.editableJsPath = parsed.editableJsPath;
    } catch (_err) {
      // Keep fallback info only.
    }
    return item;
  }

  function collectAssetsFromHtml(htmlText, pageUrl) {
    const doc = new DOMParser().parseFromString(htmlText, "text/html");
    const cssFiles = pickEditableAssetPaths(
      Array.from(doc.querySelectorAll("link[rel~='stylesheet']"))
        .map((link) => toRepoPath(link.getAttribute("href"), pageUrl))
        .filter(Boolean),
      "css",
    );
    const jsFiles = pickEditableAssetPaths(
      Array.from(doc.querySelectorAll("script[src]"))
        .map((script) => toRepoPath(script.getAttribute("src"), pageUrl))
        .filter(Boolean),
      "js",
    );

    const editableCssFiles = cssFiles.slice();
    const editableJsFiles = jsFiles.slice();

    const editableCssPath = chooseDefaultEditablePath(editableCssFiles, "", "css");
    const editableJsPath = chooseDefaultEditablePath(editableJsFiles, "", "js");

    return {
      title: doc.title || "",
      cssFiles,
      jsFiles,
      editableCssFiles,
      editableJsFiles,
      editableCssPath,
      editableJsPath,
    };
  }

  function renderPagesTable() {
    if (!pagesTableBody) return;
    if (!state.pages.length) {
      pagesTableBody.innerHTML = `<div class="pages-empty-card">No pages found.</div>`;
      return;
    }

    pagesTableBody.innerHTML = state.pages.map((page) => {
      const isActive = page.pagePath === state.currentPagePath;
      const isExpanded = page.pagePath === state.expandedPagePath;
      const cardClass = [
        "page-card",
        isActive ? "row-active" : "",
        isExpanded ? "row-expanded" : "",
      ].filter(Boolean).join(" ");
      const cssCount = (page.cssFiles || []).length;
      const jsCount = (page.jsFiles || []).length;

      return `
        <article class="${cardClass}">
          <div class="page-card-head">
            <h4 class="page-card-title">${escapeHtml(page.title || page.pagePath)}</h4>
            <code class="page-card-path">${escapeHtml(page.pagePath)}</code>
          </div>

          <div class="page-card-meta">
            <span class="meta-pill">CSS ${cssCount}</span>
            <span class="meta-pill">JS ${jsCount}</span>
          </div>

          <div class="page-card-files">
            <div class="page-card-kind">
              <span class="kind-label">CSS</span>
              ${renderFilesCompact(page.cssFiles)}
            </div>
            <div class="page-card-kind">
              <span class="kind-label">JS</span>
              ${renderFilesCompact(page.jsFiles)}
            </div>
          </div>

          <div class="page-card-actions-top">
            <button type="button" class="assets-toggle-btn" data-toggle-files="${escapeHtml(page.pagePath)}" aria-expanded="${isExpanded ? "true" : "false"}">
              ${isExpanded ? "اخفاء الملفات" : "عرض الملفات"}
            </button>
          </div>

          <div class="assets-panel${isExpanded ? "" : " is-hidden"}">
            <div class="assets-panel-col">
              <div class="assets-panel-head">
                <span>CSS Files</span>
                <span class="assets-panel-count">${cssCount}</span>
              </div>
              ${renderFilesDetails(page.cssFiles, "CSS")}
            </div>
            <div class="assets-panel-col">
              <div class="assets-panel-head">
                <span>JS Files</span>
                <span class="assets-panel-count">${jsCount}</span>
              </div>
              ${renderFilesDetails(page.jsFiles, "JS")}
            </div>
          </div>

          <button type="button" class="load-page-btn card-edit-btn" data-page="${escapeHtml(page.pagePath)}">تعديل</button>
        </article>
      `;
    }).join("");
  }

  function togglePageAssets(pagePath) {
    const normalized = String(pagePath || "");
    if (!normalized) return;
    state.expandedPagePath = state.expandedPagePath === normalized ? "" : normalized;
    renderPagesTable();
  }

  function renderFilesCompact(files) {
    if (!files || !files.length) {
      return `<div class="files-compact"><span class="files-empty">none</span></div>`;
    }
    const list = Array.isArray(files) ? files : [];
    const visible = list.slice(0, 2).map((file) => {
      const fileName = fileNameFromPath(file);
      return `<code class="file-chip" title="${escapeHtml(file)}">${escapeHtml(fileName)}</code>`;
    }).join("");
    const hiddenCount = Math.max(0, list.length - 2);
    const more = hiddenCount > 0 ? `<span class="file-more">+${hiddenCount}</span>` : "";
    return `
      <div class="files-compact">
        <span class="file-count">${list.length}</span>
        <span class="file-chip-wrap">${visible}${more}</span>
      </div>
    `;
  }

  function renderFilesDetails(files, kind) {
    const list = Array.isArray(files) ? files : [];
    if (!list.length) {
      return `<div class="assets-empty">No ${kind} files linked.</div>`;
    }
    return `
      <ul class="asset-path-list">
        ${list.map((file) => `<li><code title="${escapeHtml(file)}">${escapeHtml(file)}</code></li>`).join("")}
      </ul>
    `;
  }

  function fileNameFromPath(path) {
    const clean = String(path || "").replace(/\\/g, "/");
    const parts = clean.split("/").filter(Boolean);
    return parts.length ? parts[parts.length - 1] : clean;
  }

  async function loadPageForEditing(page) {
    setToolStatus(`Loading ${page.pagePath}...`);
    try {
      const htmlPath = page.pagePath;
      const htmlText = await fetchRepoText(htmlPath);
      resetPageDrafts();
      setPageFileSnapshot(htmlPath, htmlText);

      setCodeValue("html", htmlText, { silent: true });
      setCodeValue("css", "", { silent: true });
      setCodeValue("js", "", { silent: true });

      if (titleEl) titleEl.value = page.title || "";
      if (idEl) idEl.value = pageIdFromPath(page.pagePath);
      if (descEl) descEl.value = page.desc || "";

      state.currentPagePath = page.pagePath;
      state.currentPage = page;
      state.original.html = getPageOriginal(htmlPath);
      state.original.css = "";
      state.original.js = "";

      resetAssetBucket("css", page.editableCssFiles || page.cssFiles, page.editableCssPath);
      resetAssetBucket("js", page.editableJsFiles || page.jsFiles, page.editableJsPath);
      await preloadAssetFiles("css");
      await preloadAssetFiles("js");
      renderAssetSelect("css");
      renderAssetSelect("js");
      await selectAssetFile("css", getSelectedAssetPath("css"));
      await selectAssetFile("js", getSelectedAssetPath("js"));

      updatePatchInstructions();
      renderPagesTable();
      updateReview();
      updatePreview();
      setToolStatus(`Loaded ${page.pagePath}`);
    } catch (err) {
      setToolStatus(`Load failed: ${err.message}`);
    }
  }

  function updatePreview() {
    if (!livePreviewFrame) return;

    if (!state.currentPage) {
      setPreviewSummary("Select a page to start preview.");
      livePreviewFrame.srcdoc = buildPreviewPlaceholder("Select a page, then click Edit.");
      return;
    }

    setPreviewSummary(`Live preview: ${state.currentPage.pagePath}`);
    livePreviewFrame.srcdoc = buildPreviewDocument();
  }

  function buildPreviewDocument() {
    persistCurrentHtmlDraft();
    const htmlText = getPageDraft(state.currentPagePath);
    const page = state.currentPage;
    if (!page || !htmlText.trim()) {
      return buildPreviewPlaceholder("No HTML loaded.");
    }

    const pageUrl = toDocUrl(page.pagePath);
    const doc = new DOMParser().parseFromString(htmlText, "text/html");

    ensurePreviewHead(doc);
    upsertBaseHref(doc, pageUrl);
    persistCurrentAssetDraft("css");
    persistCurrentAssetDraft("js");
    injectDraftCss(doc, pageUrl);
    injectDraftJs(doc, pageUrl);

    return "<!DOCTYPE html>\n" + doc.documentElement.outerHTML;
  }

  function ensurePreviewHead(doc) {
    if (doc.head) return;
    const head = doc.createElement("head");
    if (doc.documentElement) {
      doc.documentElement.insertBefore(head, doc.body || null);
    } else if (doc.body) {
      doc.body.insertAdjacentElement("beforebegin", head);
    }
  }

  function upsertBaseHref(doc, href) {
    if (!doc.head) return;
    let base = doc.querySelector("base");
    if (!base) {
      base = doc.createElement("base");
      doc.head.prepend(base);
    }
    base.setAttribute("href", href);
  }

  function getStagedAssetByPath(kind, repoPath) {
    if (!repoPath) return null;
    const bucket = getAssetBucket(kind);
    if (!bucket) return null;
    if (!bucket.drafts.has(repoPath)) return null;
    const draft = bucket.drafts.get(repoPath) || "";
    const original = bucket.originals.has(repoPath) ? bucket.originals.get(repoPath) || "" : null;
    if (typeof original === "string" && draft === original) return null;
    return draft;
  }

  function injectDraftCss(doc, pageUrl) {
    const links = Array.from(doc.querySelectorAll("link[rel~='stylesheet'][href]"));
    links.forEach((link) => {
      const repoPath = toRepoPath(link.getAttribute("href"), pageUrl);
      const cssText = getStagedAssetByPath("css", repoPath);
      if (cssText == null) return;
      const style = doc.createElement("style");
      style.setAttribute("data-admin-preview-path", repoPath);
      style.textContent = cssText;
      link.replaceWith(style);
    });
  }

  function injectDraftJs(doc, pageUrl) {
    const scripts = Array.from(doc.querySelectorAll("script[src]"));
    scripts.forEach((script) => {
      const repoPath = toRepoPath(script.getAttribute("src"), pageUrl);
      const jsText = getStagedAssetByPath("js", repoPath);
      if (jsText == null) return;
      script.removeAttribute("src");
      script.setAttribute("data-admin-preview-path", repoPath);
      script.textContent = escapeForInlineScript(jsText);
    });
  }

  function buildPreviewPlaceholder(message) {
    const text = escapeHtml(message || "");
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <style>
    body { margin:0; font-family:Segoe UI,Arial,sans-serif; background:#f8fafc; color:#334155; display:flex; align-items:center; justify-content:center; min-height:100vh; }
    .card { padding:16px 18px; border:1px solid #e2e8f0; border-radius:10px; background:#fff; font-size:13px; }
  </style>
</head>
<body>
  <div class="card">${text}</div>
</body>
</html>`;
  }

  function setPreviewSummary(text) {
    if (previewSummary) previewSummary.textContent = text;
  }

  function escapeForInlineScript(text) {
    return String(text || "").replace(/<\/script/gi, "<\\/script");
  }

  function buildAssetReview(kind) {
    const bucket = getAssetBucket(kind);
    if (!bucket.files.length) {
      return {
        changed: 0,
        total: 0,
        preview: `No ${kind.toUpperCase()} files linked.`,
      };
    }

    const chunks = [];
    let changed = 0;
    bucket.files.forEach((path) => {
      const original = bucket.originals.has(path) ? bucket.originals.get(path) || "" : "";
      const draft = bucket.drafts.has(path) ? bucket.drafts.get(path) || "" : original;
      const diff = buildDiffSummary(original, draft);
      if (!diff.changed) return;
      changed += 1;
      chunks.push(`[${path}] ${diff.stats}\n${diff.preview}`);
    });

    if (!changed) {
      return {
        changed: 0,
        total: bucket.files.length,
        preview: "No changes.",
      };
    }

    const maxChunks = 4;
    const previewChunks = chunks.slice(0, maxChunks);
    if (chunks.length > maxChunks) {
      previewChunks.push(`... ${chunks.length - maxChunks} more changed ${kind.toUpperCase()} file(s).`);
    }
    return {
      changed,
      total: bucket.files.length,
      preview: previewChunks.join("\n\n"),
    };
  }

  function updateReview() {
    if (!state.currentPagePath) {
      if (reviewSummary) reviewSummary.textContent = "Select a page to start review.";
      if (reviewHtmlDiff) reviewHtmlDiff.textContent = "";
      if (reviewCssDiff) reviewCssDiff.textContent = "";
      if (reviewJsDiff) reviewJsDiff.textContent = "";
      return;
    }

    persistCurrentHtmlDraft();
    persistCurrentAssetDraft("css");
    persistCurrentAssetDraft("js");

    const currentHtml = getPageDraft(state.currentPagePath);
    const originalHtml = getPageOriginal(state.currentPagePath);

    const htmlDiff = buildDiffSummary(originalHtml, currentHtml);
    const cssReview = buildAssetReview("css");
    const jsReview = buildAssetReview("js");

    if (reviewHtmlDiff) reviewHtmlDiff.textContent = htmlDiff.preview;
    if (reviewCssDiff) reviewCssDiff.textContent = cssReview.preview;
    if (reviewJsDiff) reviewJsDiff.textContent = jsReview.preview;

    const changedFiles = collectChangedFiles();
    const changedParts = [];
    changedParts.push(htmlDiff.changed ? `HTML ${htmlDiff.stats}` : "HTML no change");
    changedParts.push(`CSS files changed ${cssReview.changed}/${cssReview.total}`);
    changedParts.push(`JS files changed ${jsReview.changed}/${jsReview.total}`);
    changedParts.push(`Changed files total ${changedFiles.length}`);
    const summary = `${state.currentPagePath}: ${changedParts.join(" | ")}`;
    if (reviewSummary) reviewSummary.textContent = summary;
  }

  function buildDiffSummary(beforeText, afterText) {
    if (beforeText === afterText) {
      return { changed: false, stats: "no change", preview: "No changes." };
    }

    const before = splitLines(beforeText);
    const after = splitLines(afterText);
    const complexity = before.length * after.length;

    if (complexity > 150000) {
      const max = Math.max(before.length, after.length);
      let changed = 0;
      const out = [];
      for (let i = 0; i < max; i += 1) {
        const a = before[i] || "";
        const b = after[i] || "";
        if (a === b) continue;
        changed += 1;
        if (out.length < 80) {
          if (a) out.push(`- ${a}`);
          if (b) out.push(`+ ${b}`);
        }
      }
      if (changed > 80) out.push(`... ${changed - 80} more changed line groups`);
      return {
        changed: true,
        stats: `~${changed} changed lines`,
        preview: out.join("\n") || "Changed.",
      };
    }

    const diffOps = lineDiff(before, after);
    const adds = diffOps.filter((op) => op.type === "+").length;
    const dels = diffOps.filter((op) => op.type === "-").length;
    const limited = diffOps.slice(0, 120).map((op) => `${op.type} ${op.text}`);
    if (diffOps.length > 120) {
      limited.push(`... ${diffOps.length - 120} more diff lines`);
    }

    return {
      changed: true,
      stats: `+${adds} / -${dels}`,
      preview: limited.join("\n") || "Changed.",
    };
  }

  function lineDiff(aLines, bLines) {
    const n = aLines.length;
    const m = bLines.length;
    const dp = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));

    for (let i = n - 1; i >= 0; i -= 1) {
      for (let j = m - 1; j >= 0; j -= 1) {
        if (aLines[i] === bLines[j]) dp[i][j] = dp[i + 1][j + 1] + 1;
        else dp[i][j] = Math.max(dp[i + 1][j], dp[i][j + 1]);
      }
    }

    const out = [];
    let i = 0;
    let j = 0;
    while (i < n && j < m) {
      if (aLines[i] === bLines[j]) {
        i += 1;
        j += 1;
      } else if (dp[i + 1][j] >= dp[i][j + 1]) {
        out.push({ type: "-", text: aLines[i] });
        i += 1;
      } else {
        out.push({ type: "+", text: bLines[j] });
        j += 1;
      }
    }
    while (i < n) {
      out.push({ type: "-", text: aLines[i] });
      i += 1;
    }
    while (j < m) {
      out.push({ type: "+", text: bLines[j] });
      j += 1;
    }
    return out;
  }

  function splitLines(text) {
    if (!text) return [];
    return String(text).replace(/\r\n/g, "\n").split("\n");
  }

  function debounce(fn, waitMs) {
    let timer = null;
    return function debounced() {
      clearTimeout(timer);
      timer = setTimeout(() => fn(), waitMs);
    };
  }

  function normalizePagePath(value) {
    let path = String(value || "").trim().replace(/\\/g, "/");
    path = path.split("?")[0].split("#")[0];
    if (!path || path === "../") return "";

    if (path.startsWith("http://") || path.startsWith("https://")) return "";
    if (path.startsWith("./")) path = path.slice(2);
    if (path.startsWith("/")) path = path.slice(1);
    if (path.startsWith("docs/")) path = path.slice(5);

    const fileNameMatch = path.match(/([^/]+\.html)$/i);
    if (!fileNameMatch) return "";
    const fileName = fileNameMatch[1];

    if (path === "index.html" || fileName === "index.html") return "index.html";
    if (path.startsWith("pages/")) return path;
    return `pages/${fileName}`;
  }

  function pageIdFromPath(path) {
    const normalized = normalizePagePath(path);
    if (normalized === "index.html") return "home";
    const fileName = normalized.split("/").pop() || "";
    return fileName.replace(/\.html$/i, "");
  }

  function toDocUrl(repoPath) {
    return new URL(`../${repoPath}`, location.href).href;
  }

  function toRepoPath(rawPath, baseUrl) {
    const href = String(rawPath || "").trim();
    if (!href) return "";
    if (href.startsWith("http://") || href.startsWith("https://")) return href;

    try {
      const resolved = new URL(href, baseUrl || location.href);
      if (resolved.origin !== location.origin) return resolved.href;
      let path = resolved.pathname.replace(/^\/+/, "");
      if (path.startsWith("docs/")) path = path.slice(5);
      return path;
    } catch (_err) {
      return href;
    }
  }

  async function fetchRepoText(repoPath) {
    if (!repoPath) return "";
    if (/^https?:\/\//i.test(repoPath)) return "";
    const res = await fetch(toDocUrl(repoPath), { cache: "no-cache" });
    if (!res.ok) throw new Error(`${repoPath} HTTP ${res.status}`);
    return res.text();
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function setToolStatus(text) {
    if (toolStatus) toolStatus.textContent = text;
  }

  function updatePatchInstructions() {
    if (!instructionsEl || !state.currentPage) return;
    const changed = collectChangedFiles().map((item) => item.path);
    instructionsEl.textContent = JSON.stringify(
      {
        id: pageIdFromPath(state.currentPage.pagePath),
        title: state.currentPage.title || "",
        desc: state.currentPage.desc || "",
        pagePath: state.currentPage.pagePath,
        cssPath: getSelectedAssetPath("css") || null,
        jsPath: getSelectedAssetPath("js") || null,
        cssFiles: getAssetBucket("css").files,
        jsFiles: getAssetBucket("js").files,
        stagedChanges: changed,
      },
      null,
      2,
    );
  }

  async function exportChangesToProject() {
    if (!state.currentPage) {
      setToolStatus("Select a page first.");
      return;
    }

    const changedFiles = collectChangedFiles();
    if (!changedFiles.length) {
      setToolStatus("No staged changes to export.");
      return;
    }

    if (typeof window.showDirectoryPicker !== "function") {
      const fallback = JSON.stringify(
        {
          note: "Browser does not support direct write. Apply these files manually.",
          files: changedFiles.map((item) => ({ path: item.path, content: item.draft })),
        },
        null,
        2,
      );
      downloadFile("staged-changes.json", fallback);
      setToolStatus("Browser does not support direct filesystem write. Downloaded staged-changes.json.");
      return;
    }

    const root = await window.showDirectoryPicker({ mode: "readwrite" });
    let written = 0;
    for (const file of changedFiles) {
      await writeFileByRepoPath(root, file.path, file.draft);
      written += 1;
    }
    setToolStatus(`Exported ${written} file(s) to selected folder.`);
  }

  async function writeFileByRepoPath(rootHandle, repoPath, content) {
    const clean = String(repoPath || "").replace(/^\/+/, "").replace(/\\/g, "/");
    const segments = clean.split("/").filter(Boolean);
    if (!segments.length) throw new Error("Invalid path: " + repoPath);

    let dir = rootHandle;
    for (let i = 0; i < segments.length - 1; i += 1) {
      dir = await dir.getDirectoryHandle(segments[i], { create: true });
    }

    const fileName = segments[segments.length - 1];
    const fileHandle = await dir.getFileHandle(fileName, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(String(content || ""));
    await writable.close();
  }

  function downloadFile(name, content) {
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  }

  function buildHtml(id, title) {
    return `<!DOCTYPE html>
<html lang="en" dir="ltr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title} - GeoTools Suite</title>
  <link rel="stylesheet" href="../styles.css" />
  <link rel="stylesheet" href="./css/${id}.css" />
</head>
<body>
  <div class="surface" style="padding:24px"></div>
  <script src="./js/${id}.js"></script>
</body>
</html>`;
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = src;
      script.onload = resolve;
      script.onerror = () => reject(new Error("Failed to load " + src));
      document.head.appendChild(script);
    });
  }

  function setCrsStatus(text) {
    if (crsStatus) crsStatus.textContent = text;
  }

  function normalizeKey(value) {
    return String(value || "").toLowerCase().trim();
  }

  function normalizeCrs(item) {
    return {
      key: normalizeKey(item.key),
      label: item.label || normalizeKey(item.key),
      type: item.type === "geographic" ? "geographic" : "projected",
      proj4: item.proj4 || null,
      adapter: item.adapter || null,
    };
  }

  function readCrsForm() {
    if (!crsKeyEl || !crsLabelEl || !crsTypeEl || !crsProj4El || !crsAdapterEl) return null;
    const key = normalizeKey(crsKeyEl.value);
    const label = (crsLabelEl.value || "").trim();
    const type = (crsTypeEl.value || "projected").trim();
    const proj4 = (crsProj4El.value || "").trim();
    const adapter = (crsAdapterEl.value || "").trim();

    if (!key) {
      setCrsStatus("Key is required.");
      return null;
    }
    if (!label) {
      setCrsStatus("Label is required.");
      return null;
    }
    if (!proj4 && !adapter) {
      setCrsStatus("Provide Proj4 or Adapter.");
      return null;
    }
    return normalizeCrs({
      key,
      label,
      type,
      proj4: proj4 || null,
      adapter: adapter || null,
    });
  }

  function fillCrsForm(item) {
    if (!crsKeyEl || !crsLabelEl || !crsTypeEl || !crsProj4El || !crsAdapterEl) return;
    crsKeyEl.value = item ? item.key : "";
    crsLabelEl.value = item ? item.label : "";
    crsTypeEl.value = item ? item.type : "projected";
    crsProj4El.value = item && item.proj4 ? item.proj4 : "";
    crsAdapterEl.value = item && item.adapter ? item.adapter : "";
  }

  function renderCrsTable() {
    if (!crsTableBody) return;
    crsTableBody.innerHTML = "";
    state.crsList.forEach((item) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${escapeHtml(item.key)}</td>
        <td>${escapeHtml(item.label)}</td>
        <td>${escapeHtml(item.type)}</td>
        <td>${escapeHtml(item.adapter ? "adapter:" + item.adapter : "proj4")}</td>
        <td>
          <button type="button" class="mini" data-edit="${escapeHtml(item.key)}">Edit</button>
          <button type="button" class="mini danger" data-del="${escapeHtml(item.key)}">Delete</button>
        </td>
      `;
      crsTableBody.appendChild(tr);
    });

    crsTableBody.querySelectorAll("[data-edit]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const key = btn.getAttribute("data-edit");
        const item = state.crsList.find((c) => c.key === key);
        if (item) fillCrsForm(item);
      });
    });

    crsTableBody.querySelectorAll("[data-del]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const key = btn.getAttribute("data-del");
        state.crsList = state.crsList.filter((c) => c.key !== key);
        renderCrsTable();
        setCrsStatus(`Deleted ${key}.`);
      });
    });
  }

  async function autoLoadCrs() {
    if (!crsTableBody) return;
    try {
      const res = await fetch("../shared/data/crs-defs.json", { cache: "no-cache" });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const data = await res.json();
      if (!Array.isArray(data)) throw new Error("JSON must be an array");
      state.crsList = data.map(normalizeCrs);
      renderCrsTable();
      setCrsStatus("Auto-loaded CRS from shared/data/crs-defs.json");
    } catch (err) {
      setCrsStatus("Auto-load failed. " + err.message);
    }
  }

  autoLoadCrs();
  discoverPages();
  setActiveTab("tools");
  updatePreview();
})();
