// ---------- Age Gate (bulletproof: localStorage + cookie fallback + global handlers) ----------
(function () {
  const KEY = 'are_is21';

  function getAccepted() {
    try { return localStorage.getItem(KEY) === 'true'; }
    catch { return document.cookie.split('; ').some(p => p.startsWith(KEY + '=true')); }
  }
  function setAccepted(val) {
    try { localStorage.setItem(KEY, String(val)); }
    catch { document.cookie = `${KEY}=${val}; path=/; max-age=${60*60*24*365}`; }
  }
  function hide() { const g = document.getElementById('age-gate'); if (g) g.style.display = 'none'; }
  function show() { const g = document.getElementById('age-gate'); if (g) g.style.display = 'flex'; }

  // Expose hardwired fallbacks so clicks work even if listeners don’t
  window.ARE_acceptAge  = function () { setAccepted(true); hide(); return false; };
  window.ARE_declineAge = function () { alert('Sorry! This site is for adults 21+.'); location.href = 'https://www.responsibility.org/'; return false; };

  const gate = document.getElementById('age-gate');
  if (!gate) return;

  if (getAccepted()) hide(); else show();

  // Progressive enhancement (nice to have)
  document.getElementById('age-yes')?.addEventListener('click', (e) => { e.preventDefault(); window.ARE_acceptAge(); });
  document.getElementById('age-no') ?.addEventListener('click', (e) => { e.preventDefault(); window.ARE_declineAge(); });
})();



// ---------- Store Locator (Leaflet + JSON fetch) ----------
(function(){
  const mapEl  = document.getElementById('map');
  const listEl = document.getElementById('store-list');
  const input  = document.getElementById('store-search');
  const clear  = document.getElementById('clear-search');
  if(!mapEl || !listEl) return;

  let map, markers = [], allLocations = [];

  function initMap(locations){
    // Reset if re-initializing
    markers.forEach(m => m.remove());
    markers = [];

    if(!map){
      map = L.map('map', { scrollWheelZoom:false }).setView([39.5, -98.35], 4);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom:19, attribution:'© OpenStreetMap'
      }).addTo(map);
    }

    const bounds = L.latLngBounds();
    locations.forEach(loc => {
      const m = L.marker([loc.lat, loc.lng]).addTo(map)
        .bindPopup(`<strong>${loc.name}</strong><br>${loc.address || ''}<br>${loc.city || ''}${loc.url ? `<br><a href="${loc.url}" target="_blank" rel="noopener">Details</a>`:''}`);
      markers.push(m);
      bounds.extend([loc.lat, loc.lng]);
    });

    if(locations.length > 1){ map.fitBounds(bounds.pad(0.3)); }
    else if(locations.length === 1){ map.setView([locations[0].lat, locations[0].lng], 13); }
  }

  function renderList(filtered){
    const arr = filtered ?? allLocations;
    listEl.innerHTML = '';
    if(!arr.length){
      listEl.innerHTML = '<li>No locations found.</li>';
      return;
    }
    arr.forEach((loc, i) => {
      const li = document.createElement('li');
      li.innerHTML = `<div><strong>${loc.name}</strong><br><small>${loc.address || ''}${loc.address ? ', ' : ''}${loc.city || ''}</small></div>${loc.url ? `<div style="margin-top:6px"><a href="${loc.url}" target="_blank" rel="noopener">View store</a></div>`:''}`;
      li.addEventListener('click', () => {
        markers[i]?.openPopup();
        map.setView([loc.lat, loc.lng], 13);
      });
      listEl.appendChild(li);
    });
  }

  function handleSearch(){
    const q = (input?.value || '').toLowerCase().trim();
    const filtered = allLocations.filter(l =>
      (l.name||'').toLowerCase().includes(q) ||
      (l.city||'').toLowerCase().includes(q) ||
      (l.address||'').toLowerCase().includes(q)
    );
    initMap(filtered);
    renderList(filtered);
  }

  // Load data
  fetch('/locations.json', { cache: 'no-store' })
    .then(r => r.ok ? r.json() : Promise.reject(new Error('Failed to load locations.json')))
    .then(data => {
      allLocations = Array.isArray(data) ? data : [];
      if(!allLocations.length){
        listEl.innerHTML = '<li>No locations listed yet. Check back soon.</li>';
        return;
      }
      initMap(allLocations);
      renderList(allLocations);
    })
    .catch(() => {
      listEl.innerHTML = '<li>Could not load store locations.</li>';
    });

  input?.addEventListener('input', handleSearch);
  clear?.addEventListener('click', () => { if(input){ input.value=''; } handleSearch(); });
})();

