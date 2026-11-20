/* ==========================================================================
   KIURCODE QRs — Frontend Application Logic (Spreadsheet + Analytics + QR Engine)
   ========================================================================== */

let STATE = {
  storageMode: 'cloudflare-d1',
  settings: {
    basePage: 'https://fachinha.github.io/QRdinamicos/'
  },
  qrs: [],
  hits: [],
  activeView: 'sheet',
  sheetFilter: 'ALL',
  searchQuery: '',
  selectedModalQrKey: null
};

let hitsChartInstance = null;
let rankingChartInstance = null;

// ==========================================================================
// INITIALIZATION
// ==========================================================================

document.addEventListener('DOMContentLoaded', async () => {
  setupNavigation();
  setupSpreadsheetEvents();
  setupAnalyticsEvents();
  setupModalEvents();
  setupScrollReveal();

  await fetchAndRenderAll();

  // Check if URL has ?scanned=QR0000XX from an unassigned physical QR scan
  const params = new URLSearchParams(window.location.search);
  const scannedKey = params.get('scanned');
  if (scannedKey) {
    setTimeout(() => {
      jumpToQrRow(scannedKey, true);
    }, 250);
  }
});

async function fetchAndRenderAll() {
  setSaveStatus('saving', 'Sincronizando...');
  try {
    const res = await fetch('/api/data', { cache: 'no-store' });
    if (!res.ok) throw new Error('Error HTTP ' + res.status);
    const data = await res.json();

    STATE.storageMode = data.storageMode || 'cloudflare-d1';
    STATE.settings = data.settings || { basePage: 'https://fachinha.github.io/QRdinamicos/' };
    STATE.qrs = Array.isArray(data.qrs) ? data.qrs : [];
    STATE.hits = Array.isArray(data.hits) ? data.hits : [];

    document.getElementById('basePageInput').value = STATE.settings.basePage || 'https://fachinha.github.io/QRdinamicos/';

    updateTopCountersAndBanner();
    renderSpreadsheet();
    populateAnalyticsQRFilter();
    updateAnalyticsDashboard();
    renderPrintableGridAndSnippet();

    const modeLabel = STATE.storageMode === 'cloudflare-d1' ? 'Sincronizado (D1)' : 'Sincronizado';
    setSaveStatus('saved', modeLabel);
  } catch (err) {
    console.error('Error cargando datos:', err);
    setSaveStatus('saving', 'Modo sin conexión');
  }
}

function setSaveStatus(state, text) {
  const box = document.getElementById('saveStatusIndicator');
  const label = document.getElementById('saveStatusText');
  if (!box || !label) return;
  box.className = 'save-status ' + state;
  label.textContent = text;
}

// ==========================================================================
// NAVIGATION & LIVE BANNER
// ==========================================================================

function setupNavigation() {
  document.querySelectorAll('.nav-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      const view = btn.getAttribute('data-view');
      switchView(view);
    });
  });

  document.getElementById('btnRefreshLive').addEventListener('click', () => {
    fetchAndRenderAll();
  });

  document.getElementById('btnJumpLastScanned').addEventListener('click', () => {
    const latest = getLatestHit();
    if (latest) {
      jumpToQrRow(latest.key, true);
    }
  });

  document.getElementById('fabQuickLocate').addEventListener('click', () => {
    // Find first free QR (or recently scanned unassigned QR)
    const hitCounts = getHitCountMap();
    const scannedEmpty = STATE.qrs.find(q => !q.url && (hitCounts[q.key] || 0) > 0);
    const firstFree = scannedEmpty || STATE.qrs.find(q => !q.url);
    if (firstFree) {
      jumpToQrRow(firstFree.key, true);
    }
  });
}

function switchView(viewName) {
  STATE.activeView = viewName;
  document.querySelectorAll('.nav-tab').forEach(t => {
    t.classList.toggle('active', t.getAttribute('data-view') === viewName);
  });
  document.querySelectorAll('.view-section').forEach(s => {
    s.classList.toggle('active', s.id === `view-${viewName}`);
  });

  if (viewName === 'analytics') {
    updateAnalyticsDashboard();
  } else if (viewName === 'print') {
    renderPrintableGridAndSnippet();
  }
}

function getLatestHit() {
  if (!STATE.hits || STATE.hits.length === 0) return null;
  let latest = STATE.hits[0];
  for (const h of STATE.hits) {
    if (h.timestamp >= latest.timestamp) {
      latest = h;
    }
  }
  return latest;
}

function getHitCountMap() {
  const map = {};
  for (const h of STATE.hits) {
    map[h.key] = (map[h.key] || 0) + 1;
  }
  return map;
}

function getLastHitMap() {
  const map = {};
  for (const h of STATE.hits) {
    if (!map[h.key] || h.timestamp >= map[h.key].timestamp) {
      map[h.key] = h;
    }
  }
  return map;
}

function updateTopCountersAndBanner() {
  const hitCounts = getHitCountMap();
  const totalQrs = STATE.qrs.length;
  const assignedQrs = STATE.qrs.filter(q => Boolean(q.url && q.url.trim())).length;
  const freeQrs = totalQrs - assignedQrs;
  const scannedEmptyQrs = STATE.qrs.filter(q => !(q.url && q.url.trim()) && (hitCounts[q.key] || 0) > 0).length;

  document.getElementById('navQrCount').textContent = totalQrs;
  document.getElementById('navHitsCount').textContent = STATE.hits.length.toLocaleString('es-AR');

  document.getElementById('countAll').textContent = totalQrs;
  document.getElementById('countAssigned').textContent = assignedQrs;
  document.getElementById('countFree').textContent = freeQrs;
  document.getElementById('countScannedEmpty').textContent = scannedEmptyQrs;

  const latest = getLatestHit();
  const keyEl = document.getElementById('lastScannedKey');
  const detailsEl = document.getElementById('lastScannedDetails');

  if (!latest) {
    keyEl.textContent = 'Sin escaneos';
    detailsEl.textContent = '';
  } else {
    const qrObj = STATE.qrs.find(q => q.key === latest.key);
    const placeLabel = qrObj && qrObj.place ? qrObj.place : (qrObj && qrObj.url ? 'Asignado sin nombre' : 'Libre / Sin link asignado');
    keyEl.textContent = latest.key;
    detailsEl.textContent = `${placeLabel} • ${latest.dateTime}`;
  }
}

// ==========================================================================
// VIEW 1: SPREADSHEET (PLANILLA CONFIG)
// ==========================================================================

function buildQrEncodedUrl(key) {
  let base = (STATE.settings.basePage || window.location.origin + '/').trim();
  if (!base.includes('?')) {
    if (!base.endsWith('/')) base += '/';
    return `${base}?k=${encodeURIComponent(key)}`;
  }
  return `${base}&k=${encodeURIComponent(key)}`;
}

function detectPlatform(url) {
  const u = String(url || '').toLowerCase();
  if (!u) return { type: 'empty', label: 'Libre' };
  if (u.includes('google.com') || u.includes('goo.gl')) return { type: 'google', label: 'Google' };
  if (u.includes('instagram.com')) return { type: 'instagram', label: 'Instagram' };
  if (u.includes('wa.me') || u.includes('whatsapp.com')) return { type: 'whatsapp', label: 'WhatsApp' };
  if (u.includes('facebook.com')) return { type: 'facebook', label: 'Facebook' };
  return { type: 'web', label: 'Web' };
}

function getPlatformSvg(type) {
  if (type === 'google') {
    return `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>`;
  }
  if (type === 'instagram') {
    return `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>`;
  }
  if (type === 'whatsapp') {
    return `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>`;
  }
  if (type === 'facebook') {
    return `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg>`;
  }
  return `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>`;
}

function renderSpreadsheet() {
  const tbody = document.getElementById('sheetTableBody');
  if (!tbody) return;

  const hitCounts = getHitCountMap();
  const lastHits = getLastHitMap();
  const query = STATE.searchQuery.trim().toLowerCase();

  const filtered = STATE.qrs.filter(qr => {
    const hasUrl = Boolean(qr.url && qr.url.trim());
    const hits = hitCounts[qr.key] || 0;

    if (STATE.sheetFilter === 'ASSIGNED' && !hasUrl) return false;
    if (STATE.sheetFilter === 'FREE' && hasUrl) return false;
    if (STATE.sheetFilter === 'SCANNED_EMPTY' && (hasUrl || hits === 0)) return false;

    if (query) {
      const hay = `${qr.key} ${qr.place || ''} ${qr.url || ''}`.toLowerCase();
      if (!hay.includes(query)) return false;
    }
    return true;
  });

  tbody.innerHTML = '';

  if (filtered.length === 0) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td colspan="7" style="text-align:center; padding:36px; color:var(--text-muted);">No se encontraron filas para el filtro actual.</td>`;
    tbody.appendChild(tr);
    return;
  }

  filtered.forEach((qr, idx) => {
    const hasUrl = Boolean(qr.url && qr.url.trim());
    const hits = hitCounts[qr.key] || 0;
    const lastHitObj = lastHits[qr.key];
    const platform = detectPlatform(qr.url);

    const tr = document.createElement('tr');
    tr.setAttribute('data-qr-key', qr.key);
    if (hasUrl) {
      tr.classList.add('row-assigned');
    } else if (hits > 0) {
      tr.classList.add('row-unassigned-hit');
    }

    const dotClass = hasUrl ? 'active' : (hits > 0 ? 'alert' : '');
    const dotTitle = hasUrl ? 'QR activo con link asignado' : (hits > 0 ? 'Escaneado recientemente pero sin link asignado' : 'QR libre disponible');

    tr.innerHTML = `
      <td class="cell-idx">${idx + 1}</td>
      <td>
        <div class="cell-key-inner">
          <span class="key-badge">${escapeHtml(qr.key)}</span>
          <span class="status-dot ${dotClass}" title="${dotTitle}"></span>
        </div>
      </td>
      <td style="text-align:center;">
        <button type="button" class="cell-qr-btn" data-action="open-qr" data-key="${escapeHtml(qr.key)}" title="Ver y descargar código QR de ${escapeHtml(qr.key)}">
          <canvas id="mini-qr-${escapeHtml(qr.key)}" width="76" height="76"></canvas>
        </button>
      </td>
      <td>
        <div class="cell-input-wrap">
          <span class="platform-badge ${platform.type}" id="badge-${escapeHtml(qr.key)}" title="${platform.label}">
            ${getPlatformSvg(platform.type)}
          </span>
          <input
            type="text"
            class="sheet-input url-input"
            data-field="url"
            data-key="${escapeHtml(qr.key)}"
            data-row="${idx}"
            value="${escapeHtml(qr.url || '')}"
            placeholder="Pegá acá el link (Google Review, WhatsApp, Instagram...)"
          >
        </div>
      </td>
      <td>
        <div class="cell-input-wrap">
          <input
            type="text"
            class="sheet-input place-input"
            data-field="place"
            data-key="${escapeHtml(qr.key)}"
            data-row="${idx}"
            value="${escapeHtml(qr.place || '')}"
            placeholder="Nombre del local / cliente..."
          >
        </div>
      </td>
      <td style="text-align:center;">
        <button
          type="button"
          class="hits-pill-btn ${hits > 0 ? 'has-hits' : ''}"
          data-action="view-hits"
          data-key="${escapeHtml(qr.key)}"
          title="${lastHitObj ? 'Último escaneo: ' + lastHitObj.dateTime : 'Sin escaneos registrados'}"
        >
          <span>${hits.toLocaleString('es-AR')}</span>
          <span style="font-size:11px; font-weight:500;">hits</span>
        </button>
      </td>
      <td>
        <div class="row-actions">
          <button type="button" class="btn btn-icon" data-action="copy-qr-url" data-key="${escapeHtml(qr.key)}" title="Copiar link del QR (${escapeHtml(qr.key)})">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
          </button>
          <a href="/?k=${encodeURIComponent(qr.key)}" target="_blank" rel="noopener" class="btn btn-icon" title="Simular escaneo y probar redirección">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
              <polyline points="15 3 21 3 21 9"></polyline>
              <line x1="10" y1="14" x2="21" y2="3"></line>
            </svg>
          </a>
          <button type="button" class="btn btn-icon" data-action="clear-row" data-key="${escapeHtml(qr.key)}" title="Vaciar destino y liberar este QR">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
          </button>
        </div>
      </td>
    `;

    tbody.appendChild(tr);

    // Render mini QR canvas
    const canvas = document.getElementById(`mini-qr-${qr.key}`);
    if (canvas && window.QRious) {
      new QRious({
        element: canvas,
        value: buildQrEncodedUrl(qr.key),
        size: 76,
        level: 'M',
        background: '#FFFFFF',
        foreground: '#111827'
      });
    }
  });
}

function setupSpreadsheetEvents() {
  const tbody = document.getElementById('sheetTableBody');

  // Auto-save on blur or Enter/Arrow navigation
  tbody.addEventListener('change', async (e) => {
    const input = e.target.closest('.sheet-input');
    if (!input) return;
    await saveRowFromInput(input);
  });

  tbody.addEventListener('keydown', async (e) => {
    const input = e.target.closest('.sheet-input');
    if (!input) return;

    const rowIdx = Number(input.getAttribute('data-row'));
    const field = input.getAttribute('data-field');

    if (e.key === 'Enter' || e.key === 'ArrowDown') {
      e.preventDefault();
      await saveRowFromInput(input);
      const nextInput = tbody.querySelector(`.sheet-input[data-field="${field}"][data-row="${rowIdx + 1}"]`);
      if (nextInput) {
        nextInput.focus();
        nextInput.select();
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      await saveRowFromInput(input);
      const prevInput = tbody.querySelector(`.sheet-input[data-field="${field}"][data-row="${rowIdx - 1}"]`);
      if (prevInput) {
        prevInput.focus();
        prevInput.select();
      }
    }
  });

  // Action buttons inside table rows
  tbody.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;

    const action = btn.getAttribute('data-action');
    const key = btn.getAttribute('data-key');

    if (action === 'open-qr') {
      openQrModal(key);
    } else if (action === 'view-hits') {
      switchView('analytics');
      const select = document.getElementById('qrFilter');
      select.value = key;
      updateAnalyticsDashboard();
    } else if (action === 'copy-qr-url') {
      const urlToCopy = buildQrEncodedUrl(key);
      await navigator.clipboard.writeText(urlToCopy);
      setSaveStatus('saved', `Link de ${key} copiado`);
    } else if (action === 'clear-row') {
      const qr = STATE.qrs.find(q => q.key === key);
      if (!qr || (!qr.url && !qr.place)) return;
      if (confirm(`¿Liberar el código ${key}? Se borrarán el link de destino y el nombre del local (el código ${key} seguirá disponible en la planilla).`)) {
        await updateQrRecord(key, '', '');
        renderSpreadsheet();
        updateTopCountersAndBanner();
      }
    }
  });

  // Search box
  document.getElementById('sheetSearchInput').addEventListener('input', (e) => {
    STATE.searchQuery = e.target.value;
    renderSpreadsheet();
  });

  // Filter buttons
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      STATE.sheetFilter = btn.getAttribute('data-filter');
      renderSpreadsheet();
    });
  });

  // Base Page Settings
  const baseInput = document.getElementById('basePageInput');
  baseInput.addEventListener('change', async () => {
    await saveBasePage(baseInput.value);
  });

  document.getElementById('btnUseCurrentDomain').addEventListener('click', async () => {
    const url = window.location.origin + '/';
    baseInput.value = url;
    await saveBasePage(url);
  });

  document.getElementById('btnUseGithubDomain').addEventListener('click', async () => {
    const url = 'https://fachinha.github.io/QRdinamicos/';
    baseInput.value = url;
    await saveBasePage(url);
  });

  // +10 QRs button
  document.getElementById('btnAddBatchQrs').addEventListener('click', async () => {
    setSaveStatus('saving', 'Generando +10 QRs...');
    try {
      const res = await fetch('/api/qrs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'batch', count: 10 })
      });
      const data = await res.json();
      if (data.ok) {
        await fetchAndRenderAll();
        setSaveStatus('saved', '+10 QRs agregados');
      }
    } catch (err) {
      console.error(err);
    }
  });

  // Export CSV button
  document.getElementById('btnExportCsv').addEventListener('click', exportToCsv);
}

async function saveBasePage(newBasePage) {
  const clean = newBasePage.trim() || 'https://fachinha.github.io/QRdinamicos/';
  STATE.settings.basePage = clean;
  setSaveStatus('saving', 'Guardando Base Page...');
  await fetch('/api/settings', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ basePage: clean })
  });
  renderSpreadsheet();
  renderPrintableGridAndSnippet();
  setSaveStatus('saved', 'Base Page actualizada');
}

async function saveRowFromInput(input) {
  const key = input.getAttribute('data-key');
  const tr = input.closest('tr');
  if (!key || !tr) return;

  const urlInput = tr.querySelector('.sheet-input[data-field="url"]');
  const placeInput = tr.querySelector('.sheet-input[data-field="place"]');

  const newUrl = urlInput ? urlInput.value.trim() : '';
  const newPlace = placeInput ? placeInput.value.trim() : '';

  const existing = STATE.qrs.find(q => q.key === key);
  if (existing && existing.url === newUrl && existing.place === newPlace) {
    return; // No changes
  }

  await updateQrRecord(key, newUrl, newPlace);

  input.classList.remove('just-saved');
  void input.offsetWidth;
  input.classList.add('just-saved');

  // Update platform badge icon dynamically
  const badge = document.getElementById(`badge-${key}`);
  if (badge) {
    const platform = detectPlatform(newUrl);
    badge.className = `platform-badge ${platform.type}`;
    badge.innerHTML = getPlatformSvg(platform.type);
  }

  tr.classList.toggle('row-assigned', Boolean(newUrl));
  const dot = tr.querySelector('.status-dot');
  if (dot) {
    dot.className = 'status-dot ' + (newUrl ? 'active' : '');
  }

  updateTopCountersAndBanner();
  populateAnalyticsQRFilter();
}

async function updateQrRecord(key, url, place) {
  setSaveStatus('saving', `Guardando ${key}...`);
  try {
    const res = await fetch('/api/qrs', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, url, place, active: 1 })
    });
    const data = await res.json();
    if (data.ok && data.qr) {
      const idx = STATE.qrs.findIndex(q => q.key === key);
      if (idx !== -1) {
        STATE.qrs[idx] = data.qr;
      } else {
        STATE.qrs.push(data.qr);
      }
      setSaveStatus('saved', `${key} guardado`);
    }
  } catch (err) {
    console.error('Error guardando fila:', err);
    setSaveStatus('saving', 'Error al guardar');
  }
}

function jumpToQrRow(key, focusUrl = true) {
  switchView('sheet');
  // Ensure filter shows this row
  STATE.sheetFilter = 'ALL';
  STATE.searchQuery = '';
  document.getElementById('sheetSearchInput').value = '';
  document.querySelectorAll('.filter-btn').forEach(b => {
    b.classList.toggle('active', b.getAttribute('data-filter') === 'ALL');
  });
  renderSpreadsheet();

  const row = document.querySelector(`tr[data-qr-key="${key}"]`);
  if (row) {
    row.scrollIntoView({ behavior: 'smooth', block: 'center' });
    row.classList.remove('row-highlight');
    void row.offsetWidth;
    row.classList.add('row-highlight');

    if (focusUrl) {
      const urlInput = row.querySelector('.sheet-input[data-field="url"]');
      if (urlInput) {
        setTimeout(() => urlInput.focus(), 300);
      }
    }
  }
}

// ==========================================================================
// VIEW 2: ANALYTICS DASHBOARD
// ==========================================================================

function populateAnalyticsQRFilter() {
  const select = document.getElementById('qrFilter');
  if (!select) return;
  const currentVal = select.value || 'ALL';

  select.innerHTML = `<option value="ALL">Todos los QR (${STATE.qrs.length})</option>`;
  STATE.qrs.forEach(qr => {
    const option = document.createElement('option');
    option.value = qr.key;
    const labelPlace = qr.place ? qr.place : (qr.url ? 'Asignado sin nombre' : 'Libre');
    option.textContent = `${labelPlace} — ${qr.key}`;
    select.appendChild(option);
  });

  if ([...select.options].some(o => o.value === currentVal)) {
    select.value = currentVal;
  }
}

function setupAnalyticsEvents() {
  document.getElementById('qrFilter').addEventListener('change', updateAnalyticsDashboard);
  document.getElementById('periodFilter').addEventListener('change', updateAnalyticsDashboard);

  // Ranking table click to edit in spreadsheet
  document.getElementById('analyticsTableBody').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-jump-qr]');
    if (!btn) return;
    jumpToQrRow(btn.getAttribute('data-jump-qr'), true);
  });

  // Delete test hit button
  document.getElementById('recentHitsTableBody').addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-delete-hit]');
    if (!btn) return;
    const hitId = btn.getAttribute('data-delete-hit');
    if (!hitId) return;

    await fetch(`/api/hits?id=${encodeURIComponent(hitId)}`, { method: 'DELETE' });
    STATE.hits = STATE.hits.filter(h => String(h.id) !== String(hitId));
    updateTopCountersAndBanner();
    renderSpreadsheet();
    updateAnalyticsDashboard();
    setSaveStatus('saved', 'Escaneo eliminado');
  });
}

function updateAnalyticsDashboard() {
  const selectedQR = document.getElementById('qrFilter').value;
  const period = document.getElementById('periodFilter').value;
  const now = Date.now();

  const filteredHits = STATE.hits.filter(hit => {
    if (selectedQR !== 'ALL' && hit.key !== selectedQR) return false;
    if (period === 'ALL') return true;
    const days = Number(period);
    const limit = now - days * 24 * 60 * 60 * 1000;
    return hit.timestamp >= limit;
  });

  // KPI 1: Local
  if (selectedQR === 'ALL') {
    document.getElementById('kpiPlace').textContent = 'Todos';
  } else {
    const qr = STATE.qrs.find(item => item.key === selectedQR);
    document.getElementById('kpiPlace').textContent = (qr && qr.place) ? qr.place : selectedQR;
  }

  // KPI 2: Total hits
  const total = filteredHits.length;
  document.getElementById('kpiTotalHits').textContent = total.toLocaleString('es-AR');

  // KPI 3: Average daily
  let numberOfDays;
  if (period === 'ALL') {
    if (filteredHits.length === 0) {
      numberOfDays = 1;
    } else {
      const oldest = Math.min(...filteredHits.map(h => h.timestamp));
      numberOfDays = Math.max(1, Math.ceil((now - oldest) / (24 * 60 * 60 * 1000)));
    }
  } else {
    numberOfDays = Number(period);
  }
  document.getElementById('kpiAverageHits').textContent = (total / numberOfDays).toFixed(1);

  // KPI 4: Last hit
  if (filteredHits.length === 0) {
    document.getElementById('kpiLastHit').textContent = '—';
  } else {
    const latestTs = Math.max(...filteredHits.map(h => h.timestamp));
    const latestHit = filteredHits.find(h => h.timestamp === latestTs);
    document.getElementById('kpiLastHit').textContent = latestHit ? latestHit.dateTime : '—';
  }

  // Chart 1: Hits por día
  const daily = {};
  filteredHits.forEach(hit => {
    daily[hit.date] = (daily[hit.date] || 0) + 1;
  });

  let dates = Object.keys(daily).sort();
  if (period !== 'ALL') {
    dates = createDateRange(Number(period));
  }

  const dailyLabels = dates.map(formatDateShort);
  const dailyValues = dates.map(d => daily[d] || 0);

  if (hitsChartInstance) hitsChartInstance.destroy();
  const hitsCtx = document.getElementById('hitsChart');
  if (hitsCtx && window.Chart) {
    hitsChartInstance = new Chart(hitsCtx, {
      type: 'line',
      data: {
        labels: dailyLabels,
        datasets: [{
          label: 'Hits',
          data: dailyValues,
          borderColor: '#7FA231',
          backgroundColor: 'rgba(155, 202, 52, 0.2)',
          borderWidth: 2.5,
          pointBackgroundColor: '#5F7D1F',
          pointRadius: 3,
          tension: 0.32,
          fill: true
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { intersect: false, mode: 'index' },
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true, ticks: { precision: 0 } }
        }
      }
    });
  }

  // Chart 2: Ranking por local (Top 10)
  const ranking = {};
  filteredHits.forEach(hit => {
    const qr = STATE.qrs.find(q => q.key === hit.key);
    const label = (qr && qr.place) ? `${qr.place} (${hit.key})` : hit.key;
    ranking[label] = (ranking[label] || 0) + 1;
  });

  const rankingArray = Object.keys(ranking)
    .map(place => ({ place, hits: ranking[place] }))
    .sort((a, b) => b.hits - a.hits)
    .slice(0, 10);

  if (rankingChartInstance) rankingChartInstance.destroy();
  const rankCtx = document.getElementById('rankingChart');
  if (rankCtx && window.Chart) {
    rankingChartInstance = new Chart(rankCtx, {
      type: 'bar',
      data: {
        labels: rankingArray.map(item => item.place),
        datasets: [{
          label: 'Hits',
          data: rankingArray.map(item => item.hits),
          backgroundColor: '#7FA231',
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y',
        plugins: { legend: { display: false } },
        scales: {
          x: { beginAtZero: true, ticks: { precision: 0 } }
        }
      }
    });
  }

  // Table 1: Rendimiento por QR registrado
  const tbody = document.getElementById('analyticsTableBody');
  tbody.innerHTML = '';

  const tableData = STATE.qrs.map(qr => {
    const qrHits = filteredHits.filter(h => h.key === qr.key);
    let lastHit = null;
    if (qrHits.length > 0) {
      const maxTs = Math.max(...qrHits.map(h => h.timestamp));
      lastHit = qrHits.find(h => h.timestamp === maxTs);
    }
    return {
      key: qr.key,
      place: qr.place || (qr.url ? 'Sin nombre' : 'Libre'),
      url: qr.url || '',
      hits: qrHits.length,
      lastHit: lastHit ? lastHit.dateTime : 'Nunca'
    };
  })
  .filter(item => item.hits > 0 || item.url !== '')
  .sort((a, b) => b.hits - a.hits);

  if (tableData.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:26px; color:var(--text-muted);">No hay escaneos en este período.</td></tr>`;
  } else {
    tableData.forEach(item => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="mono" style="font-weight:700;">${escapeHtml(item.key)}</td>
        <td style="font-weight:600;">${escapeHtml(item.place)}</td>
        <td class="mono" style="font-size:12px; color:var(--text-secondary); max-width:300px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
          ${item.url ? `<a href="${escapeHtml(item.url)}" target="_blank" rel="noopener" style="color:var(--kc-green-base); text-decoration:none;">${escapeHtml(item.url)}</a>` : '<span style="color:#94A3B8;">Sin link asignado</span>'}
        </td>
        <td style="font-weight:800; font-size:15px;">${item.hits.toLocaleString('es-AR')}</td>
        <td>${escapeHtml(item.lastHit)}</td>
        <td>
          <button type="button" class="btn" data-jump-qr="${escapeHtml(item.key)}" style="padding:5px 10px; font-size:12px;">
            Editar
          </button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  // Table 2: Historial reciente de escaneos (Hoja Hits)
  const recentTbody = document.getElementById('recentHitsTableBody');
  recentTbody.innerHTML = '';

  const recentHits = [...filteredHits]
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 50);

  if (recentHits.length === 0) {
    recentTbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:26px; color:var(--text-muted);">No hay escaneos registrados para este filtro.</td></tr>`;
  } else {
    recentHits.forEach(h => {
      const qr = STATE.qrs.find(q => q.key === h.key);
      const placeName = qr && qr.place ? qr.place : '—';
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="mono" style="font-size:12.5px;">${escapeHtml(h.dateTime)}</td>
        <td class="mono" style="font-weight:700;">${escapeHtml(h.key)}</td>
        <td>${escapeHtml(placeName)}</td>
        <td class="mono" style="font-size:12px; color:var(--text-secondary); max-width:320px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
          ${h.url ? escapeHtml(h.url) : '<span style="color:#F59E0B; font-weight:600;">Escaneo de QR sin destino asignado</span>'}
        </td>
        <td>
          <button type="button" class="btn btn-icon" data-delete-hit="${escapeHtml(h.id || '')}" title="Eliminar este registro de escaneo">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </td>
      `;
      recentTbody.appendChild(tr);
    });
  }
}

// ==========================================================================
// VIEW 3: PRINTABLE QR SHEET & GITHUB PAGES BRIDGE SNIPPET
// ==========================================================================

function renderPrintableGridAndSnippet() {
  const originUrl = window.location.origin;
  const snippetEl = document.getElementById('githubSnippetCode');
  if (snippetEl) {
    const snippet = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <title>Redirigiendo...</title>
  <script>
    // Redirección instantánea 100x más rápida vía Cloudflare (reemplaza Google Apps Script)
    const CLOUDFLARE_BASE = "${originUrl}";
    const params = new URLSearchParams(window.location.search);
    const k = params.get("k") || (window.location.href.includes("k=") ? window.location.href.split("k=").pop() : "");
    if (k) {
      window.location.replace(CLOUDFLARE_BASE + "/?k=" + encodeURIComponent(k.trim()));
    }
  </script>
</head>
<body style="background:#0F1419; color:#fff; font-family:sans-serif; text-align:center; padding-top:20vh;">
</body>
</html>`;
    snippetEl.textContent = snippet;
  }

  const grid = document.getElementById('printableQrGrid');
  if (!grid) return;
  grid.innerHTML = '';

  STATE.qrs.forEach(qr => {
    const card = document.createElement('div');
    card.className = 'print-qr-item';
    card.innerHTML = `
      <canvas id="print-qr-${escapeHtml(qr.key)}" width="140" height="140"></canvas>
      <div class="print-qr-key">${escapeHtml(qr.key)}</div>
      <div class="print-qr-place">${escapeHtml(qr.place || 'Disponible')}</div>
    `;
    grid.appendChild(card);

    const canvas = document.getElementById(`print-qr-${qr.key}`);
    if (canvas && window.QRious) {
      new QRious({
        element: canvas,
        value: buildQrEncodedUrl(qr.key),
        size: 140,
        level: 'H',
        background: '#FFFFFF',
        foreground: '#111827'
      });
    }
  });
}

// ==========================================================================
// HIGH-RES QR MODAL & CSV IMPORT/EXPORT
// ==========================================================================

function openQrModal(key) {
  const qr = STATE.qrs.find(q => q.key === key);
  if (!qr) return;

  STATE.selectedModalQrKey = key;
  const encodedUrl = buildQrEncodedUrl(key);

  document.getElementById('modalQrTitle').textContent = qr.key;
  document.getElementById('modalQrPlace').textContent = qr.place || (qr.url ? 'Asignado sin nombre' : 'QR Libre Disponible');
  document.getElementById('modalQrEncodedUrl').textContent = encodedUrl;
  document.getElementById('btnTestQrRedirect').href = `/?k=${encodeURIComponent(qr.key)}`;

  // Draw High-Resolution labeled sticker on canvas (600x680)
  const canvas = document.getElementById('modalQrCanvas');
  const ctx = canvas.getContext('2d');

  const tempCanvas = document.createElement('canvas');
  new QRious({
    element: tempCanvas,
    value: encodedUrl,
    size: 520,
    level: 'H',
    background: '#FFFFFF',
    foreground: '#0F1419'
  });

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.drawImage(tempCanvas, 40, 30, 520, 520);

  // Draw code label at the bottom so physical stickers are always identifiable
  ctx.fillStyle = '#0F1419';
  ctx.font = 'bold 34px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  ctx.fillText(qr.key, canvas.width / 2, 600);

  if (qr.place) {
    ctx.fillStyle = '#4B5563';
    ctx.font = '600 22px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(qr.place.slice(0, 32), canvas.width / 2, 642);
  }

  document.getElementById('qrModal').classList.add('open');
}

function setupModalEvents() {
  const qrModal = document.getElementById('qrModal');
  document.getElementById('btnCloseQrModal').addEventListener('click', () => {
    qrModal.classList.remove('open');
  });
  qrModal.addEventListener('click', (e) => {
    if (e.target === qrModal) qrModal.classList.remove('open');
  });

  document.getElementById('btnDownloadHighResQr').addEventListener('click', () => {
    const key = STATE.selectedModalQrKey || 'QR';
    const canvas = document.getElementById('modalQrCanvas');
    const link = document.createElement('a');
    link.download = `${key}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  });

  document.getElementById('btnCopyQrLink').addEventListener('click', async () => {
    if (!STATE.selectedModalQrKey) return;
    await navigator.clipboard.writeText(buildQrEncodedUrl(STATE.selectedModalQrKey));
    setSaveStatus('saved', 'Link del QR copiado');
  });

  // Copy GitHub Snippet
  document.getElementById('btnCopyGithubCode').addEventListener('click', async () => {
    const code = document.getElementById('githubSnippetCode').textContent;
    await navigator.clipboard.writeText(code);
    setSaveStatus('saved', 'Código index.html copiado');
  });

  // CSV Import Modal
  const importModal = document.getElementById('importModal');
  document.getElementById('btnOpenImportModal').addEventListener('click', () => {
    importModal.classList.add('open');
  });
  document.getElementById('btnCloseImportModal').addEventListener('click', () => {
    importModal.classList.remove('open');
  });
  document.getElementById('btnCancelImport').addEventListener('click', () => {
    importModal.classList.remove('open');
  });

  document.getElementById('btnConfirmImport').addEventListener('click', async () => {
    const raw = document.getElementById('importTextarea').value.trim();
    if (!raw) return;

    const lines = raw.split(/\r?\n/);
    const qrsToImport = [];

    for (const line of lines) {
      // Support TSV (copy-paste directly from Google Sheets) or CSV
      const parts = line.includes('\t') ? line.split('\t') : line.split(',');
      const firstCol = (parts[0] || '').trim();
      if (!firstCol || firstCol.toLowerCase().startsWith('base page') || firstCol.toLowerCase().startsWith('key')) {
        continue;
      }

      // Google Sheets Config layout: A=Key(0), B=QR(1), C=URL(2), D=Empty(3), E=Place(4)
      // Or simple 3-column: Key(0), URL(1), Place(2)
      let url = '';
      let place = '';

      if (parts.length >= 5) {
        url = (parts[2] || '').replace(/^"|"$/g, '').trim();
        place = (parts[4] || '').replace(/^"|"$/g, '').trim();
      } else {
        url = (parts[1] || '').replace(/^"|"$/g, '').trim();
        place = (parts[2] || '').replace(/^"|"$/g, '').trim();
      }

      qrsToImport.push({ key: firstCol, url, place });
    }

    if (qrsToImport.length > 0) {
      setSaveStatus('saving', `Importando ${qrsToImport.length} QRs...`);
      await fetch('/api/qrs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'import', qrs: qrsToImport })
      });
      importModal.classList.remove('open');
      document.getElementById('importTextarea').value = '';
      await fetchAndRenderAll();
      setSaveStatus('saved', `${qrsToImport.length} QRs importados`);
    }
  });
}

function exportToCsv() {
  let csv = `Base Page,${STATE.settings.basePage},,,,\n`;
  csv += `Key (Clave),QR code,Target (Destino),,,\n`;
  for (const qr of STATE.qrs) {
    const safeUrl = (qr.url || '').includes(',') ? `"${qr.url}"` : (qr.url || '');
    const safePlace = (qr.place || '').includes(',') ? `"${qr.place}"` : (qr.place || '');
    csv += `${qr.key},,${safeUrl},,${safePlace},1\n`;
  }

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `KiurCode-QRs-Config-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
}

// ==========================================================================
// HELPERS & SCROLL REVEAL
// ==========================================================================

function createDateRange(days) {
  const result = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    result.push(`${yyyy}-${mm}-${dd}`);
  }
  return result;
}

function formatDateShort(dateString) {
  const parts = String(dateString).split('-');
  if (parts.length < 3) return dateString;
  return `${parts[2]}/${parts[1]}`;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function setupScrollReveal() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

  document.querySelectorAll('.reveal-on-scroll').forEach(el => observer.observe(el));
}
