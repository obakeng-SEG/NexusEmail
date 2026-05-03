const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { NotificationService } = require('../services/notifications');

const notificationService = new NotificationService();

// Get all config (without sensitive data)
router.get('/config', (req, res) => {
  const credentials = db.getSetting('provider_credentials') || '{}';
  const parsed = JSON.parse(credentials);
  
  // Mask sensitive values for response
  const masked = {};
  for (const [provider, config] of Object.entries(parsed)) {
    masked[provider] = {};
    for (const [key, value] of Object.entries(config)) {
      if (value && typeof value === 'string' && value.length > 4) {
        masked[provider][key] = value.substring(0, 4) + '****';
      } else {
        masked[provider][key] = value;
      }
    }
  }

  res.json({
    smtp_config: db.getSetting('smtp_config') ? JSON.parse(db.getSetting('smtp_config')) : null,
    provider_credentials: masked,
    notifications: {
      scan_completed: db.getSetting('notify_scan_completed') === '1',
      critical_alerts: db.getSetting('notify_critical_alerts') === '1',
      weekly_report: db.getSetting('notify_weekly_report') === '1'
    },
    scan_schedule: {
      enabled: db.getSetting('scan_schedule_enabled') === 'true',
      cron: db.getSetting('scan_schedule_cron') || '0 2 * * *'
    },
    auto_remediation: db.getSetting('auto_remediation_enabled') === 'true'
  });
});

// Save provider credentials
router.post('/providers/credentials', (req, res) => {
  const { provider, credentials } = req.body;
  
  if (!provider || !credentials) {
    return res.status(400).json({ error: 'Provider and credentials required' });
  }

  const allCredentials = JSON.parse(db.getSetting('provider_credentials') || '{}');
  allCredentials[provider.toLowerCase()] = credentials;
  db.setSetting('provider_credentials', JSON.stringify(allCredentials));
  
  res.json({ success: true });
});

// Delete provider credentials
router.delete('/providers/credentials/:provider', (req, res) => {
  const provider = req.params.provider.toLowerCase();
  const allCredentials = JSON.parse(db.getSetting('provider_credentials') || '{}');
  delete allCredentials[provider];
  db.setSetting('provider_credentials', JSON.stringify(allCredentials));
  
  res.json({ success: true });
});

// Get provider credentials (for internal use)
function getProviderCredentials(provider) {
  const all = JSON.parse(db.getSetting('provider_credentials') || '{}');
  return all[provider.toLowerCase()] || null;
}

// SMTP Config
router.post('/smtp', (req, res) => {
  const { host, port, secure, user, pass, from } = req.body;
  const config = { host, port: parseInt(port) || 587, secure: !!secure, user, from };
  db.setSetting('smtp_config', JSON.stringify(config));
  
  notificationService.configureSMTP({ 
    host, 
    port: parseInt(port) || 587, 
    secure: !!secure, 
    auth: user && pass ? { user, pass } : undefined, 
    from 
  });
  res.json({ success: true });
});

// Test SMTP
router.post('/smtp/test', async (req, res) => {
  const result = await notificationService.testConnection();
  res.json(result);
});

// Notifications preferences
router.post('/notifications', (req, res) => {
  const { scan_completed, critical_alerts, weekly_report } = req.body;
  if (scan_completed !== undefined) db.setSetting('notify_scan_completed', scan_completed ? '1' : '0');
  if (critical_alerts !== undefined) db.setSetting('notify_critical_alerts', critical_alerts ? '1' : '0');
  if (weekly_report !== undefined) db.setSetting('notify_weekly_report', weekly_report ? '1' : '0');
  res.json({ success: true });
});

// Scan schedule
router.post('/schedule', (req, res) => {
  const { enabled, cron } = req.body;
  if (enabled !== undefined) db.setSetting('scan_schedule_enabled', enabled.toString());
  if (cron) db.setSetting('scan_schedule_cron', cron);
  res.json({ success: true });
});

// Auto remediation
router.post('/auto-remediation', (req, res) => {
  const { enabled } = req.body;
  db.setSetting('auto_remediation_enabled', enabled ? 'true' : 'false');
  res.json({ success: true });
});

// Integrations
router.get('/integrations', (req, res) => res.json(db.getIntegrations()));
router.post('/integrations', (req, res) => {
  const { provider, config, name } = req.body;
  const integration = db.addIntegration({ provider, name: name || provider, config: config || {}, status: 'active' });
  res.json({ success: true, ...integration });
});
router.delete('/integrations/:id', (req, res) => {
  db.deleteIntegration(parseInt(req.params.id));
  res.json({ success: true });
});

// Bulk delete domains
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
  const credentials = JSON.parse(db.getSetting('provider_credentials') || '{}');
  res.json({
    status: 'healthy',
    domains: domains.length,
    integrations: integrations.length,
    providers_configured: Object.keys(credentials).length,
    timestamp: new Date().toISOString()
  });
});

module.exports = { router, getProviderCredentials };