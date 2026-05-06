const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const dataDir = process.env.NEXUSEMAIL_DATA_DIR || path.join(__dirname, '../../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbFile = path.join(dataDir, 'nexusemail.json');

let db = {
  organizations: [],
  users: [],
  domains: [],
  scans: [],
  integrations: [],
  settings: {},
  reports: []
};

// Load existing data
function loadDB() {
  try {
    if (fs.existsSync(dbFile)) {
      db = JSON.parse(fs.readFileSync(dbFile, 'utf8'));
    }
  } catch (e) {
    console.log('Starting fresh database');
  }
}

function ensureShape() {
  db.organizations = db.organizations || [];
  db.users = db.users || [];
  db.domains = (db.domains || []).map(d => ({ org_id: d.org_id || 'segbytes', ...d }));
  db.scans = (db.scans || []).map(s => ({ org_id: s.org_id || 'segbytes', ...s }));
  db.integrations = (db.integrations || []).map(i => ({ org_id: i.org_id || 'segbytes', ...i }));
  db.settings = db.settings || {};
  db.reports = (db.reports || []).map(r => ({ org_id: r.org_id || 'segbytes', ...r }));
}

// Save data
function saveDB() {
  fs.writeFileSync(dbFile, JSON.stringify(db, null, 2));
}

function nextId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;
}

// Organization/user operations
function getOrganizations() { return db.organizations; }
function getOrganization(idOrSlug) { return db.organizations.find(o => o.id === idOrSlug || o.slug === idOrSlug); }
function addOrganization(org) {
  const created = { id: org.id || nextId('org'), status: 'active', created_at: new Date().toISOString(), ...org };
  db.organizations.push(created);
  saveDB();
  return created;
}
function getUsers(orgId) { return orgId ? db.users.filter(u => u.org_id === orgId) : db.users; }
function getUser(id) { return db.users.find(u => u.id === id); }
function getUserByEmail(email) { return db.users.find(u => u.email.toLowerCase() === email.toLowerCase()); }
function addUser(user) {
  const created = { id: user.id || nextId('usr'), role: 'member', platform_role: null, status: 'active', created_at: new Date().toISOString(), ...user };
  db.users.push(created);
  saveDB();
  return created;
}

// Domain operations
function getDomains(orgId) { return orgId ? db.domains.filter(d => d.org_id === orgId) : db.domains; }
function addDomain(domain, orgId) {
  domain.id = Date.now();
  domain.org_id = orgId || domain.org_id || 'segbytes';
  domain.created_at = new Date().toISOString();
  domain.updated_at = new Date().toISOString();
  db.domains.push(domain);
  saveDB();
  return domain;
}
function getDomain(id, orgId) { return db.domains.find(d => d.id === id && (!orgId || d.org_id === orgId)); }
function updateDomain(id, updates, orgId) {
  const idx = db.domains.findIndex(d => d.id === id && (!orgId || d.org_id === orgId));
  if (idx !== -1) {
    db.domains[idx] = { ...db.domains[idx], ...updates, updated_at: new Date().toISOString() };
    saveDB();
  }
}
function deleteDomain(id, orgId) {
  db.domains = db.domains.filter(d => !(d.id === id && (!orgId || d.org_id === orgId)));
  db.scans = db.scans.filter(s => !(s.domain_id === id && (!orgId || s.org_id === orgId)));
  saveDB();
}

// Scan operations
function addScan(scan, orgId) {
  scan.id = Date.now();
  scan.org_id = orgId || scan.org_id || 'segbytes';
  scan.scanned_at = new Date().toISOString();
  db.scans.push(scan);
  saveDB();
  return scan;
}
function getScans(domainId, limit = 30, orgId) {
  return db.scans.filter(s => s.domain_id === domainId && (!orgId || s.org_id === orgId)).slice(-limit);
}
function getLatestScan(domainId, orgId) {
  const scans = db.scans.filter(s => s.domain_id === domainId && (!orgId || s.org_id === orgId)).sort((a,b) => new Date(b.scanned_at) - new Date(a.scanned_at));
  return scans[0];
}

// Integration operations
function getIntegrations(orgId) { return orgId ? db.integrations.filter(i => i.org_id === orgId) : db.integrations; }
function addIntegration(integration, orgId) {
  integration.id = Date.now();
  integration.org_id = orgId || integration.org_id || 'segbytes';
  integration.created_at = new Date().toISOString();
  db.integrations.push(integration);
  saveDB();
  return integration;
}
function deleteIntegration(id, orgId) {
  db.integrations = db.integrations.filter(i => !(i.id === id && (!orgId || i.org_id === orgId)));
  saveDB();
}

// Settings
function scopedKey(key, orgId) { return orgId ? `${orgId}:${key}` : key; }
function getSetting(key, orgId) { return db.settings[scopedKey(key, orgId)] ?? db.settings[key]; }
function setSetting(key, value, orgId) {
  db.settings[scopedKey(key, orgId)] = value;
  saveDB();
}

// Reports
function addReport(report, orgId) {
  report.id = Date.now();
  report.org_id = orgId || report.org_id || 'segbytes';
  report.generated_at = new Date().toISOString();
  db.reports.push(report);
  saveDB();
  return report;
}
function getReports(domainId, orgId) {
  if (domainId) return db.reports.filter(r => r.domain_id === domainId && (!orgId || r.org_id === orgId));
  return orgId ? db.reports.filter(r => r.org_id === orgId) : db.reports;
}

// Initialize
loadDB();
ensureShape();

// Seed local Segbytes tenant/admin for hosted development.
if (!getOrganization('segbytes')) {
  addOrganization({ id: 'segbytes', slug: 'segbytes', name: 'Segbytes Solutions' });
}
if (!getUserByEmail(process.env.SEED_ADMIN_EMAIL || 'admin@segbytes.co.za')) {
  if (process.env.NODE_ENV === 'production' && !process.env.SEED_ADMIN_PASSWORD) {
    throw new Error('Set SEED_ADMIN_PASSWORD before first production boot');
  }
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(process.env.SEED_ADMIN_PASSWORD || 'ChangeMe123!', salt, 120000, 32, 'sha256').toString('hex');
  addUser({
    org_id: 'segbytes',
    email: process.env.SEED_ADMIN_EMAIL || 'admin@segbytes.co.za',
    name: 'Segbytes Admin',
    role: 'owner',
    platform_role: 'platform_admin',
    password_hash: `${salt}:${hash}`
  });
}

// Set defaults
if (!db.settings.notify_scan_completed) setSetting('notify_scan_completed', '1');
if (!db.settings.notify_critical_alerts) setSetting('notify_critical_alerts', '1');
if (!db.settings.notify_weekly_report) setSetting('notify_weekly_report', '0');

module.exports = {
  getDomains,
  addDomain,
  getDomain,
  updateDomain,
  deleteDomain,
  addScan,
  getScans,
  getLatestScan,
  getIntegrations,
  addIntegration,
  deleteIntegration,
  getSetting,
  setSetting,
  addReport,
  getReports,
  getOrganizations,
  getOrganization,
  addOrganization,
  getUsers,
  getUser,
  getUserByEmail,
  addUser,
  saveDB
};
