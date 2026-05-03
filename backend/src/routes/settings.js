const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { providers } = require('../services/providers');
const { NotificationService } = require('../services/notifications');

const notificationService = new NotificationService();

// Get all integrations
router.get('/integrations', (req, res) => {
  res.json(db.getIntegrations());
});

// Add integration
router.post('/integrations', (req, res) => {
  const { provider, config, name } = req.body;
  const integration = db.addIntegration({ provider, name: name || provider, config: config || {}, status: 'active' });
  res.json({ success: true, ...integration });
});

// Delete integration
router.delete('/integrations/:id', (req, res) => {
  db.deleteIntegration(parseInt(req.params.id));
  res.json({ success: true });
});

// Notifications settings
router.get('/notifications', (req, res) => {
  res.json({
    notify_scan_completed: db.getSetting('notify_scan_completed') || '0',
    notify_critical_alerts: db.getSetting('notify_critical_alerts') || '0',
    notify_weekly_report: db.getSetting('notify_weekly_report') || '0',
    smtp_config: db.getSetting('smtp_config') || null
  });
});

// Configure SMTP
router.post('/notifications/smtp', (req, res) => {
  const { host, port, secure, user, pass, from } = req.body;
  const config = { host, port, secure, user, from };
  db.setSetting('smtp_config', JSON.stringify(config));
  
  notificationService.configureSMTP({ host, port, secure, auth: user && pass ? { user, pass } : undefined, from });
  res.json({ success: true });
});

// Test SMTP
router.post('/notifications/smtp/test', async (req, res) => {
  const result = await notificationService.testConnection();
  res.json(result);
});

// Update preferences
router.post('/notifications/preferences', (req, res) => {
  const { scan_completed, critical_alerts, weekly_report } = req.body;
  if (scan_completed !== undefined) db.setSetting('notify_scan_completed', scan_completed ? '1' : '0');
  if (critical_alerts !== undefined) db.setSetting('notify_critical_alerts', critical_alerts ? '1' : '0');
  if (weekly_report !== undefined) db.setSetting('notify_weekly_report', weekly_report ? '1' : '0');
  res.json({ success: true });
});

// Bulk delete
router.post('/bulk-delete', (req, res) => {
  const { domain_ids } = req.body;
  if (!Array.isArray(domain_ids)) return res.status(400).json({ error: 'Invalid request' });
  domain_ids.forEach(id => db.deleteDomain(id));
  res.json({ success: true, deleted: domain_ids.length });
});

// Health check
router.get('/health', (req, res) => {
  const domains = db.getDomains();
  const integrations = db.getIntegrations();
  res.json({
    status: 'healthy',
    domains: domains.length,
    integrations: integrations.length,
    timestamp: new Date().toISOString()
  });
});

module.exports = router;