require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const domainRoutes = require('./routes/domains');
const scanRoutes = require('./routes/scans');
const integrationRoutes = require('./routes/integrations');
const { router: settingsRoutes } = require('./routes/settings');
const brandProtectionRoutes = require('./routes/brandProtection');
const remediationRoutes = require('./routes/remediation');

const app = express();
const PORT = process.env.PORT || 4000;

// Security middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});
app.use(limiter);

// Root route
app.get('/', (req, res) => {
  res.json({ name: 'NexusEmail API', status: 'running', version: '1.0.0' });
});

// Routes
app.use('/api/domains', domainRoutes);
app.use('/api/scans', scanRoutes);
app.use('/api/integrations', integrationRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/brands', brandProtectionRoutes);
app.use('/api/domains', remediationRoutes);

// Health check
app.get('/api/health', (req, res) => {
  const db = require('./db/database');
  const domains = db.getDomains();
  const integrations = db.getIntegrations();
  res.json({ status: 'ok', domains: domains.length, integrations: integrations.length, timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`🚀 NexusEmail API running on http://localhost:${PORT}`);
});

module.exports = app;