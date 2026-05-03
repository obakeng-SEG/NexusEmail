const express = require('express');
const router = express.Router();
const { BrandProtectionService } = require('../services/brandProtection');
const db = require('../db/database');

const brandService = new BrandProtectionService();

// Get all monitored brands
router.get('/', (req, res) => {
  const brands = db.getSetting('monitored_brands') || '[]';
  res.json(JSON.parse(brands));
});

// Add brand to monitor
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
    safe_list: []
  };
  
  brands.push(newBrand);
  db.setSetting('monitored_brands', JSON.stringify(brands));
  
  res.json({ success: true, ...newBrand });
});

// Run brand protection check
router.post('/check/:id', async (req, res) => {
  const brands = JSON.parse(db.getSetting('monitored_brands') || '[]');
  const brand = brands.find(b => b.id === parseInt(req.params.id));
  
  if (!brand) {
    return res.status(404).json({ error: 'Brand not found' });
  }

  const result = await brandService.checkBrandProtection(brand.domain);
  res.json(result);
});

// Get brand details with threats
router.get('/:id', (req, res) => {
  const brands = JSON.parse(db.getSetting('monitored_brands') || '[]');
  const brand = brands.find(b => b.id === parseInt(req.params.id));
  
  if (!brand) {
    return res.status(404).json({ error: 'Brand not found' });
  }
  
  res.json(brand);
});

// Mark domain as safe / whitelist
router.post('/:id/safe', (req, res) => {
  const { domain } = req.body;
  const brands = JSON.parse(db.getSetting('monitored_brands') || '[]');
  const brandIndex = brands.findIndex(b => b.id === parseInt(req.params.id));
  
  if (brandIndex === -1) {
    return res.status(404).json({ error: 'Brand not found' });
  }
  
  if (!brands[brandIndex].safe_list) {
    brands[brandIndex].safe_list = [];
  }
  
  if (!brands[brandIndex].safe_list.includes(domain)) {
    brands[brandIndex].safe_list.push(domain);
  }
  
  // Remove from threats if present
  if (brands[brandIndex].threats) {
    brands[brandIndex].threats = brands[brandIndex].threats.filter((t: any) => t.domain !== domain);
  }
  
  db.setSetting('monitored_brands', JSON.stringify(brands));
  res.json({ success: true, message: `Added ${domain} to safe list` });
});

// Remove from safe list
router.delete('/:id/safe', (req, res) => {
  const { domain } = req.body;
  const brands = JSON.parse(db.getSetting('monitored_brands') || '[]');
  const brandIndex = brands.findIndex(b => b.id === parseInt(req.params.id));
  
  if (brandIndex === -1) {
    return res.status(404).json({ error: 'Brand not found' });
  }
  
  if (brands[brandIndex].safe_list) {
    brands[brandIndex].safe_list = brands[brandIndex].safe_list.filter((d: string) => d !== domain);
  }
  
  db.setSetting('monitored_brands', JSON.stringify(brands));
  res.json({ success: true });
});

// Submit takedown request
router.post('/:id/takedown', (req, res) => {
  const { domain, threat_type, evidence, contact_email } = req.body;
  const brands = JSON.parse(db.getSetting('monitored_brands') || '[]');
  const brandIndex = brands.findIndex(b => b.id === parseInt(req.params.id));
  
  if (brandIndex === -1) {
    return res.status(404).json({ error: 'Brand not found' });
  }
  
  if (!brands[brandIndex].takedowns) {
    brands[brandIndex].takedowns = [];
  }
  
  const takedown = {
    id: Date.now(),
    domain,
    threat_type: threat_type || 'typosquatting',
    evidence: evidence || {},
    contact_email: contact_email || 'legal@brand.com',
    status: 'pending',
    submitted_at: new Date().toISOString(),
    provider: determineRegistrar(domain),
    notes: ''
  };
  
  brands[brandIndex].takedowns.push(takedown);
  db.setSetting('monitored_brands', JSON.stringify(brands));
  
  res.json({ success: true, takedown_id: takedown.id, message: 'Takedown request submitted' });
});

// Get takedown status
router.get('/:id/takedowns', (req, res) => {
  const brands = JSON.parse(db.getSetting('monitored_brands') || '[]');
  const brand = brands.find(b => b.id === parseInt(req.params.id));
  
  if (!brand) {
    return res.status(404).json({ error: 'Brand not found' });
  }
  
  res.json(brand.takedowns || []);
});

// Update takedown status
router.patch('/:id/takedown/:takedownId', (req, res) => {
  const { status, notes } = req.body;
  const brands = JSON.parse(db.getSetting('monitored_brands') || '[]');
  const brandIndex = brands.findIndex(b => b.id === parseInt(req.params.id));
  
  if (brandIndex === -1) {
    return res.status(404).json({ error: 'Brand not found' });
  }
  
  if (brands[brandIndex].takedowns) {
    const takedownIndex = brands[brandIndex].takedowns.findIndex((t: any) => t.id === parseInt(req.params.takedownId));
    if (takedownIndex !== -1) {
      if (status) brands[brandIndex].takedowns[takedownIndex].status = status;
      if (notes) brands[brandIndex].takedowns[takedownIndex].notes = notes;
    }
  }
  
  db.setSetting('monitored_brands', JSON.stringify(brands));
  res.json({ success: true });
});

// Track a threat manually
router.post('/:id/threat', (req, res) => {
  const { domain, threat_type, severity, notes } = req.body;
  const brands = JSON.parse(db.getSetting('monitored_brands') || '[]');
  const brandIndex = brands.findIndex(b => b.id === parseInt(req.params.id));
  
  if (brandIndex === -1) {
    return res.status(404).json({ error: 'Brand not found' });
  }
  
  if (!brands[brandIndex].threats) {
    brands[brandIndex].threats = [];
  }
  
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

// Get all threats for brand
router.get('/:id/threats', (req, res) => {
  const brands = JSON.parse(db.getSetting('monitored_brands') || '[]');
  const brand = brands.find(b => b.id === parseInt(req.params.id));
  
  if (!brand) {
    return res.status(404).json({ error: 'Brand not found' });
  }
  
  res.json(brand.threats || []);
});

// Delete monitored brand
router.delete('/:id', (req, res) => {
  const brands = JSON.parse(db.getSetting('monitored_brands') || '[]');
  const filtered = brands.filter(b => b.id !== parseInt(req.params.id));
  db.setSetting('monitored_brands', JSON.stringify(filtered));
  res.json({ success: true });
});

function determineRegistrar(domain) {
  const registrarPatterns = [
    { name: 'Cloudflare', patterns: ['cloudflare.com'] },
    { name: 'GoDaddy', patterns: ['godaddy.com', 'goDaddy.com'] },
    { name: 'Namecheap', patterns: ['namecheap.com'] },
    { name: 'Google Domains', patterns: ['googledomains.com', 'google.com'] },
    { name: 'AWS', patterns: ['aws.amazon.com', 'amazon.com'] },
    { name: 'MarkMonitor', patterns: ['markmonitor.com'] },
    { name: 'CSC Global', patterns: ['cscglobal.com'] },
  ];
  
  // This would need actual WHOIS lookup in production
  return 'Registrar detection requires WHOIS API';
}

module.exports = router;