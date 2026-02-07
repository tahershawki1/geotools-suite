// اختبار سريع لتشخيص مشاكل الخريطة
// انسخ والصق في DevTools Console

console.log("=== اختبار الخريطة ===\n");

// 1. التحقق من ارتفاع عنصر الخريطة
const mapHeight = document.getElementById("map")?.clientHeight;
console.log("1. ارتفاع عنصر الخريطة:");
console.log(`   document.getElementById("map")?.clientHeight = ${mapHeight}`);
console.log(`   ✓ يجب أن يكون 320 (ليس 0)\n`);

// 2. التحقق من تحميل Leaflet
console.log("2. هل Leaflet محمّل؟");
console.log(`   typeof L = ${typeof L}`);
console.log(`   ✓ يجب أن يكون 'object' أو 'function'\n`);

// 3. التحقق من حالة الخريطة بعد التحويل
console.log("3. بعد عمل تحويل، تحقق من:");
const _mapRef = (typeof window !== 'undefined') ? (window._map || window.map) : undefined;
console.log(`   mapLoaded = ${_mapRef && _mapRef._loaded}`);
console.log(`   ✓ يجب أن يكون true\n`);

// 4. تشخيص المشاكل
console.log("=== التشخيص ===");
if (mapHeight === 0) {
  console.error("❌ مشكلة CSS: ارتفاع الخريطة = 0");
  console.log("   الحل: تحقق من CSS في <div id=\"map\"> ... style");
} else if (mapHeight > 0) {
  console.log("✅ CSS سليم: ارتفاع الخريطة = " + mapHeight);
}

if (typeof L === "undefined") {
  console.error("❌ مشكلة تحميل: Leaflet لم يُحمّل");
  console.log("   الحل: تحقق من CDN links في <head>");
} else {
  console.log("✅ Leaflet محمّل بنجاح");
}

console.log("\n=== للبدء بالاختبار ===");
console.log("1. أدخل إحداثيات وقم بالتحويل");
console.log("2. تحقق من ظهور الخريطة");
console.log("3. اضغط على صف من الجدول الجماعي لعرض النقطة");
const btnSwap = document.getElementById('btnSwap');
if (btnSwap) {
  btnSwap.addEventListener('click', () => {
    try {
      const elInput = document.getElementById('coordsInput') || document.getElementById('elInput') || window.elInput;
      const parsePointsFn = window.parsePoints || (typeof parsePoints === 'function' ? parsePoints : null);
      const showMsgFn = window.showMsg || (typeof showMsg === 'function' ? showMsg : null);
      if (!parsePointsFn || !elInput) return;
      const { pts, badLines } = parsePointsFn(elInput.value);
      if (badLines.length || !pts.length) return;

      const swapped = pts.map(p => ({ N: p.E, E: p.N }));
      elInput.value = swapped.map(p => `${p.N}, ${p.E}`).join('\n') + '\n';
      if (showMsgFn) showMsgFn('تم عكس N/E. اضغط "رسم وحساب" مرة أخرى.', '');
    } catch (e) {
      console.error('btnSwap handler error', e);
    }
  });
}
