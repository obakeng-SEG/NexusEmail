const express = require('express');
const router = express.Router();
const db = require('../db/database');

router.post('/:id/remediate', async (req, res) => {
  const domain = db.getDomain(parseInt(req.params.id));
  if (!domain) return res.status(404).json({ error: 'Domain not found' });

  const latestScan = db.getLatestScan(domain.id);
  if (!latestScan) return res.status(400).json({ error: 'No scan results found' });

  const issues = JSON.parse(latestScan.issues || '[]');
  const results = [];

  for (const issue of issues) {
    results.push({
      issue: issue.type || issue.title,
      status: 'Would require provider API - manual fix needed',
      fixed: false
    });
  }

  res.json({ 
    success: true, 
    domain: domain.name,
    issues_fixed: 0,
    issues_pending: results.length,
    details: results
  });
});

module.exports = router;