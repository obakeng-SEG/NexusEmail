const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '../../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbFile = path.join(dataDir, 'nexusemail.json');

let db = {
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

// Save data
function saveDB() {
  fs.writeFileSync(dbFile, JSON.stringify(db, null, 2));
}

// Domain operations
function getDomains() { return db.domains; }
function addDomain(domain) {
  domain.id = Date.now();
  domain.created_at = new Date().toISOString();
  domain.updated_at = new Date().toISOString();
  db.domains.push(domain);
  saveDB();
  return domain;
}
function getDomain(id) { return db.domains.find(d => d.id === id); }
function updateDomain(id, updates) {
  const idx = db.domains.findIndex(d => d.id === id);
  if (idx !== -1) {
    db.domains[idx] = { ...db.domains[idx], ...updates, updated_at: new Date().toISOString() };
    saveDB();
  }
}
function deleteDomain(id) {
  db.domains = db.domains.filter(d => d.id !== id);
  db.scans = db.scans.filter(s => s.domain_id !== id);
  saveDB();
}

// Scan operations
function addScan(scan) {
  scan.id = Date.now();
  scan.scanned_at = new Date().toISOString();
  db.scans.push(scan);
  saveDB();
  return scan;
}
function getScans(domainId, limit = 30) {
  return db.scans.filter(s => s.domain_id === domainId).slice(-limit);
}
function getLatestScan(domainId) {
  const scans = db.scans.filter(s => s.domain_id === domainId).sort((a,b) => new Date(b.scanned_at) - new Date(a.scanned_at));
  return scans[0];
}

// Integration operations
function getIntegrations() { return db.integrations; }
function addIntegration(integration) {
  integration.id = Date.now();
  integration.created_at = new Date().toISOString();
  db.integrations.push(integration);
  saveDB();
  return integration;
}
function deleteIntegration(id) {
  db.integrations = db.integrations.filter(i => i.id !== id);
  saveDB();
}

// Settings
function getSetting(key) { return db.settings[key]; }
function setSetting(key, value) {
  db.settings[key] = value;
  saveDB();
}

// Reports
function addReport(report) {
  report.id = Date.now();
  report.generated_at = new Date().toISOString();
  db.reports.push(report);
  saveDB();
  return report;
}
function getReports(domainId) {
  if (domainId) return db.reports.filter(r => r.domain_id === domainId);
  return db.reports;
}

// Initialize
loadDB();

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
  getReports
};