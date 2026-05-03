require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cron = require('node-cron');

const domainRoutes = require('./routes/domains');
const scanRoutes = require('./routes/scans');
const integrationRoutes = require('./routes/integrations');
const { initDatabase } = require('./db/database');
const { startScheduledScans } = require('./services/scheduler');

const app = express();
const PORT = process.env.PORT || 3001;

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

// Routes
app.use('/api/domains', domainRoutes);
app.use('/api/scans', scanRoutes);
app.use('/api/integrations', integrationRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Initialize database
initDatabase();

// Start scheduled scans
startScheduledScans();

app.listen(PORT, () => {
  console.log(`🚀 NexusEmail API running on port ${PORT}`);
});

module.exports = app;