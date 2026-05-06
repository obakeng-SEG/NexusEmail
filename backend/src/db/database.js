const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const Database = require('better-sqlite3');

const dataDir = process.env.NEXUSEMAIL_DATA_DIR || path.join(__dirname, '../../data');
fs.mkdirSync(dataDir, { recursive: true });

const legacyJsonFile = path.join(dataDir, 'nexusemail.json');
const sqliteFile = process.env.NEXUSEMAIL_DB_PATH || path.join(dataDir, 'nexusemail.sqlite');
const connection = new Database(sqliteFile);
connection.pragma('journal_mode = WAL');
connection.pragma('foreign_keys = ON');

function now() { return new Date().toISOString(); }
function nextId(prefix) { return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`; }
function json(value) { return JSON.stringify(value ?? null); }
function parse(value, fallback = null) { try { return value == null ? fallback : JSON.parse(value); } catch { return fallback; } }

function initSchema() {
  connection.exec(`
    CREATE TABLE IF NOT EXISTS organizations (
      id TEXT PRIMARY KEY,
      slug TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      whmcs_client_id TEXT UNIQUE,
      whmcs_service_id TEXT,
      plan TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT
    );
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      email TEXT UNIQUE NOT NULL,
      name TEXT,
      role TEXT NOT NULL DEFAULT 'member',
      platform_role TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      password_hash TEXT,
      whmcs_client_id TEXT,
      whmcs_contact_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT
    );
    CREATE TABLE IF NOT EXISTS domains (
      id INTEGER PRIMARY KEY,
      org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      data TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS scans (
      id INTEGER PRIMARY KEY,
      org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      domain_id INTEGER NOT NULL,
      data TEXT NOT NULL,
      scanned_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS integrations (
      id INTEGER PRIMARY KEY,
      org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      data TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT
    );
    CREATE TABLE IF NOT EXISTS settings (
      org_id TEXT NOT NULL DEFAULT 'global',
      key TEXT NOT NULL,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      PRIMARY KEY (org_id, key)
    );
    CREATE TABLE IF NOT EXISTS reports (
      id INTEGER PRIMARY KEY,
      org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      domain_id INTEGER,
      data TEXT NOT NULL,
      generated_at TEXT NOT NULL
    );
  `);
}

function hydrateDomain(row) { return row ? { ...parse(row.data, {}), id: row.id, org_id: row.org_id, created_at: row.created_at, updated_at: row.updated_at } : null; }
function hydrateScan(row) { return row ? { ...parse(row.data, {}), id: row.id, org_id: row.org_id, domain_id: row.domain_id, scanned_at: row.scanned_at } : null; }
function hydrateIntegration(row) { return row ? { ...parse(row.data, {}), id: row.id, org_id: row.org_id, created_at: row.created_at, updated_at: row.updated_at } : null; }
function hydrateReport(row) { return row ? { ...parse(row.data, {}), id: row.id, org_id: row.org_id, domain_id: row.domain_id, generated_at: row.generated_at } : null; }

function getOrganizations() { return connection.prepare('SELECT * FROM organizations ORDER BY created_at DESC').all(); }
function getOrganization(idOrSlug) { return connection.prepare('SELECT * FROM organizations WHERE id = ? OR slug = ?').get(idOrSlug, idOrSlug); }
function getOrganizationByWhmcsClient(clientId) { return connection.prepare('SELECT * FROM organizations WHERE whmcs_client_id = ?').get(String(clientId)); }
function addOrganization(org) {
  const created = { id: org.id || nextId('org'), slug: org.slug, name: org.name, status: org.status || 'active', whmcs_client_id: org.whmcs_client_id || null, whmcs_service_id: org.whmcs_service_id || null, plan: org.plan || null, created_at: org.created_at || now(), updated_at: org.updated_at || now() };
  connection.prepare(`INSERT INTO organizations (id, slug, name, status, whmcs_client_id, whmcs_service_id, plan, created_at, updated_at) VALUES (@id, @slug, @name, @status, @whmcs_client_id, @whmcs_service_id, @plan, @created_at, @updated_at)`).run(created);
  return created;
}
function updateOrganization(id, updates) {
  const existing = getOrganization(id);
  if (!existing) return null;
  const next = { ...existing, ...updates, updated_at: now() };
  connection.prepare(`UPDATE organizations SET slug=@slug, name=@name, status=@status, whmcs_client_id=@whmcs_client_id, whmcs_service_id=@whmcs_service_id, plan=@plan, updated_at=@updated_at WHERE id=@id`).run(next);
  return getOrganization(id);
}

function getUsers(orgId) { return orgId ? connection.prepare('SELECT * FROM users WHERE org_id = ? ORDER BY created_at DESC').all(orgId) : connection.prepare('SELECT * FROM users ORDER BY created_at DESC').all(); }
function getUser(id) { return connection.prepare('SELECT * FROM users WHERE id = ?').get(id); }
function getUserByEmail(email) { return connection.prepare('SELECT * FROM users WHERE lower(email) = lower(?)').get(email || ''); }
function addUser(user) {
  const created = { id: user.id || nextId('usr'), org_id: user.org_id, email: user.email, name: user.name || user.email, role: user.role || 'member', platform_role: user.platform_role || null, status: user.status || 'active', password_hash: user.password_hash || null, whmcs_client_id: user.whmcs_client_id || null, whmcs_contact_id: user.whmcs_contact_id || null, created_at: user.created_at || now(), updated_at: user.updated_at || now() };
  connection.prepare(`INSERT INTO users (id, org_id, email, name, role, platform_role, status, password_hash, whmcs_client_id, whmcs_contact_id, created_at, updated_at) VALUES (@id, @org_id, @email, @name, @role, @platform_role, @status, @password_hash, @whmcs_client_id, @whmcs_contact_id, @created_at, @updated_at)`).run(created);
  return created;
}

function getDomains(orgId) { return connection.prepare(orgId ? 'SELECT * FROM domains WHERE org_id = ? ORDER BY created_at DESC' : 'SELECT * FROM domains ORDER BY created_at DESC').all(...(orgId ? [orgId] : [])).map(hydrateDomain); }
function addDomain(domain, orgId) {
  const created = { ...domain, id: domain.id || Date.now(), org_id: orgId || domain.org_id || 'segbytes', created_at: domain.created_at || now(), updated_at: now() };
  connection.prepare('INSERT INTO domains (id, org_id, data, created_at, updated_at) VALUES (?, ?, ?, ?, ?)').run(created.id, created.org_id, json(created), created.created_at, created.updated_at);
  return created;
}
function getDomain(id, orgId) { return hydrateDomain(connection.prepare(orgId ? 'SELECT * FROM domains WHERE id = ? AND org_id = ?' : 'SELECT * FROM domains WHERE id = ?').get(...(orgId ? [id, orgId] : [id]))); }
function updateDomain(id, updates, orgId) {
  const existing = getDomain(id, orgId);
  if (!existing) return null;
  const next = { ...existing, ...updates, updated_at: now() };
  connection.prepare('UPDATE domains SET data = ?, updated_at = ? WHERE id = ? AND org_id = ?').run(json(next), next.updated_at, id, next.org_id);
  return next;
}
function deleteDomain(id, orgId) {
  connection.prepare(orgId ? 'DELETE FROM scans WHERE domain_id = ? AND org_id = ?' : 'DELETE FROM scans WHERE domain_id = ?').run(...(orgId ? [id, orgId] : [id]));
  connection.prepare(orgId ? 'DELETE FROM domains WHERE id = ? AND org_id = ?' : 'DELETE FROM domains WHERE id = ?').run(...(orgId ? [id, orgId] : [id]));
}

function addScan(scan, orgId) {
  const created = { ...scan, id: scan.id || Date.now(), org_id: orgId || scan.org_id || 'segbytes', scanned_at: scan.scanned_at || now() };
  connection.prepare('INSERT INTO scans (id, org_id, domain_id, data, scanned_at) VALUES (?, ?, ?, ?, ?)').run(created.id, created.org_id, created.domain_id, json(created), created.scanned_at);
  return created;
}
function getScans(domainId, limit = 30, orgId) { return connection.prepare(orgId ? 'SELECT * FROM scans WHERE domain_id = ? AND org_id = ? ORDER BY scanned_at DESC LIMIT ?' : 'SELECT * FROM scans WHERE domain_id = ? ORDER BY scanned_at DESC LIMIT ?').all(...(orgId ? [domainId, orgId, limit] : [domainId, limit])).map(hydrateScan).reverse(); }
function getLatestScan(domainId, orgId) { return hydrateScan(connection.prepare(orgId ? 'SELECT * FROM scans WHERE domain_id = ? AND org_id = ? ORDER BY scanned_at DESC LIMIT 1' : 'SELECT * FROM scans WHERE domain_id = ? ORDER BY scanned_at DESC LIMIT 1').get(...(orgId ? [domainId, orgId] : [domainId]))); }

function getIntegrations(orgId) { return connection.prepare(orgId ? 'SELECT * FROM integrations WHERE org_id = ? ORDER BY created_at DESC' : 'SELECT * FROM integrations ORDER BY created_at DESC').all(...(orgId ? [orgId] : [])).map(hydrateIntegration); }
function addIntegration(integration, orgId) {
  const created = { ...integration, id: integration.id || Date.now(), org_id: orgId || integration.org_id || 'segbytes', created_at: integration.created_at || now(), updated_at: now() };
  connection.prepare('INSERT INTO integrations (id, org_id, data, created_at, updated_at) VALUES (?, ?, ?, ?, ?)').run(created.id, created.org_id, json(created), created.created_at, created.updated_at);
  return created;
}
function deleteIntegration(id, orgId) { connection.prepare(orgId ? 'DELETE FROM integrations WHERE id = ? AND org_id = ?' : 'DELETE FROM integrations WHERE id = ?').run(...(orgId ? [id, orgId] : [id])); }

function getSetting(key, orgId) { const row = connection.prepare('SELECT value FROM settings WHERE org_id = ? AND key = ?').get(orgId || 'global', key) || connection.prepare('SELECT value FROM settings WHERE org_id = ? AND key = ?').get('global', key); return row?.value; }
function setSetting(key, value, orgId) { connection.prepare('INSERT INTO settings (org_id, key, value, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(org_id, key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at').run(orgId || 'global', key, String(value), now()); }

function addReport(report, orgId) {
  const created = { ...report, id: report.id || Date.now(), org_id: orgId || report.org_id || 'segbytes', generated_at: report.generated_at || now() };
  connection.prepare('INSERT INTO reports (id, org_id, domain_id, data, generated_at) VALUES (?, ?, ?, ?, ?)').run(created.id, created.org_id, created.domain_id || null, json(created), created.generated_at);
  return created;
}
function getReports(domainId, orgId) { return connection.prepare(domainId ? 'SELECT * FROM reports WHERE domain_id = ? AND (? IS NULL OR org_id = ?) ORDER BY generated_at DESC' : 'SELECT * FROM reports WHERE (? IS NULL OR org_id = ?) ORDER BY generated_at DESC').all(...(domainId ? [domainId, orgId || null, orgId || null] : [orgId || null, orgId || null])).map(hydrateReport); }

function migrateLegacyJsonIfNeeded() {
  const hasOrgs = connection.prepare('SELECT COUNT(*) AS count FROM organizations').get().count > 0;
  if (hasOrgs || !fs.existsSync(legacyJsonFile)) return;
  const legacy = parse(fs.readFileSync(legacyJsonFile, 'utf8'), {});
  const tx = connection.transaction(() => {
    for (const org of legacy.organizations || []) addOrganization(org);
    if (!getOrganization('segbytes')) addOrganization({ id: 'segbytes', slug: 'segbytes', name: 'Segbytes Solutions' });
    for (const user of legacy.users || []) addUser(user);
    for (const domain of legacy.domains || []) addDomain(domain, domain.org_id || 'segbytes');
    for (const scan of legacy.scans || []) addScan(scan, scan.org_id || 'segbytes');
    for (const integration of legacy.integrations || []) addIntegration(integration, integration.org_id || 'segbytes');
    for (const [key, value] of Object.entries(legacy.settings || {})) {
      const idx = key.indexOf(':');
      if (idx > 0 && key.startsWith('org_')) setSetting(key.slice(idx + 1), value, key.slice(0, idx));
      else setSetting(key, value);
    }
    for (const report of legacy.reports || []) addReport(report, report.org_id || 'segbytes');
  });
  tx();
}

initSchema();
migrateLegacyJsonIfNeeded();

if (!getOrganization('segbytes')) addOrganization({ id: 'segbytes', slug: 'segbytes', name: 'Segbytes Solutions' });
if (!getUserByEmail(process.env.SEED_ADMIN_EMAIL || 'admin@segbytes.co.za')) {
  if (process.env.NODE_ENV === 'production' && !process.env.SEED_ADMIN_PASSWORD) throw new Error('Set SEED_ADMIN_PASSWORD before first production boot');
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(process.env.SEED_ADMIN_PASSWORD || 'ChangeMe123!', salt, 120000, 32, 'sha256').toString('hex');
  addUser({ org_id: 'segbytes', email: process.env.SEED_ADMIN_EMAIL || 'admin@segbytes.co.za', name: 'Segbytes Admin', role: 'owner', platform_role: 'platform_admin', password_hash: `${salt}:${hash}` });
}
if (!getSetting('notify_scan_completed')) setSetting('notify_scan_completed', '1');
if (!getSetting('notify_critical_alerts')) setSetting('notify_critical_alerts', '1');
if (!getSetting('notify_weekly_report')) setSetting('notify_weekly_report', '0');

function saveDB() { connection.pragma('wal_checkpoint(PASSIVE)'); }

module.exports = { getDomains, addDomain, getDomain, updateDomain, deleteDomain, addScan, getScans, getLatestScan, getIntegrations, addIntegration, deleteIntegration, getSetting, setSetting, addReport, getReports, getOrganizations, getOrganization, getOrganizationByWhmcsClient, addOrganization, updateOrganization, getUsers, getUser, getUserByEmail, addUser, saveDB };
