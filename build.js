#!/usr/bin/env node
/**
 * GeoTools Suite - Build & Minification Script
 * Minifies CSS and JavaScript files for production
 */

const fs = require('fs');
const path = require('path');

// الألوان للـ console
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(color, message) {
  console.log(`${color}${message}${colors.reset}`);
}

// ===== CSS Minifier =====
function minifyCSS(css) {
  return css
    .replace(/\/\*[\s\S]*?\*\//g, '') // إزالة التعليقات
    .replace(/\n\s*\n/g, '\n') // إزالة الأسطر الفارغة
    .replace(/\s+/g, ' ') // توحيد المسافات
    .replace(/\s*([{}:;,])\s*/g, '$1') // إزالة المسافات حول الأقواس
    .trim();
}

// ===== JS Minifier (بسيط) =====
function minifyJS(js) {
  return js
    .replace(/\/\/.*$/gm, '') // إزالة تعليقات // 
    .replace(/\/\*[\s\S]*?\*\//g, '') // إزالة تعليقات /* */
    .replace(/\n\s*\n/g, '\n') // إزالة الأسطر الفارغة
    .replace(/^\s+/gm, '') // إزالة المسافات في البداية
    .replace(/\s+$/gm, '') // إزالة المسافات في النهاية
    .trim();
}

// ===== Process Files =====
function processFiles() {
  const docsPath = path.join(__dirname, 'docs');
  const distPath = path.join(__dirname, 'docs', 'dist');

  // إنشء مجلد dist
  if (!fs.existsSync(distPath)) {
    fs.mkdirSync(distPath, { recursive: true });
    log(colors.green, '✅ Created dist directory');
  }

  // معالجة styles.css
  const cssPath = path.join(docsPath, 'styles.css');
  if (fs.existsSync(cssPath)) {
    try {
      const css = fs.readFileSync(cssPath, 'utf8');
      const minifiedCSS = minifyCSS(css);
      const cssSize = css.length;
      const minifiedCSSSize = minifiedCSS.length;
      const saved = ((1 - minifiedCSSSize / cssSize) * 100).toFixed(2);

      fs.writeFileSync(path.join(distPath, 'styles.min.css'), minifiedCSS);
      log(colors.green, `✅ Minified styles.css`);
      log(colors.cyan, `   Original: ${cssSize} bytes | Minified: ${minifiedCSSSize} bytes | Saved: ${saved}%`);
    } catch (error) {
      log(colors.red, `❌ Error minifying styles.css: ${error.message}`);
    }
  }

  // معالجة theme.js
  const themeJsPath = path.join(docsPath, 'theme.js');
  if (fs.existsSync(themeJsPath)) {
    try {
      const js = fs.readFileSync(themeJsPath, 'utf8');
      const minifiedJS = minifyJS(js);
      const jsSize = js.length;
      const minifiedJSSize = minifiedJS.length;
      const saved = ((1 - minifiedJSSize / jsSize) * 100).toFixed(2);

      fs.writeFileSync(path.join(distPath, 'theme.min.js'), minifiedJS);
      log(colors.green, `✅ Minified theme.js`);
      log(colors.cyan, `   Original: ${jsSize} bytes | Minified: ${minifiedJSSize} bytes | Saved: ${saved}%`);
    } catch (error) {
      log(colors.red, `❌ Error minifying theme.js: ${error.message}`);
    }
  }

  // معالجة MAP_DEBUG.js
  const mapDebugPath = path.join(docsPath, 'MAP_DEBUG.js');
  if (fs.existsSync(mapDebugPath)) {
    try {
      const js = fs.readFileSync(mapDebugPath, 'utf8');
      const minifiedJS = minifyJS(js);
      const jsSize = js.length;
      const minifiedJSSize = minifiedJS.length;
      const saved = ((1 - minifiedJSSize / jsSize) * 100).toFixed(2);

      fs.writeFileSync(path.join(distPath, 'MAP_DEBUG.min.js'), minifiedJS);
      log(colors.green, `✅ Minified MAP_DEBUG.js`);
      log(colors.cyan, `   Original: ${jsSize} bytes | Minified: ${minifiedJSSize} bytes | Saved: ${saved}%`);
    } catch (error) {
      log(colors.red, `❌ Error minifying MAP_DEBUG.js: ${error.message}`);
    }
  }

  log(colors.blue, '\n🎉 Build complete!');
  log(colors.cyan, `📁 Minified files available in: docs/dist/`);
}

// تشغيل العملية
log(colors.yellow, '🔨 GeoTools Suite - Build & Minification');
log(colors.cyan, '==========================================\n');

processFiles();
