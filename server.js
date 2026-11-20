const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 8788;
const DB_PATH = path.join(__dirname, 'data', 'db.json');
const PUBLIC_DIR = path.join(__dirname, 'public');

function loadDb() {
  if (!fs.existsSync(DB_PATH)) {
    require('./scripts/generate-seed.js');
  }
  return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
}

function saveDb(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
}

function sanitizeUrl(rawUrl) {
  if (!rawUrl) return '';
  return String(rawUrl).replace(/[\u200B-\u200D\uFEFF\u2060\r\n]+/g, '').trim();
}

function sanitizeText(rawText) {
  if (!rawText) return '';
  return String(rawText).replace(/[\u200B-\u200D\uFEFF\u2060\r\n]+/g, ' ').trim();
}

function getArgentinaTimeParts(nowMs = Date.now()) {
  const arOffsetMs = -3 * 60 * 60 * 1000;
  const arDate = new Date(nowMs + arOffsetMs);
  const yyyy = arDate.getUTCFullYear();
  const mm = String(arDate.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(arDate.getUTCDate()).padStart(2, '0');
  const HH = String(arDate.getUTCHours()).padStart(2, '0');
  const MM = String(arDate.getUTCMinutes()).padStart(2, '0');
  return {
    timestamp: nowMs,
    date: `${yyyy}-${mm}-${dd}`,
    dateTime: `${dd}/${mm}/${yyyy} ${HH}:${MM}`
  };
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res, status, payload) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'no-store'
  });
  res.end(JSON.stringify(payload));
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    return res.end();
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;

  // 1. Check QR Redirection (?k=QR000011 or /r/QR000011 or /api/redirect?k=QR000011)
  let qrKey = null;
  if (pathname.startsWith('/r/')) {
    qrKey = decodeURIComponent(pathname.slice(3)).trim();
  } else if ((pathname === '/' || pathname === '/index.html' || pathname === '/api/redirect') && parsedUrl.searchParams.has('k') && parsedUrl.searchParams.get('dashboard') !== '1') {
    qrKey = parsedUrl.searchParams.get('k').trim();
  }

  if (qrKey && req.method === 'GET') {
    const db = loadDb();
    const qr = db.qrs.find(q => q.key === qrKey);
    const timeParts = getArgentinaTimeParts();
    const targetUrl = qr ? sanitizeUrl(qr.url) : '';

    if (qr) {
      const nextId = db.hits.length > 0 ? Math.max(...db.hits.map(h => h.id || 0)) + 1 : 1;
      db.hits.push({
        id: nextId,
        key: qrKey,
        url: targetUrl,
        timestamp: timeParts.timestamp,
        date: timeParts.date,
        dateTime: timeParts.dateTime
      });
      saveDb(db);
    }

    const wantsText =
      parsedUrl.searchParams.get('format') === 'text' ||
      pathname === '/api/redirect' ||
      req.headers['sec-fetch-mode'] === 'cors' ||
      (req.headers['accept'] || '').includes('text/plain');

    if (wantsText) {
      res.writeHead(200, {
        'Content-Type': 'text/plain; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-store'
      });
      return res.end(targetUrl);
    }

    if (qr && targetUrl) {
      res.writeHead(302, {
        'Location': targetUrl,
        'Cache-Control': 'no-store, no-cache, must-revalidate'
      });
      return res.end();
    }

    res.writeHead(302, {
      'Location': `/?scanned=${encodeURIComponent(qrKey)}&status=${qr ? 'unassigned' : 'notfound'}`,
      'Cache-Control': 'no-store'
    });
    return res.end();
  }

  // 2. API Routes
  if (pathname === '/api/data' && req.method === 'GET') {
    const db = loadDb();
    return sendJson(res, 200, {
      storageMode: 'local-json',
      settings: db.settings,
      qrs: db.qrs,
      hits: db.hits
    });
  }

  if (pathname === '/api/qrs' && req.method === 'PUT') {
    const body = await readJsonBody(req);
    const db = loadDb();
    const cleanKey = sanitizeText(body.key);
    const cleanUrl = sanitizeUrl(body.url);
    const cleanPlace = sanitizeText(body.place);

    let qr = db.qrs.find(q => q.key === cleanKey);
    if (qr) {
      qr.url = cleanUrl;
      qr.place = cleanPlace;
      qr.active = 1;
    } else {
      qr = { key: cleanKey, url: cleanUrl, place: cleanPlace, active: 1 };
      db.qrs.push(qr);
      db.qrs.sort((a, b) => a.key.localeCompare(b.key, undefined, { numeric: true }));
    }
    saveDb(db);
    return sendJson(res, 200, { ok: true, qr });
  }

  if (pathname === '/api/qrs' && req.method === 'POST') {
    const body = await readJsonBody(req);
    const db = loadDb();
    const action = body.action || 'add';

    if (action === 'batch') {
      const count = Math.min(Math.max(Number(body.count) || 10, 1), 200);
      let maxNum = 0;
      for (const q of db.qrs) {
        const m = /^QR(\d+)$/i.exec(q.key);
        if (m && parseInt(m[1], 10) > maxNum) maxNum = parseInt(m[1], 10);
      }
      const created = [];
      for (let i = 1; i <= count; i++) {
        const nextKey = 'QR' + String(maxNum + i).padStart(6, '0');
        const newQr = { key: nextKey, url: '', place: '', active: 1 };
        db.qrs.push(newQr);
        created.push(newQr);
      }
      saveDb(db);
      return sendJson(res, 200, { ok: true, created });
    }

    if (action === 'import') {
      const list = Array.isArray(body.qrs) ? body.qrs : [];
      let imported = 0;
      for (const item of list) {
        if (!item || !item.key) continue;
        const k = sanitizeText(item.key);
        const u = sanitizeUrl(item.url);
        const p = sanitizeText(item.place);
        const existing = db.qrs.find(q => q.key === k);
        if (existing) {
          existing.url = u;
          existing.place = p;
        } else {
          db.qrs.push({ key: k, url: u, place: p, active: 1 });
        }
        imported++;
      }
      db.qrs.sort((a, b) => a.key.localeCompare(b.key, undefined, { numeric: true }));
      saveDb(db);
      return sendJson(res, 200, { ok: true, imported });
    }

    return sendJson(res, 400, { ok: false, error: 'Acción desconocida' });
  }

  if (pathname === '/api/hits' && req.method === 'DELETE') {
    const id = parsedUrl.searchParams.get('id');
    const db = loadDb();
    db.hits = db.hits.filter(h => String(h.id) !== String(id));
    saveDb(db);
    return sendJson(res, 200, { ok: true, deletedId: id });
  }

  if (pathname === '/api/settings' && req.method === 'PUT') {
    const body = await readJsonBody(req);
    const db = loadDb();
    Object.assign(db.settings, body);
    saveDb(db);
    return sendJson(res, 200, { ok: true, settings: db.settings });
  }

  // 3. Static Files from public/
  let filePath = path.join(PUBLIC_DIR, pathname === '/' ? 'index.html' : pathname);
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    return res.end('Forbidden');
  }

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
    return fs.createReadStream(filePath).pipe(res);
  }

  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('Not found');
});

server.listen(PORT, () => {
  console.log(`KiurCode QRs corriendo en http://localhost:${PORT}`);
});
