// GeoTools Suite — Ellipsoid to Orthometric Height Converter
// Formula: H = h - N   (Orthometric = Ellipsoidal - Geoid Undulation)
(function () {
  // -------------------------------------------------------
  // Tabs
  // -------------------------------------------------------
  window.switchHeightTab = function (el, tab) {
    document.querySelectorAll('.ht-tab').forEach(function (t) { t.classList.remove('active'); });
    document.querySelectorAll('.ht-section').forEach(function (s) { s.classList.remove('active'); });
    el.classList.add('active');
    document.getElementById('ht-section-' + tab).classList.add('active');
  };

  // -------------------------------------------------------
  // Single conversion
  // -------------------------------------------------------
  window.runSingleHeight = function () {
    var h = parseFloat(document.getElementById('ht-h').value);
    var N = parseFloat(document.getElementById('ht-N').value);
    var errEl = document.getElementById('ht-single-error');
    errEl.style.display = 'none';

    if (!Number.isFinite(h)) {
      errEl.textContent = 'Please enter a valid ellipsoidal height (h).';
      errEl.style.display = 'block';
      return;
    }
    if (!Number.isFinite(N)) {
      errEl.textContent = 'Please enter a valid geoid undulation (N).';
      errEl.style.display = 'block';
      return;
    }

    var H = h - N;
    var prec = parseInt(document.getElementById('ht-prec').value, 10) || 4;

    document.getElementById('ht-res-h').textContent    = h.toFixed(prec)  + ' m';
    document.getElementById('ht-res-N').textContent    = N.toFixed(prec)  + ' m';
    document.getElementById('ht-res-H').textContent    = H.toFixed(prec)  + ' m';
    document.getElementById('ht-res-formula').textContent =
      'H = ' + h.toFixed(prec) + ' − (' + N.toFixed(prec) + ') = ' + H.toFixed(prec) + ' m';

    document.getElementById('ht-result-card').style.display = 'block';
    document.getElementById('ht-copy-btn').dataset.value = H.toFixed(prec);
  };

  window.copyHeightResult = function (btn) {
    var val = btn.dataset.value || '';
    if (!val) return;
    navigator.clipboard.writeText(val).then(function () {
      var orig = btn.textContent;
      btn.textContent = '✅ Copied';
      setTimeout(function () { btn.textContent = orig; }, 1500);
    });
  };

  window.clearSingleHeight = function () {
    ['ht-h', 'ht-N'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.value = '';
    });
    document.getElementById('ht-result-card').style.display = 'none';
    document.getElementById('ht-single-error').style.display = 'none';
  };

  // -------------------------------------------------------
  // Batch conversion
  // -------------------------------------------------------
  var _batchRows = [];

  window.runBatchHeight = function () {
    var raw = (document.getElementById('ht-batch-input').value || '').trim();
    var globalN = document.getElementById('ht-batch-N').value.trim();
    var prec = parseInt(document.getElementById('ht-batch-prec').value, 10) || 4;
    var useGlobalN = document.getElementById('ht-batch-use-global').checked;
    var errEl = document.getElementById('ht-batch-error');
    errEl.style.display = 'none';

    if (!raw) {
      errEl.textContent = 'Please paste at least one row of data.';
      errEl.style.display = 'block';
      return;
    }

    var gN = useGlobalN ? parseFloat(globalN) : NaN;
    if (useGlobalN && !Number.isFinite(gN)) {
      errEl.textContent = 'Please enter a valid global geoid undulation (N).';
      errEl.style.display = 'block';
      return;
    }

    var lines = raw.split(/\r?\n/).filter(function (l) { return l.trim() !== ''; });
    _batchRows = [];
    var errors = [];

    lines.forEach(function (line, idx) {
      var parts = line.trim().split(/[,\t ]+/);
      // Accept formats: h   OR   h,N   OR   Pt,h,N   OR  Pt,Lat,Lon,h,N
      // We detect by column count + options
      var row = { pt: idx + 1, lat: '', lon: '', h: NaN, N: NaN, H: NaN, error: '' };

      if (parts.length === 1 && !isNaN(parseFloat(parts[0]))) {
        // Just h
        row.h = parseFloat(parts[0]);
      } else if (parts.length >= 2 && !isNaN(parseFloat(parts[parts.length - 2])) && !isNaN(parseFloat(parts[parts.length - 1]))) {
        // Last two columns are h, N
        row.h = parseFloat(parts[parts.length - 2]);
        row.N = parseFloat(parts[parts.length - 1]);
        row.pt = parts.length > 2 ? parts[0] : (idx + 1);
        if (parts.length === 5) {
          row.lat = parts[1];
          row.lon = parts[2];
        }
      } else if (!isNaN(parseFloat(parts[parts.length - 1]))) {
        // Only one numeric-looking column at end → treat as h
        row.h = parseFloat(parts[parts.length - 1]);
        row.pt = parts.length > 1 ? parts[0] : (idx + 1);
      } else {
        row.error = 'Cannot parse row ' + (idx + 1);
        errors.push(row.error);
      }

      // Apply N
      var N = useGlobalN ? gN : (Number.isFinite(row.N) ? row.N : NaN);
      if (!Number.isFinite(N)) {
        row.error = 'Missing N for row ' + (idx + 1) + '. Enable "Use global N" or provide N column.';
        errors.push(row.error);
      } else if (Number.isFinite(row.h)) {
        row.N = N;
        row.H = row.h - N;
      }

      _batchRows.push(row);
    });

    if (errors.length > 0 && _batchRows.every(function (r) { return !Number.isFinite(r.H); })) {
      errEl.textContent = errors[0];
      errEl.style.display = 'block';
      return;
    }

    renderBatchTable(prec);
  };

  function renderBatchTable(prec) {
    var tbody = document.getElementById('ht-batch-tbody');
    tbody.innerHTML = '';

    _batchRows.forEach(function (row) {
      var tr = document.createElement('tr');
      if (row.error) tr.style.color = 'var(--danger)';
      [
        row.pt,
        row.lat || '—',
        row.lon || '—',
        Number.isFinite(row.h) ? row.h.toFixed(prec) : '—',
        Number.isFinite(row.N) ? row.N.toFixed(prec) : '—',
        Number.isFinite(row.H) ? row.H.toFixed(prec) : (row.error || '—'),
      ].forEach(function (cell) {
        var td = document.createElement('td');
        td.textContent = cell;
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });

    document.getElementById('ht-batch-table-wrap').style.display = 'block';
  }

  window.exportBatchCSV = function () {
    if (!_batchRows.length) return;
    var prec = parseInt(document.getElementById('ht-batch-prec').value, 10) || 4;
    var header = 'Pt,Latitude,Longitude,h_ellipsoidal(m),N_geoid(m),H_orthometric(m)\n';
    var rows = _batchRows.map(function (row) {
      return [
        row.pt,
        row.lat || '',
        row.lon || '',
        Number.isFinite(row.h) ? row.h.toFixed(prec) : '',
        Number.isFinite(row.N) ? row.N.toFixed(prec) : '',
        Number.isFinite(row.H) ? row.H.toFixed(prec) : (row.error || ''),
      ].join(',');
    }).join('\n');

    var blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'orthometric_heights.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  // -------------------------------------------------------
  // File import for batch
  // -------------------------------------------------------
  window.importBatchFile = function () {
    document.getElementById('ht-batch-file').click();
  };

  document.addEventListener('DOMContentLoaded', function () {
    var fileInput = document.getElementById('ht-batch-file');
    if (fileInput) {
      fileInput.addEventListener('change', function () {
        var file = this.files[0];
        if (!file) return;
        var reader = new FileReader();
        reader.onload = function (e) {
          document.getElementById('ht-batch-input').value = (e.target.result || '').trim();
        };
        reader.readAsText(file);
        this.value = '';
      });
    }

    // Toggle global-N input visibility
    var chk = document.getElementById('ht-batch-use-global');
    if (chk) {
      chk.addEventListener('change', function () {
        document.getElementById('ht-global-n-wrap').style.display = this.checked ? 'block' : 'none';
      });
    }
  });
})();
