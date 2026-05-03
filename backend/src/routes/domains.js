const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { EmailSecurityAuditor } = require('../services/auditEngine');
const { NotificationService } = require('../services/notifications');

const auditor = new EmailSecurityAuditor();
const notificationService = new NotificationService();

// Get all domains
router.get('/', (req, res) => {
  const domains = db.getDomains();
  const result = domains.map(d => {
    const lastScan = db.getLatestScan(d.id);
    return { ...d, last_score: lastScan?.score || null, last_scan: lastScan?.scanned_at || null };
  });
  res.json(result);
});

// Add new domain
router.post('/', (req, res) => {
  const { name, provider, provider_config, auto_fix, notify_email } = req.body;
  
  try {
    const domain = db.addDomain({
      name: name.toLowerCase().trim(),
      provider: provider || 'manual',
      provider_config: provider_config || {},
      auto_fix: auto_fix ? 1 : 0,
      notify_email: notify_email || null,
      status: 'active'
    });
    res.json({ success: true, ...domain });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Bulk add domains
router.post('/bulk', (req, res) => {
  const { domains } = req.body;
  if (!Array.isArray(domains) || domains.length === 0) {
    return res.status(400).json({ error: 'No domains provided' });
  }

  const added = [];
  const failed = [];

  for (const name of domains) {
    try {
      const domain = db.addDomain({ name: name.toLowerCase().trim(), provider: 'manual', status: 'active' });
      added.push(name);
    } catch (e) {
      failed.push({ name, error: e.message });
    }
  }

  res.json({ added, failed, total: domains.length });
});

// Bulk scan
router.post('/bulk-scan', async (req, res) => {
  const domains = db.getDomains().filter(d => d.status === 'active');
  const results = [];
  
  for (const domain of domains) {
    try {
      const audit = await auditor.auditDomain(domain.name);
      db.addScan({
        domain_id: domain.id,
        score: audit.score,
        spf_status: audit.spf?.status || 'UNKNOWN',
        dkim_status: audit.dkim?.status || 'UNKNOWN',
        dmarc_status: audit.dmarc?.status || 'UNKNOWN',
        spf_record: JSON.stringify(audit.spf),
        dkim_selectors: JSON.stringify(audit.dkim?.selectors || []),
        dmarc_record: JSON.stringify(audit.dmarc),
        issues: JSON.stringify(audit.issues || [])
      });
      results.push({ domain: domain.name, ...audit });
    } catch (error) {
      results.push({ domain: domain.name, error: error.message });
    }
  }

  res.json({ results, total: domains.length });
});

// Get single domain
router.get('/:id', (req, res) => {
  const domain = db.getDomain(parseInt(req.params.id));
  if (!domain) return res.status(404).json({ error: 'Domain not found' });

  const latestScan = db.getLatestScan(domain.id);
  const history = db.getScans(domain.id, 30);

  res.json({ ...domain, latest_scan: latestScan, history, issues: latestScan ? JSON.parse(latestScan.issues || '[]') : [] });
});

// Scan single domain
router.post('/:id/scan', async (req, res) => {
  const domain = db.getDomain(parseInt(req.params.id));
  if (!domain) return res.status(404).json({ error: 'Domain not found' });

  try {
    const audit = await auditor.auditDomain(domain.name);
    db.addScan({
      domain_id: domain.id,
      score: audit.score,
      spf_status: audit.spf?.status || 'UNKNOWN',
      dkim_status: audit.dkim?.status || 'UNKNOWN',
      dmarc_status: audit.dmarc?.status || 'UNKNOWN',
      spf_record: JSON.stringify(audit.spf),
      dkim_selectors: JSON.stringify(audit.dkim?.selectors || []),
      dmarc_record: JSON.stringify(audit.dmarc),
      issues: JSON.stringify(audit.issues || [])
    });
    res.json({ success: true, ...audit });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update domain
router.patch('/:id', (req, res) => {
  const { provider, auto_fix, notify_email } = req.body;
  const updates = {};
  if (provider) updates.provider = provider;
  if (auto_fix !== undefined) updates.auto_fix = auto_fix ? 1 : 0;
  if (notify_email !== undefined) updates.notify_email = notify_email;
  
  db.updateDomain(parseInt(req.params.id), updates);
  res.json({ success: true });
});

// Delete domain
router.delete('/:id', (req, res) => {
  db.deleteDomain(parseInt(req.params.id));
  res.json({ success: true });
});

module.exports = router;