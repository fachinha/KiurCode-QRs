-- Esquema de Base de Datos Cloudflare D1 para KiurCode QRs
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS qrs (
  key TEXT PRIMARY KEY,
  url TEXT DEFAULT '',
  place TEXT DEFAULT '',
  active INTEGER DEFAULT 1,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS hits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  qr_key TEXT NOT NULL,
  url TEXT DEFAULT '',
  timestamp INTEGER NOT NULL,
  date TEXT NOT NULL,
  date_time TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_hits_qr_key ON hits(qr_key);
CREATE INDEX IF NOT EXISTS idx_hits_timestamp ON hits(timestamp);
