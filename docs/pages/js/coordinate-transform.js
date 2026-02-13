(function() {
  window.updateTransUI = function() {
    const type = document.getElementById('transType').value;
    document.querySelectorAll('.trans-ui').forEach(el => el.style.display = 'none');
    document.getElementById('ui-' + type).style.display = 'block';
    document.getElementById('resBoxTrans').style.display = 'none';
  };

  window.runTransform = function() {
    const type = document.getElementById('transType').value;
    let resHtml = "";
    
    if (type === 'wgsToUtm') {
      const lat = parseFloat(document.getElementById('inp-lat').value);
      const lon = parseFloat(document.getElementById('inp-lon').value);
      if(isNaN(lat) || isNaN(lon)) return alert('Please enter valid values');
      
      const zone = Math.floor((lon + 180) / 6) + 1;
      const utmProj = `+proj=utm +zone=${zone} +ellps=WGS84 +datum=WGS84 +units=m +no_defs`;
      const result = proj4('EPSG:4326', utmProj, [lon, lat]);
      
      resHtml = `
        <div class="res-row"><span>Easting:</span> <span class="res-val">${result[0].toFixed(3)}</span></div>
        <div class="res-row"><span>Northing:</span> <span class="res-val">${result[1].toFixed(3)}</span></div>
        <div class="res-row"><span>UTM Zone:</span> <span class="res-val">${zone}N</span></div>
      `;
    } else {
      const e = parseFloat(document.getElementById('inp-utm-e').value);
      const n = parseFloat(document.getElementById('inp-utm-n').value);
      const z = parseInt(document.getElementById('inp-utm-z').value);
      if(isNaN(e) || isNaN(n) || isNaN(z)) return alert('Please enter valid values');
      
      const utmProj = `+proj=utm +zone=${z} +ellps=WGS84 +datum=WGS84 +units=m +no_defs`;
      const result = proj4(utmProj, 'EPSG:4326', [e, n]);
      
      resHtml = `
        <div class="res-row"><span>Latitude:</span> <span class="res-val">${result[1].toFixed(8)}</span></div>
        <div class="res-row"><span>Longitude:</span> <span class="res-val">${result[0].toFixed(8)}</span></div>
      `;
    }
    
    document.getElementById('res-content-trans').innerHTML = resHtml;
    document.getElementById('resBoxTrans').style.display = 'block';
  };

  window.copyTransformRes = function() {
    const text = document.getElementById('res-content-trans').innerText;
    navigator.clipboard.writeText(text).then(() => alert('Copied!'));
  };
})();
