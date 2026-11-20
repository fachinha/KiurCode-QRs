import { INITIAL_DATA } from './seed-data.js';

// Fallback state when running in Cloudflare without D1 bound yet
let memoryState = null;

function getMemoryState() {
  if (!memoryState) {
    memoryState = JSON.parse(JSON.stringify(INITIAL_DATA));
  }
  return memoryState;
}

export function sanitizeUrl(rawUrl) {
  if (!rawUrl) return '';
  // Remove invisible unicode characters (like \u2060 word joiner, zero-width spaces) and newlines
  return String(rawUrl)
    .replace(/[\u200B-\u200D\uFEFF\u2060\r\n]+/g, '')
    .trim();
}

export function sanitizeText(rawText) {
  if (!rawText) return '';
  return String(rawText)
    .replace(/[\u200B-\u200D\uFEFF\u2060\r\n]+/g, ' ')
    .trim();
}

export function getArgentinaTimeParts(nowMs = Date.now()) {
  // Format in America/Argentina/Buenos_Aires (UTC-3)
  const arOffsetMs = -3 * 60 * 60 * 1000;
  const arDate = new Date(nowMs + arOffsetMs);
  const yyyy = arDate.getUTCFullYear();
  const mm = String(arDate.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(arDate.getUTCDate()).padStart(2, '0');
  const HH = String(arDate.getUTCHours()).padStart(2, '0');
  const MM = String(arDate.getUTCMinutes()).padStart(2, '0');
  const SS = String(arDate.getUTCSeconds()).padStart(2, '0');

  return {
    timestamp: nowMs,
    date: `${yyyy}-${mm}-${dd}`,
    dateTime: `${dd}/${mm}/${yyyy} ${HH}:${MM}`,
    rawDate: `${yyyy}-${mm}-${dd} ${HH}:${MM}:${SS}`
  };
}

let d1Initialized = false;

export async function ensureD1Initialized(db) {
  if (!db || d1Initialized) return;

  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)`),
    db.prepare(`CREATE TABLE IF NOT EXISTS qrs (key TEXT PRIMARY KEY, url TEXT DEFAULT '', place TEXT DEFAULT '', active INTEGER DEFAULT 1, updated_at TEXT DEFAULT CURRENT_TIMESTAMP)`),
    db.prepare(`CREATE TABLE IF NOT EXISTS hits (id INTEGER PRIMARY KEY AUTOINCREMENT, qr_key TEXT NOT NULL, url TEXT DEFAULT '', timestamp INTEGER NOT NULL, date TEXT NOT NULL, date_time TEXT NOT NULL)`),
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_hits_qr_key ON hits(qr_key)`),
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_hits_timestamp ON hits(timestamp)`)
  ]);

  const countRow = await db.prepare(`SELECT COUNT(*) as total FROM qrs`).first();
  if (!countRow || Number(countRow.total) === 0) {
    await seedD1Database(db);
  }

  d1Initialized = true;
}

export async function seedD1Database(db) {
  const statements = [];
  statements.push(
    db.prepare(`INSERT OR REPLACE INTO settings (key, value) VALUES ('basePage', ?)`).bind(INITIAL_DATA.settings.basePage)
  );

  for (const qr of INITIAL_DATA.qrs) {
    statements.push(
      db.prepare(`INSERT OR REPLACE INTO qrs (key, url, place, active) VALUES (?, ?, ?, ?)`)
        .bind(qr.key, sanitizeUrl(qr.url), sanitizeText(qr.place), qr.active ?? 1)
    );
  }

  // Insert in chunks of 50 to respect D1 batch limits
  for (let i = 0; i < statements.length; i += 50) {
    await db.batch(statements.slice(i, i + 50));
  }

  const hitCount = await db.prepare(`SELECT COUNT(*) as total FROM hits`).first();
  if (!hitCount || Number(hitCount.total) === 0) {
    const hitStatements = INITIAL_DATA.hits.map(h =>
      db.prepare(`INSERT INTO hits (qr_key, url, timestamp, date, date_time) VALUES (?, ?, ?, ?, ?)`)
        .bind(h.key, sanitizeUrl(h.url), h.timestamp, h.date, h.dateTime)
    );
    for (let i = 0; i < hitStatements.length; i += 50) {
      await db.batch(hitStatements.slice(i, i + 50));
    }
  }
}

export async function getAllData(env) {
  const db = env?.DB;
  if (db) {
    await ensureD1Initialized(db);
    const [settingsRes, qrsRes, hitsRes] = await db.batch([
      db.prepare(`SELECT key, value FROM settings`),
      db.prepare(`SELECT key, url, place, active FROM qrs ORDER BY key ASC`),
      db.prepare(`SELECT id, qr_key as key, url, timestamp, date, date_time as dateTime FROM hits ORDER BY timestamp ASC, id ASC`)
    ]);

    const settings = { basePage: INITIAL_DATA.settings.basePage };
    for (const row of (settingsRes.results || [])) {
      settings[row.key] = row.value;
    }

    return {
      storageMode: 'cloudflare-d1',
      settings,
      qrs: qrsRes.results || [],
      hits: hitsRes.results || []
    };
  }

  const state = getMemoryState();
  return {
    storageMode: 'memory',
    settings: state.settings,
    qrs: state.qrs,
    hits: state.hits
  };
}

export async function resolveAndRecordHit(env, rawKey, waitUntil) {
  const key = sanitizeText(rawKey);
  if (!key) return { found: false, url: '' };

  const timeParts = getArgentinaTimeParts();
  const db = env?.DB;

  if (db) {
    await ensureD1Initialized(db);
    const qr = await db.prepare(`SELECT key, url, place, active FROM qrs WHERE key = ?`).bind(key).first();
    if (!qr) {
      return { found: false, url: '' };
    }

    const targetUrl = sanitizeUrl(qr.url);
    const recordPromise = db
      .prepare(`INSERT INTO hits (qr_key, url, timestamp, date, date_time) VALUES (?, ?, ?, ?, ?)`)
      .bind(key, targetUrl, timeParts.timestamp, timeParts.date, timeParts.dateTime)
      .run();

    if (typeof waitUntil === 'function') {
      waitUntil(recordPromise);
    } else {
      await recordPromise;
    }

    return {
      found: true,
      key: qr.key,
      url: targetUrl,
      place: qr.place || ''
    };
  }

  // Fallback memory mode
  const state = getMemoryState();
  const qr = state.qrs.find(item => item.key === key);
  if (!qr) {
    return { found: false, url: '' };
  }

  const targetUrl = sanitizeUrl(qr.url);
  const nextId = state.hits.length > 0 ? Math.max(...state.hits.map(h => h.id || 0)) + 1 : 1;
  state.hits.push({
    id: nextId,
    key,
    url: targetUrl,
    timestamp: timeParts.timestamp,
    date: timeParts.date,
    dateTime: timeParts.dateTime
  });

  return {
    found: true,
    key: qr.key,
    url: targetUrl,
    place: qr.place || ''
  };
}

export async function upsertQR(env, { key, url, place, active = 1 }) {
  const cleanKey = sanitizeText(key);
  const cleanUrl = sanitizeUrl(url);
  const cleanPlace = sanitizeText(place);

  if (!cleanKey) throw new Error('La clave (Key) del QR es obligatoria.');

  const db = env?.DB;
  if (db) {
    await ensureD1Initialized(db);
    await db
      .prepare(`INSERT INTO qrs (key, url, place, active, updated_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
                ON CONFLICT(key) DO UPDATE SET url = excluded.url, place = excluded.place, active = excluded.active, updated_at = CURRENT_TIMESTAMP`)
      .bind(cleanKey, cleanUrl, cleanPlace, active ? 1 : 0)
      .run();
    return { key: cleanKey, url: cleanUrl, place: cleanPlace, active: active ? 1 : 0 };
  }

  const state = getMemoryState();
  const existing = state.qrs.find(q => q.key === cleanKey);
  if (existing) {
    existing.url = cleanUrl;
    existing.place = cleanPlace;
    existing.active = active ? 1 : 0;
  } else {
    state.qrs.push({ key: cleanKey, url: cleanUrl, place: cleanPlace, active: active ? 1 : 0 });
    state.qrs.sort((a, b) => a.key.localeCompare(b.key, undefined, { numeric: true }));
  }
  return { key: cleanKey, url: cleanUrl, place: cleanPlace, active: active ? 1 : 0 };
}

export async function createBatchQRs(env, count = 10) {
  const num = Math.min(Math.max(Number(count) || 10, 1), 200);
  const data = await getAllData(env);

  let maxNum = 0;
  for (const qr of data.qrs) {
    const match = /^QR(\d+)$/i.exec(qr.key);
    if (match) {
      const n = parseInt(match[1], 10);
      if (n > maxNum) maxNum = n;
    }
  }

  const created = [];
  const db = env?.DB;

  if (db) {
    const stmts = [];
    for (let i = 1; i <= num; i++) {
      const nextKey = 'QR' + String(maxNum + i).padStart(6, '0');
      created.push({ key: nextKey, url: '', place: '', active: 1 });
      stmts.push(
        db.prepare(`INSERT OR IGNORE INTO qrs (key, url, place, active) VALUES (?, '', '', 1)`).bind(nextKey)
      );
    }
    for (let i = 0; i < stmts.length; i += 50) {
      await db.batch(stmts.slice(i, i + 50));
    }
    return created;
  }

  const state = getMemoryState();
  for (let i = 1; i <= num; i++) {
    const nextKey = 'QR' + String(maxNum + i).padStart(6, '0');
    const newQr = { key: nextKey, url: '', place: '', active: 1 };
    state.qrs.push(newQr);
    created.push(newQr);
  }
  return created;
}

export async function deleteQR(env, key) {
  const cleanKey = sanitizeText(key);
  const db = env?.DB;
  if (db) {
    await ensureD1Initialized(db);
    await db.prepare(`DELETE FROM qrs WHERE key = ?`).bind(cleanKey).run();
    return { deleted: cleanKey };
  }
  const state = getMemoryState();
  state.qrs = state.qrs.filter(q => q.key !== cleanKey);
  return { deleted: cleanKey };
}

export async function deleteHit(env, id) {
  const numId = Number(id);
  const db = env?.DB;
  if (db) {
    await ensureD1Initialized(db);
    await db.prepare(`DELETE FROM hits WHERE id = ?`).bind(numId).run();
    return { deletedId: numId };
  }
  const state = getMemoryState();
  state.hits = state.hits.filter(h => Number(h.id) !== numId);
  return { deletedId: numId };
}

export async function updateSettings(env, newSettings) {
  const db = env?.DB;
  if (db) {
    await ensureD1Initialized(db);
    const stmts = [];
    for (const [k, v] of Object.entries(newSettings)) {
      stmts.push(
        db.prepare(`INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)`).bind(k, String(v ?? '').trim())
      );
    }
    if (stmts.length > 0) await db.batch(stmts);
    return newSettings;
  }

  const state = getMemoryState();
  Object.assign(state.settings, newSettings);
  return state.settings;
}

export async function bulkImportQRs(env, qrsList) {
  if (!Array.isArray(qrsList)) throw new Error('Lista de QRs inválida');
  const db = env?.DB;
  if (db) {
    await ensureD1Initialized(db);
    const stmts = qrsList
      .filter(q => q && q.key)
      .map(q =>
        db.prepare(`INSERT INTO qrs (key, url, place, active, updated_at) VALUES (?, ?, ?, 1, CURRENT_TIMESTAMP)
                    ON CONFLICT(key) DO UPDATE SET url = excluded.url, place = excluded.place, updated_at = CURRENT_TIMESTAMP`)
          .bind(sanitizeText(q.key), sanitizeUrl(q.url), sanitizeText(q.place))
      );
    for (let i = 0; i < stmts.length; i += 50) {
      await db.batch(stmts.slice(i, i + 50));
    }
    return { imported: stmts.length };
  }

  const state = getMemoryState();
  let count = 0;
  for (const q of qrsList) {
    if (!q || !q.key) continue;
    await upsertQR(env, q);
    count++;
  }
  return { imported: count };
}
