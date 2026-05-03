const express = require('express');
const router = express.Router();
const { BrandProtectionService } = require('../services/brandProtection');
const db = require('../db/database');

const brandService = new BrandProtectionService();

router.get('/', (req, res) => {
  const brands = db.getSetting('monitored_brands') || '[]';
  res.json(JSON.parse(brands));
});

router.post('/', (req, res) => {
  const { domain, brand_name } = req.body;
  
  if (!domain) {
    return res.status(400).json({ error: 'Domain is required' });
  }

  const brands = JSON.parse(db.getSetting('monitored_brands') || '[]');
  
  const newBrand = {
    id: Date.now(),
    domain: domain.toLowerCase(),
    brand_name: brand_name || domain.split('.')[0],
    added_at: new Date().toISOString(),
    status: 'active',
    threats: [],
    takedowns: [],
    safe_list: [],
    last_scan: null,
    next_scan: null,
    scan_schedule: 'manual',
    alerts_enabled: true,
    last_results: null
  };
  
  brands.push(newBrand);
  db.setSetting('monitored_brands', JSON.stringify(brands));
  
  res.json({ success: true, ...newBrand });
});

router.post('/scan/all', async (req, res) => {
  const brands = JSON.parse(db.getSetting('monitored_brands') || '[]');
  const results = [];
  
  for (const brand of brands) {
    try {
      const previousResults = brand.last_results;
      const result = await brandService.checkBrandProtection(brand.domain, previousResults);
      result.brand_id = brand.id;
      results.push(result);
      
      const brandIndex = brands.findIndex(b => b.id === brand.id);
      if (brandIndex !== -1) {
        brands[brandIndex].last_scan = new Date().toISOString();
        brands[brandIndex].last_results = result;
        
        if (result.newThreats && result.newThreats.length > 0 && brands[brandIndex].alerts_enabled) {
          const alerts = JSON.parse(db.getSetting('brand_alerts') || '[]');
          for (const alert of result.alerts) {
            alerts.push({ ...alert, brand_id: brand.id, brand_name: brand.domain });
          }
          db.setSetting('brand_alerts', JSON.stringify(alerts.slice(-100)));
        }
      }
    } catch (e) {
      results.push({ domain: brand.domain, error: e.message, brand_id: brand.id });
    }
  }
  
  db.setSetting('monitored_brands', JSON.stringify(brands));
  res.json({ scanned: brands.length, results });
});

router.post('/check/:id', async (req, res) => {
  const brands = JSON.parse(db.getSetting('monitored_brands') || '[]');
  const brand = brands.find(b => b.id === parseInt(req.params.id));
  
  if (!brand) {
    return res.status(404).json({ error: 'Brand not found' });
  }

  const previousResults = brand.last_results;
  const result = await brandService.checkBrandProtection(brand.domain, previousResults);
  
  const brandIndex = brands.findIndex(b => b.id === parseInt(req.params.id));
  brands[brandIndex].last_scan = new Date().toISOString();
  brands[brandIndex].last_results = result;
  
  if (result.newThreats && result.newThreats.length > 0 && brands[brandIndex].alerts_enabled) {
    const alerts = JSON.parse(db.getSetting('brand_alerts') || '[]');
    for (const alert of result.alerts) {
      alerts.push({ ...alert, brand_id: brand.id, brand_name: brand.domain });
    }
    db.setSetting('brand_alerts', JSON.stringify(alerts.slice(-100)));
  }
  
  db.setSetting('monitored_brands', JSON.stringify(brands));
  res.json(result);
});

// Alerts routes (must be before /:id)
router.get('/alerts', (req, res) => {
  const alerts = db.getSetting('brand_alerts') || '[]';
  const allAlerts = JSON.parse(alerts);
  res.json(allAlerts.slice(-50).reverse());
});

router.delete('/alerts/:alertId', (req, res) => {
  const alerts = JSON.parse(db.getSetting('brand_alerts') || '[]');
  const filtered = alerts.filter(a => a.id !== parseInt(req.params.alertId));
  db.setSetting('brand_alerts', JSON.stringify(filtered));
  res.json({ success: true });
});

router.post('/alerts/clear', (req, res) => {
  db.setSetting('brand_alerts', JSON.stringify([]));
  res.json({ success: true, message: 'All alerts cleared' });
});

router.get('/:id', (req, res) => {
  const brands = JSON.parse(db.getSetting('monitored_brands') || '[]');
  const brand = brands.find(b => b.id === parseInt(req.params.id));
  
  if (!brand) {
    return res.status(404).json({ error: 'Brand not found' });
  }
  
  res.json(brand);
});

router.patch('/:id', (req, res) => {
  const { scan_schedule, alerts_enabled, brand_name } = req.body;
  const brands = JSON.parse(db.getSetting('monitored_brands') || '[]');
  const brandIndex = brands.findIndex(b => b.id === parseInt(req.params.id));
  
  if (brandIndex === -1) {
    return res.status(404).json({ error: 'Brand not found' });
  }
  
  if (scan_schedule !== undefined) brands[brandIndex].scan_schedule = scan_schedule;
  if (alerts_enabled !== undefined) brands[brandIndex].alerts_enabled = alerts_enabled;
  if (brand_name) brands[brandIndex].brand_name = brand_name;
  
  if (scan_schedule && scan_schedule !== 'manual') {
    const interval = { daily: 1, weekly: 7, monthly: 30 }[scan_schedule];
    brands[brandIndex].next_scan = new Date(Date.now() + interval * 24 * 60 * 60 * 1000).toISOString();
  }
  
  db.setSetting('monitored_brands', JSON.stringify(brands));
  res.json({ success: true, ...brands[brandIndex] });
});

router.post('/:id/safe', (req, res) => {
  const { domain } = req.body;
  const brands = JSON.parse(db.getSetting('monitored_brands') || '[]');
  const brandIndex = brands.findIndex(b => b.id === parseInt(req.params.id));
  
  if (brandIndex === -1) {
    return res.status(404).json({ error: 'Brand not found' });
  }
  
  if (!brands[brandIndex].safe_list) brands[brandIndex].safe_list = [];
  if (!brands[brandIndex].safe_list.includes(domain)) {
    brands[brandIndex].safe_list.push(domain);
  }
  
  if (brands[brandIndex].threats) {
    brands[brandIndex].threats = brands[brandIndex].threats.filter((t) => t.domain !== domain);
  }
  
  db.setSetting('monitored_brands', JSON.stringify(brands));
  res.json({ success: true, message: `Added ${domain} to safe list` });
});

router.delete('/:id/safe', (req, res) => {
  const { domain } = req.body;
  const brands = JSON.parse(db.getSetting('monitored_brands') || '[]');
  const brandIndex = brands.findIndex(b => b.id === parseInt(req.params.id));
  
  if (brandIndex === -1) {
    return res.status(404).json({ error: 'Brand not found' });
  }
  
  if (brands[brandIndex].safe_list) {
    brands[brandIndex].safe_list = brands[brandIndex].safe_list.filter((d) => d !== domain);
  }
  
  db.setSetting('monitored_brands', JSON.stringify(brands));
  res.json({ success: true });
});

router.post('/:id/takedown', async (req, res) => {
  const { domain, threat_type, evidence, contact_email } = req.body;
  const brands = JSON.parse(db.getSetting('monitored_brands') || '[]');
  const brandIndex = brands.findIndex(b => b.id === parseInt(req.params.id));
  
  if (brandIndex === -1) {
    return res.status(404).json({ error: 'Brand not found' });
  }
  
  if (!brands[brandIndex].takedowns) brands[brandIndex].takedowns = [];
  
  const brand = brands[brandIndex];
  const lastResults = brand.last_results || {};
  const registrar = lastResults.registrar || { registrar: 'Unknown', abuse_email: null };
  
  const takedown = {
    id: Date.now(),
    domain,
    threat_type: threat_type || 'impersonation',
    evidence: evidence || {},
    contact_email: contact_email || 'legal@brand.com',
    status: 'pending',
    submitted_at: new Date().toISOString(),
    provider: registrar.registrar,
    abuse_email: registrar.abuse_email,
    email_template: brandService.buildTakedownEmail(domain, brand.brand_name, registrar.registrar, threat_type),
    sent: false,
    notes: ''
  };

  // Try to send email via SMTP
  if (registrar.abuse_email) {
    try {
      const NotificationService = require('../services/notifications');
      const notifService = new NotificationService();
      
      // Load SMTP config from database
      const smtpConfig = JSON.parse(db.getSetting('smtp_config') || '{}');
      if (smtpConfig.host && smtpConfig.host.trim()) {
        notifService.configureSMTP(smtpConfig);
        
        const emailResult = await notifService.sendNotification(
          registrar.abuse_email,
          `[Brand Abuse Report] ${domain} - ${threat_type || 'Impersonation'}`,
          takedown.email_template
        );
        
        if (emailResult.success) {
          takedown.sent = true;
          takedown.status = 'sent';
          takedown.sent_at = new Date().toISOString();
        }
      }
    } catch (e) {
      console.error('Failed to send takedown email:', e.message);
    }
  }
  
  brands[brandIndex].takedowns.push(takedown);
  db.setSetting('monitored_brands', JSON.stringify(brands));
  
  res.json({ success: true, takedown_id: takedown.id, takedown });
});

router.get('/:id/takedowns', (req, res) => {
  const brands = JSON.parse(db.getSetting('monitored_brands') || '[]');
  const brand = brands.find(b => b.id === parseInt(req.params.id));
  
  if (!brand) {
    return res.status(404).json({ error: 'Brand not found' });
  }
  
  res.json(brand.takedowns || []);
});

router.patch('/:id/takedown/:takedownId', (req, res) => {
  const { status, notes } = req.body;
  const brands = JSON.parse(db.getSetting('monitored_brands') || '[]');
  const brandIndex = brands.findIndex(b => b.id === parseInt(req.params.id));
  
  if (brandIndex === -1) {
    return res.status(404).json({ error: 'Brand not found' });
  }
  
  if (brands[brandIndex].takedowns) {
    const takedownIndex = brands[brandIndex].takedowns.findIndex((t) => t.id === parseInt(req.params.takedownId));
    if (takedownIndex !== -1) {
      if (status) brands[brandIndex].takedowns[takedownIndex].status = status;
      if (notes) brands[brandIndex].takedowns[takedownIndex].notes = notes;
    }
  }
  
  db.setSetting('monitored_brands', JSON.stringify(brands));
  res.json({ success: true });
});

router.post('/:id/threat', (req, res) => {
  const { domain, threat_type, severity, notes } = req.body;
  const brands = JSON.parse(db.getSetting('monitored_brands') || '[]');
  const brandIndex = brands.findIndex(b => b.id === parseInt(req.params.id));
  
  if (brandIndex === -1) {
    return res.status(404).json({ error: 'Brand not found' });
  }
  
  if (!brands[brandIndex].threats) brands[brandIndex].threats = [];
  
  const threat = {
    id: Date.now(),
    domain,
    threat_type: threat_type || 'manual',
    severity: severity || 'medium',
    notes: notes || '',
    detected_at: new Date().toISOString(),
    status: 'active'
  };
  
  brands[brandIndex].threats.push(threat);
  db.setSetting('monitored_brands', JSON.stringify(brands));
  
  res.json({ success: true, threat_id: threat.id });
});

router.get('/:id/threats', (req, res) => {
  const brands = JSON.parse(db.getSetting('monitored_brands') || '[]');
  const brand = brands.find(b => b.id === parseInt(req.params.id));
  
  if (!brand) {
    return res.status(404).json({ error: 'Brand not found' });
  }
  
  res.json(brand.threats || []);
});

router.get('/alerts', (req, res) => {
  const alerts = db.getSetting('brand_alerts') || '[]';
  const allAlerts = JSON.parse(alerts);
  res.json(allAlerts.slice(-50).reverse());
});

router.delete('/:id', (req, res) => {
  const brands = JSON.parse(db.getSetting('monitored_brands') || '[]');
  const filtered = brands.filter(b => b.id !== parseInt(req.params.id));
  db.setSetting('monitored_brands', JSON.stringify(filtered));
  res.json({ success: true });
});

module.exports = router;