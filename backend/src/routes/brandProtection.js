const express = require('express');
const router = express.Router();
const { BrandProtectionService } = require('../services/brandProtection');

const brandService = new BrandProtectionService();

// Get all monitored brands
router.get('/', (req, res) => {
  const db = require('../db/database');
  const brands = db.getSetting('monitored_brands') || '[]';
  res.json(JSON.parse(brands));
});

// Add brand to monitor
router.post('/', (req, res) => {
  const { domain, brand_name } = req.body;
  
  if (!domain) {
    return res.status(400).json({ error: 'Domain is required' });
  }

  const db = require('../db/database');
  const brands = JSON.parse(db.getSetting('monitored_brands') || '[]');
  
  const newBrand = {
    id: Date.now(),
    domain: domain.toLowerCase(),
    brand_name: brand_name || domain.split('.')[0],
    added_at: new Date().toISOString(),
    status: 'active'
  };
  
  brands.push(newBrand);
  db.setSetting('monitored_brands', JSON.stringify(brands));
  
  res.json({ success: true, ...newBrand });
});

// Run brand protection check
router.post('/check/:id', async (req, res) => {
  const db = require('../db/database');
  const brands = JSON.parse(db.getSetting('monitored_brands') || '[]');
  const brand = brands.find(b => b.id === parseInt(req.params.id));
  
  if (!brand) {
    return res.status(404).json({ error: 'Brand not found' });
  }

  const result = await brandService.checkBrandProtection(brand.domain);
  res.json(result);
});

// Delete monitored brand
router.delete('/:id', (req, res) => {
  const db = require('../db/database');
  const brands = JSON.parse(db.getSetting('monitored_brands') || '[]');
  const filtered = brands.filter(b => b.id !== parseInt(req.params.id));
  db.setSetting('monitored_brands', JSON.stringify(filtered));
  res.json({ success: true });
});

// Get all check results
router.get('/results', (req, res) => {
  const db = require('../db/database');
  const results = db.getSetting('brand_check_results') || '[]';
  res.json(JSON.parse(results));
});

module.exports = router;