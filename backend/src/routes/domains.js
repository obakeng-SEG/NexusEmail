const express = require('express');
const router = express.Router();
const { getDatabase } = require('../db/database');
const { EmailSecurityAuditor } = require('../services/auditEngine');
const { NotificationService } = require('../services/notifications');

const auditor = new EmailSecurityAuditor();
const notificationService = new NotificationService();

// Get all domains with latest scan info
router.get('/', (req, res) => {
  const db = getDatabase();
  const domains = db.prepare(`
    SELECT d.*, 
      (SELECT score FROM scans WHERE domain_id = d.id ORDER BY scanned_at DESC LIMIT 1) as last_score,
      (SELECT scanned_at FROM scans WHERE domain_id = d.id ORDER BY scanned_at DESC LIMIT 1) as last_scan
    FROM domains d 
    ORDER BY d.created_at DESC
  `).all();
  
  res.json(domains);
});

// Add new domain
router.post('/', (req, res) => {
  const db = getDatabase();
  const { name, provider, provider_config, auto_fix, notify_email } = req.body;
  
  try {
    const stmt = db.prepare(`
      INSERT INTO domains (name, provider, provider_config, auto_fix, notify_email, status) 
      VALUES (?, ?, ?, ?, ?, 'active')
    `);
    const result = stmt.run(
      name, 
      provider || 'manual', 
      JSON.stringify(provider_config || {}),
      auto_fix ? 1 : 0,
      notify_email || null
    );
    
    res.json({ success: true, id: result.lastInsertRowid, name });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Bulk add domains
router.post('/bulk', (req, res) => {
  const db = getDatabase();
  const { domains } = req.body; // Array of domain names
  
  if (!Array.isArray(domains) || domains.length === 0) {
    return res.status(400).json({ error: 'No domains provided' });
  }

  const added = [];
  const failed = [];
  
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO domains (name, provider, status) VALUES (?, 'manual', 'active')
  `);

  for (const name of domains) {
    try {
      const result = stmt.run(name.toLowerCase().trim());
      if (result.changes > 0) {
        added.push(name);
      }
    } catch (error) {
      failed.push({ name, error: error.message });
    }
  }

  res.json({ added, failed, total: domains.length });
});

// Bulk scan
router.post('/bulk-scan', async (req, res) => {
  const db = getDatabase();
  const { domain_ids } = req.body; // Array of domain IDs

  const domains = domain_ids 
    ? domain_ids.map(id => db.prepare('SELECT * FROM domains WHERE id = ?').get(id)).filter(Boolean)
    : db.prepare("SELECT * FROM domains WHERE status = 'active'").all();

  const results = [];
  
  for (const domain of domains) {
    try {
      const audit = await auditor.auditDomain(domain.name);
      
      // Save scan
      const stmt = db.prepare(`
        INSERT INTO scans (domain_id, score, spf_status, dkim_status, dmarc_status, 
          spf_record, dkim_selectors, dmarc_record, issues)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      stmt.run(
        domain.id,
        audit.score,
        audit.spf?.status || 'UNKNOWN',
        audit.dkim?.status || 'UNKNOWN',
        audit.dmarc?.status || 'UNKNOWN',
        JSON.stringify(audit.spf),
        JSON.stringify(audit.dkim?.selectors || []),
        JSON.stringify(audit.dmarc),
        JSON.stringify(audit.issues)
      );

      results.push({ domain: domain.name, ...audit });

      // Send notification if configured and critical issues
      if (domain.notify_email && audit.issues.filter(i => i.severity === 'high').length > 0) {
        await notificationService.sendScanResults(domain.name, audit, domain.notify_email);
      }
    } catch (error) {
      results.push({ domain: domain.name, error: error.message });
    }
  }

  res.json({ results, total: domains.length });
});

// Get single domain with full audit
router.get('/:id', async (req, res) => {
  const db = getDatabase();
  const domain = db.prepare('SELECT * FROM domains WHERE id = ?').get(req.params.id);
  
  if (!domain) {
    return res.status(404).json({ error: 'Domain not found' });
  }

  // Get latest scan
  const latestScan = db.prepare(`
    SELECT * FROM scans WHERE domain_id = ? ORDER BY scanned_at DESC LIMIT 1
  `).get(domain.id);

  // Get scan history
  const history = db.prepare(`
    SELECT * FROM scans WHERE domain_id = ? ORDER BY scanned_at DESC LIMIT 30
  `).all(domain.id);

  // Get issues
  const issues = db.prepare(`
    SELECT issues FROM scans WHERE domain_id = ? ORDER BY scanned_at DESC LIMIT 1
  `).get(domain.id);

  res.json({ 
    ...domain, 
    latest_scan: latestScan ? JSON.parse(JSON.stringify(latestScan)) : null,
    history: history.map(h => JSON.parse(JSON.stringify(h))),
    issues: latestScan ? JSON.parse(latestScan.issues || '[]') : []
  });
});

// Manual scan single domain
router.post('/:id/scan', async (req, res) => {
  const db = getDatabase();
  const domain = db.prepare('SELECT * FROM domains WHERE id = ?').get(req.params.id);
  
  if (!domain) {
    return res.status(404).json({ error: 'Domain not found' });
  }

  try {
    const audit = await auditor.auditDomain(domain.name);
    
    // Save scan
    const stmt = db.prepare(`
      INSERT INTO scans (domain_id, score, spf_status, dkim_status, dmarc_status, 
        spf_record, dkim_selectors, dmarc_record, issues)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      domain.id,
      audit.score,
      audit.spf?.status || 'UNKNOWN',
      audit.dkim?.status || 'UNKNOWN',
      audit.dmarc?.status || 'UNKNOWN',
      JSON.stringify(audit.spf),
      JSON.stringify(audit.dkim?.selectors || []),
      JSON.stringify(audit.dmarc),
      JSON.stringify(audit.issues)
    );

    // Send notification if configured
    if (domain.notify_email) {
      await notificationService.sendScanResults(domain.name, audit, domain.notify_email);
    }

    res.json({ success: true, ...audit });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update domain settings
router.patch('/:id', (req, res) => {
  const db = getDatabase();
  const { provider, provider_config, auto_fix, notify_email } = req.body;
  
  const updates = [];
  const values = [];
  
  if (provider !== undefined) { updates.push('provider = ?'); values.push(provider); }
  if (provider_config !== undefined) { updates.push('provider_config = ?'); values.push(JSON.stringify(provider_config)); }
  if (auto_fix !== undefined) { updates.push('auto_fix = ?'); values.push(auto_fix ? 1 : 0); }
  if (notify_email !== undefined) { updates.push('notify_email = ?'); values.push(notify_email); }
  
  if (updates.length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }
  
  values.push(req.params.id);
  
  db.prepare(`UPDATE domains SET ${updates.join(', ')} WHERE id = ?`).run(...values);
  
  res.json({ success: true });
});

// Delete domain
router.delete('/:id', (req, res) => {
  const db = getDatabase();
  db.prepare('DELETE FROM scans WHERE domain_id = ?').run(req.params.id);
  db.prepare('DELETE FROM domains WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;