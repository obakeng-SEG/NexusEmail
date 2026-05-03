const express = require('express');
const router = express.Router();
const { getDatabase } = require('../db/database');
const { providers } = require('../services/providers');
const { NotificationService } = require('../services/notifications');
const { ReportService } = require('../services/reports');

const notificationService = new NotificationService();
let reportService;

// Initialize report service after DB is ready
setTimeout(() => {
  reportService = new ReportService(getDatabase());
}, 100);

// ===== INTEGRATIONS =====

// Get all integrations
router.get('/integrations', (req, res) => {
  const db = getDatabase();
  const integrations = db.prepare('SELECT * FROM integrations').all();
  res.json(integrations);
});

// Add integration
router.post('/integrations', (req, res) => {
  const db = getDatabase();
  const { provider, config, name } = req.body;
  
  // Create provider instance to test
  const ProviderClass = providers[provider.toLowerCase()];
  if (!ProviderClass) {
    return res.status(400).json({ error: 'Unknown provider' });
  }
  
  const providerInstance = new ProviderClass(config);
  
  // Test connection
  providerInstance.testConnection().then(testResult => {
    const stmt = db.prepare(`
      INSERT INTO integrations (provider, name, config, status) VALUES (?, ?, ?, ?)
    `);
    const result = stmt.run(provider, name || provider, JSON.stringify(config), testResult.success ? 'active' : 'error');
    
    res.json({ 
      success: true, 
      id: result.lastInsertRowid, 
      provider, 
      test: testResult 
    });
  }).catch(error => {
    res.status(500).json({ error: error.message });
  });
});

// Update integration
router.patch('/integrations/:id', (req, res) => {
  const db = getDatabase();
  const { config, name } = req.body;
  
  if (config) {
    db.prepare('UPDATE integrations SET config = ? WHERE id = ?').run(JSON.stringify(config), req.params.id);
  }
  if (name) {
    db.prepare('UPDATE integrations SET name = ? WHERE id = ?').run(name, req.params.id);
  }
  
  res.json({ success: true });
});

// Delete integration
router.delete('/integrations/:id', (req, res) => {
  const db = getDatabase();
  db.prepare('DELETE FROM integrations WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// Test integration
router.post('/integrations/:id/test', async (req, res) => {
  const db = getDatabase();
  const integration = db.prepare('SELECT * FROM integrations WHERE id = ?').get(req.params.id);
  
  if (!integration) {
    return res.status(404).json({ error: 'Integration not found' });
  }
  
  const ProviderClass = providers[integration.provider.toLowerCase()];
  if (!ProviderClass) {
    return res.status(400).json({ error: 'Provider not found' });
  }
  
  const config = JSON.parse(integration.config || '{}');
  const provider = new ProviderClass(config);
  
  try {
    const result = await provider.testConnection();
    res.json(result);
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// ===== NOTIFICATIONS =====

// Get notification settings
router.get('/notifications', (req, res) => {
  const db = getDatabase();
  const settings = db.prepare("SELECT * FROM settings WHERE key LIKE 'notify_%'").all();
  
  const result = {};
  settings.forEach(s => result[s.key] = s.value);
  res.json(result);
});

// Configure SMTP
router.post('/notifications/smtp', (req, res) => {
  const { host, port, secure, user, pass, from } = req.body;
  
  const config = {
    host,
    port: parseInt(port),
    secure: secure === true,
    auth: user && pass ? { user, pass } : undefined,
    from,
    tls: { rejectUnauthorized: false }
  };
  
  notificationService.configure(config);
  
  // Save to settings
  const db = getDatabase();
  const stmt = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
  stmt.run('smtp_config', JSON.stringify({ host, port, secure, user, from }));
  
  res.json({ success: true });
});

// Test SMTP
router.post('/notifications/smtp/test', async (req, res) => {
  const result = await notificationService.testConnection();
  res.json(result);
});

// Update notification preferences
router.post('/notifications/preferences', (req, res) => {
  const db = getDatabase();
  const { scan_completed, critical_alerts, weekly_report } = req.body;
  
  const stmt = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
  
  if (scan_completed !== undefined) stmt.run('notify_scan_completed', scan_completed ? '1' : '0');
  if (critical_alerts !== undefined) stmt.run('notify_critical_alerts', critical_alerts ? '1' : '0');
  if (weekly_report !== undefined) stmt.run('notify_weekly_report', weekly_report ? '1' : '0');
  
  res.json({ success: true });
});

// ===== REPORTS =====

// Generate report for domain
router.post('/reports/:domainId', async (req, res) => {
  if (!reportService) {
    return res.status(500).json({ error: 'Report service not initialized' });
  }
  
  try {
    const result = await reportService.generateReport(req.params.domainId, req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Export all domains as CSV
router.post('/reports/export', async (req, res) => {
  if (!reportService) {
    return res.status(500).json({ error: 'Report service not initialized' });
  }
  
  try {
    const result = await reportService.exportCSV(req.body.domain_ids || []);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get reports list
router.get('/reports', (req, res) => {
  if (!reportService) {
    return res.json([]);
  }
  
  const reports = reportService.getReports(req.query.domain_id);
  res.json(reports);
});

// ===== BULK OPERATIONS =====

// Bulk delete domains
router.post('/bulk-delete', (req, res) => {
  const db = getDatabase();
  const { domain_ids } = req.body;
  
  if (!Array.isArray(domain_ids) || domain_ids.length === 0) {
    return res.status(400).json({ error: 'No domains specified' });
  }
  
  const placeholders = domain_ids.map(() => '?').join(',');
  db.prepare(`DELETE FROM scans WHERE domain_id IN (${placeholders})`).run(...domain_ids);
  db.prepare(`DELETE FROM domains WHERE id IN (${placeholders})`).run(...domain_ids);
  
  res.json({ success: true, deleted: domain_ids.length });
});

// Bulk update settings
router.post('/bulk-update', (req, res) => {
  const db = getDatabase();
  const { domain_ids, updates } = req.body;
  
  if (!Array.isArray(domain_ids) || !updates) {
    return res.status(400).json({ error: 'Invalid request' });
  }
  
  const { provider, auto_fix, notify_email } = updates;
  
  if (provider) {
    const placeholders = domain_ids.map(() => '?').join(',');
    db.prepare(`UPDATE domains SET provider = ? WHERE id IN (${placeholders})`).run(provider, ...domain_ids);
  }
  
  if (auto_fix !== undefined) {
    const placeholders = domain_ids.map(() => '?').join(',');
    db.prepare(`UPDATE domains SET auto_fix = ? WHERE id IN (${placeholders})`).run(auto_fix ? 1 : 0, ...domain_ids);
  }
  
  if (notify_email !== undefined) {
    const placeholders = domain_ids.map(() => '?').join(',');
    db.prepare(`UPDATE domains SET notify_email = ? WHERE id IN (${placeholders})`).run(notify_email, ...domain_ids);
  }
  
  res.json({ success: true, updated: domain_ids.length });
});

// ===== HEALTH CHECK =====
router.get('/health', (req, res) => {
  const db = getDatabase();
  
  const domainCount = db.prepare('SELECT COUNT(*) as count FROM domains').get().count;
  const scanCount = db.prepare('SELECT COUNT(*) as count FROM scans').get().count;
  const integrationCount = db.prepare("SELECT COUNT(*) as count FROM integrations WHERE status = 'active'").get().count;
  
  res.json({
    status: 'healthy',
    domains: domainCount,
    scans: scanCount,
    integrations: integrationCount,
    timestamp: new Date().toISOString()
  });
});

module.exports = router;