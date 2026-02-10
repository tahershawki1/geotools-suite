      console.log("GeoTools SPA fetch-loader active - v2026-02-08");

      const appContainer = document.getElementById("app-container");
      const contentDiv = document.getElementById("view-content");
      const loaderElement = document.getElementById("loader");
      const defaultMeta = {
        lang: document.documentElement.lang || "en",
        dir: document.documentElement.dir || "ltr",
        title: document.title,
      };

      let dashboardHtml = "";
      let leafletObserver = null;
      let autoFieldCounter = 0;

      // Attribute flags for page-injected assets (removed on navigation)
      const PAGE_STYLE_ATTR = "data-spa";
      const PAGE_STYLE_VALUE = "page-style";
      const PAGE_SCRIPT_VALUE = "page-script";

      // Persistent assets stay across navigations; normalized lowercase for comparison.
      const persistentStyles = new Set();
      const persistentScripts = new Set();

      const basePrefix = (() => {
        if (location.protocol === "file:") return "";
        const parts = (location.pathname || "").split("/").filter(Boolean);
        if (!parts.length) return "";
        const first = parts[0].toLowerCase();
        if (first === "docs") return "/docs";
        if (first === "pages" || first === "shared" || first === "vendor") return "";
        if (first.includes(".")) return "";
        return "/" + first;
      })();

      // Helper to seed persistent sets with repo-prefix and /docs prefix for GitHub Pages paths.
      function seedPersistent(set, items) {
        items.forEach((item) => {
          const value = item.toLowerCase();
          set.add(value);
          set.add(("/docs" + value).toLowerCase());
          if (basePrefix) {
            set.add((basePrefix + value).toLowerCase());
            set.add((basePrefix + "/docs" + value).toLowerCase());
          }
        });
      }

      seedPersistent(persistentStyles, [
        "/shared/css/theme.css",
        "/styles.css",
        "/vendor/leaflet/leaflet.css",
        "/shared/css/navbar.css",
      ]);

      seedPersistent(persistentScripts, [
        "/vendor/leaflet/leaflet.js",
        "/vendor/proj4.js",
        "/shared/js/tools-registry.js",
        "/shared/js/crs-registry.js",
        "/shared/js/navbar-loader.js",
        "/shared/js/keyboard-navigation.js",
        "/shared/js/notification-system.js",
        "/shared/js/ui-dialogs.js",
        "/shared/js/dashboard.js",
      ]);

      // Normalizes URL to pathname for comparison against persistent sets.
      function normalizeUrl(value) {
        if (!value) return "";
        try {
          const u = new URL(value, location.href);
          return u.pathname.toLowerCase();
        } catch (_) {
          return String(value || "").toLowerCase();
        }
      }

      function showLoader(show) {
        loaderElement.style.display = show ? "flex" : "none";
        loaderElement.setAttribute("aria-hidden", show ? "false" : "true");
        contentDiv.setAttribute("aria-busy", show ? "true" : "false");
      }

      // Resolve page URL using GeoToolsRegistry as the single source of truth.
      function resolvePageUrl(pageName) {
        const key = String(pageName || "").toLowerCase();
        if (!key || key === "home") {
          return "./index.html";
        }

        const registry = window.GeoToolsRegistry;
        const entry = registry && typeof registry.getById === "function" ? registry.getById(key) : null;
        if (entry && entry.pagePath) {
          return entry.pagePath.startsWith(".") ? entry.pagePath : `./${entry.pagePath}`;
        }

        // Fallback legacy path pattern to avoid hard failures.
        return `./pages/${key}.html`;
      }

      function setDocumentMeta(meta) {
        document.documentElement.lang = meta.lang || defaultMeta.lang;
        document.documentElement.dir = meta.dir || defaultMeta.dir;
        document.title = meta.title || defaultMeta.title;
      }

      function notifyLoadError(message) {
        if (typeof window.showError === "function") {
          window.showError(message, "Error");
          return;
        }
        console.error(message);
      }

      function ensureLabelAssociations(root) {
        if (!root) return;
        const labels = root.querySelectorAll("label:not([for])");

        labels.forEach((label) => {
          let control =
            label.querySelector("input, select, textarea") ||
            (label.nextElementSibling &&
            /^(INPUT|SELECT|TEXTAREA)$/.test(label.nextElementSibling.tagName)
              ? label.nextElementSibling
              : null);

          if (!control && label.parentElement) {
            control = label.parentElement.querySelector("input, select, textarea");
          }
          if (!control) return;

          if (!control.id) {
            autoFieldCounter += 1;
            control.id = "auto-field-" + autoFieldCounter;
          }
          label.setAttribute("for", control.id);
        });
      }

      function enhanceLeafletAccessibility(root) {
        const scope = root || document;

        scope.querySelectorAll(".leaflet-control-zoom-in").forEach((el) => {
          if (!el.getAttribute("aria-label")) {
            el.setAttribute("aria-label", "Zoom in");
          }
          el.setAttribute("role", "button");
        });

        scope.querySelectorAll(".leaflet-control-zoom-out").forEach((el) => {
          if (!el.getAttribute("aria-label")) {
            el.setAttribute("aria-label", "Zoom out");
          }
          el.setAttribute("role", "button");
        });

        scope.querySelectorAll(".leaflet-container").forEach((el) => {
          if (!el.getAttribute("aria-label")) {
            el.setAttribute("aria-label", "Interactive map");
          }
        });

        scope.querySelectorAll(".leaflet-popup-close-button").forEach((el) => {
          if (!el.getAttribute("aria-label")) {
            el.setAttribute("aria-label", "Close popup");
          }
        });
      }

      function installLeafletObserver() {
        if (leafletObserver || typeof MutationObserver === "undefined") return;

        leafletObserver = new MutationObserver(() => {
          enhanceLeafletAccessibility(document);
        });

        leafletObserver.observe(document.body, {
          childList: true,
          subtree: true,
        });
      }

      function removeMapArtifacts() {
        try {
          if (window.map && typeof window.map.remove === "function") {
            window.map.remove();
            delete window.map;
          }
          if (window._map && typeof window._map.remove === "function") {
            window._map.remove();
            delete window._map;
          }
          document.querySelectorAll("#view-content .leaflet-container").forEach((el) => {
            el.remove();
          });
        } catch (error) {
          console.warn("Map cleanup warning:", error);
        }
      }

      function parsePage(html, baseUrl) {
        const parser = new DOMParser();
        const parsed = parser.parseFromString(html, "text/html");
        const nodes = [];
        const styles = [];

        const resolveHref = (href) => {
          try {
            return new URL(href, baseUrl || location.href).href;
          } catch (error) {
            console.warn("Failed to resolve stylesheet URL:", href, error);
            return href;
          }
        };

        parsed.querySelectorAll("link[rel~='stylesheet']").forEach((link) => {
          const href = link.getAttribute("href");
          if (!href || isPersistentStyleHref(href)) return; // Skip globals
          styles.push({
            href: resolveHref(href),
            media: link.getAttribute("media") || "",
          });
        });

        parsed.querySelectorAll("style").forEach((styleEl) => {
          const text = styleEl.textContent || "";
          if (text.trim()) {
            styles.push({ inline: text });
          }
        });

        Array.from(parsed.body.childNodes).forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const el = node;
            if (el.tagName === "SCRIPT" || el.tagName === "LINK" || el.tagName === "STYLE") return;
            if (el.tagName === "FOOTER") return; // Skip any embedded footers to keep single legal line
            if (el.matches(".standalone-footer,[data-standalone-only='true']")) return;
            nodes.push(el.outerHTML);
            return;
          }
          if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) {
            nodes.push(node.textContent);
          }
        });

        return {
          contentHtml: nodes.join("\n"),
          scripts: Array.from(parsed.querySelectorAll("script")),
          styles,
          meta: {
            lang: parsed.documentElement.getAttribute("lang") || defaultMeta.lang,
            dir: parsed.documentElement.getAttribute("dir") || defaultMeta.dir,
            title: parsed.title || defaultMeta.title,
          },
        };
      }

      function clearPageScripts() {
        document
          .querySelectorAll(`script[${PAGE_STYLE_ATTR}='${PAGE_SCRIPT_VALUE}']`)
          .forEach((script) => {
            script.remove();
          });
      }

      function clearPageStyles() {
        document
          .querySelectorAll(
            `link[${PAGE_STYLE_ATTR}='${PAGE_STYLE_VALUE}'], style[${PAGE_STYLE_ATTR}='${PAGE_STYLE_VALUE}']`,
          )
          .forEach((node) => {
            node.remove();
          });
      }

      function applyPageStyles(styles) {
        clearPageStyles();
        if (!styles || !styles.length) return Promise.resolve();

        const loadPromises = [];

        styles.forEach((style) => {
          if (style.href) {
            if (isPersistentStyleHref(style.href)) {
              return; // persistent global already present
            }

            const existing = Array.from(
              document.querySelectorAll("link[rel~='stylesheet']"),
            ).find((link) => link.href === style.href);

            if (existing) {
              if (existing.getAttribute(PAGE_STYLE_ATTR) === "true" && style.media) {
                existing.media = style.media;
              }
              return;
            }

            const link = document.createElement("link");
            link.rel = "stylesheet";
            link.href = style.href;
            if (style.media) link.media = style.media;
            link.setAttribute(PAGE_STYLE_ATTR, PAGE_STYLE_VALUE);

            // Wait for external CSS to load before rendering
            const p = new Promise((resolve) => {
              link.onload = resolve;
              link.onerror = resolve; // don't block on failure
            });
            loadPromises.push(p);

            document.head.appendChild(link);
            return;
          }

          if (style.inline) {
            const styleEl = document.createElement("style");
            styleEl.textContent = style.inline;
            styleEl.setAttribute(PAGE_STYLE_ATTR, PAGE_STYLE_VALUE);
            document.head.appendChild(styleEl);
          }
        });

        return loadPromises.length > 0 ? Promise.all(loadPromises) : Promise.resolve();
      }

      function isGlobalScript(src) {
        const normalized = src.toLowerCase();
        if (normalized.includes("lib-loader.js") && window.GeoLibLoader) {
          return true;
        }
        if (
          normalized.includes("leaflet/leaflet.js") ||
          normalized.includes("cdn.jsdelivr.net/npm/leaflet") ||
          normalized.includes("unpkg.com/leaflet")
        ) {
          return !!window.L;
        }
        if (
          normalized.includes("proj4.js") ||
          normalized.includes("cdnjs.cloudflare.com/ajax/libs/proj4js")
        ) {
          return !!window.proj4;
        }
        const ignored = [
          "theme.js",
          "navbar-loader.js",
          "footer-loader.js",
          "keyboard-navigation.js",
          "notification-system.js",
        ];
        return ignored.some((item) => normalized.includes(item));
      }

      function isPersistentStyleHref(href) {
        return persistentStyles.has(normalizeUrl(href));
      }

      function isPersistentScriptSrc(src) {
        return persistentScripts.has(normalizeUrl(src));
      }

      function injectScript(scriptEl, baseUrl) {
        return new Promise((resolve, reject) => {
          const src = scriptEl.getAttribute("src");
          const script = document.createElement("script");
          script.setAttribute(PAGE_STYLE_ATTR, PAGE_SCRIPT_VALUE);
          script.async = false;
          script.defer = false;

          if (src) {
            const resolvedBase = baseUrl || location.href;
            script.src = new URL(src, resolvedBase).href;
            script.onload = resolve;
            script.onerror = () => reject(new Error("Failed to load script: " + src));
            document.body.appendChild(script);
            return;
          }

          script.textContent = scriptEl.textContent || "";
          document.body.appendChild(script);
          resolve();
        });
      }

      async function runPageScripts(scripts, baseUrl) {
        clearPageScripts();
        for (const scriptEl of scripts) {
          const src = scriptEl.getAttribute("src");
          if (src && (isGlobalScript(src) || isPersistentScriptSrc(src))) continue;

          if (src) {
            // Avoid duplicate injection when same src already in DOM.
            const normalizedSrc = new URL(src, baseUrl || location.href).href;
            const exists = Array.from(document.querySelectorAll("script")).some(
              (s) => normalizeUrl(s.src) === normalizeUrl(normalizedSrc),
            );
            if (exists) continue;
          }
          await injectScript(scriptEl, baseUrl);
        }
      }

      function finishNavigation(activePage, meta) {
        setDocumentMeta(meta || defaultMeta);
        ensureLabelAssociations(contentDiv);
        enhanceLeafletAccessibility(contentDiv);

        if (window.GeoToolsTheme && typeof window.GeoToolsTheme.reinit === "function") {
          window.GeoToolsTheme.reinit();
        }
        if (typeof window.updatePageIndicator === "function") {
          window.updatePageIndicator(activePage || "home");
        }
        if (activePage === "home" && typeof window.renderDashboardCards === "function") {
          window.renderDashboardCards();
        }

        // Apply lightweight fade-in for page transitions.
        appContainer.classList.add("page-fade-in");
        setTimeout(() => appContainer.classList.remove("page-fade-in"), 220);
        appContainer.style.opacity = "1";
        showLoader(false);
        contentDiv.focus({ preventScroll: true });
        window.scrollTo({ top: 0, behavior: "smooth" });
      }

      window.loadPage = async function loadPage(pageName) {
        const normalizedPage = String(pageName || "").toLowerCase();
        if (!normalizedPage || normalizedPage === "home") {
          clearPageScripts();
          clearPageStyles();
          contentDiv.innerHTML = dashboardHtml;
          finishNavigation("home", defaultMeta);
          return;
        }

        removeMapArtifacts();
        showLoader(true);
        appContainer.style.opacity = "0.5";

        try {
          const url = resolvePageUrl(normalizedPage);
          const res = await fetch(url, { cache: "no-cache" });
          if (!res.ok) {
            throw new Error("Failed to load " + url + " (HTTP " + res.status + ")");
          }

          const html = await res.text();
          const absoluteUrl = new URL(url, location.href).href;
          const parsed = parsePage(html, absoluteUrl);

          contentDiv.innerHTML = "";
          await new Promise((resolve) => setTimeout(resolve, 10));
          contentDiv.innerHTML = parsed.contentHtml;
          await applyPageStyles(parsed.styles);
          await runPageScripts(parsed.scripts, absoluteUrl);
          finishNavigation(normalizedPage, parsed.meta);
        } catch (err) {
          notifyLoadError("Error loading page: " + err.message);
          console.error("Page load error:", err);
          appContainer.style.opacity = "1";
          showLoader(false);
        }
      };

      window.addEventListener("DOMContentLoaded", () => {
        dashboardHtml = contentDiv.innerHTML;
        ensureLabelAssociations(contentDiv);
        enhanceLeafletAccessibility(contentDiv);
        installLeafletObserver();
        if (typeof window.updatePageIndicator === "function") {
          window.updatePageIndicator("home");
        }
        
      });
    
