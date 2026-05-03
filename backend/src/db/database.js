const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

let db;

function initDatabase() {
  const dataDir = path.join(__dirname, '../../data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  
  const dbPath = process.env.DB_PATH || path.join(dataDir, 'nexusemail.db');
  db = new Database(dbPath);
  
  // Enable foreign keys
  db.pragma('foreign_keys = ON');
  
  // Create tables
  db.exec(`
    -- Domains table
    CREATE TABLE IF NOT EXISTS domains (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      provider TEXT DEFAULT 'manual',
      provider_config TEXT,
      auto_fix INTEGER DEFAULT 0,
      notify_email TEXT,
      status TEXT DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Scans table
    CREATE TABLE IF NOT EXISTS scans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      domain_id INTEGER NOT NULL,
      score INTEGER,
      spf_status TEXT,
      dkim_status TEXT,
      dmarc_status TEXT,
      spf_record TEXT,
      dkim_selectors TEXT,
      dmarc_record TEXT,
      issues TEXT,
      scanned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (domain_id) REFERENCES domains(id) ON DELETE CASCADE
    );

    -- Integrations table
    CREATE TABLE IF NOT EXISTS integrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      provider TEXT NOT NULL,
      name TEXT,
      config TEXT,
      status TEXT DEFAULT 'inactive',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Settings table
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );

    -- Reports table
    CREATE TABLE IF NOT EXISTS reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      domain_id INTEGER,
      type TEXT,
      filename TEXT,
      generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (domain_id) REFERENCES domains(id) ON DELETE CASCADE
    );

    -- Notifications log table
    CREATE TABLE IF NOT EXISTS notification_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      domain_id INTEGER,
      type TEXT,
      recipient TEXT,
      status TEXT,
      message_id TEXT,
      sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (domain_id) REFERENCES domains(id) ON DELETE SET NULL
    );

    -- Create indexes
    CREATE INDEX IF NOT EXISTS idx_scans_domain ON scans(domain_id);
    CREATE INDEX IF NOT EXISTS idx_scans_date ON scans(scanned_at);
    CREATE INDEX IF NOT EXISTS idx_domains_name ON domains(name);
  `);

  // Insert default settings
  const defaultSettings = [
    ['notify_scan_completed', '1'],
    ['notify_critical_alerts', '1'],
    ['notify_weekly_report', '0'],
    ['scan_schedule', 'daily'],
    ['auto_remediation', '0']
  ];
  
  const insertSetting = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
  for (const [key, value] of defaultSettings) {
    insertSetting.run(key, value);
  }

  console.log('✅ Database initialized with full schema');
  return db;
}

function getDatabase() {
  if (!db) {
    initDatabase();
  }
  return db;
}

module.exports = { initDatabase, getDatabase };