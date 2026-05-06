const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const db = require('../db/database');
const { sign, publicUser, hashPassword } = require('../auth');

function configuredToken() {
  return process.env.WHMCS_API_TOKEN || process.env.NEXUSEMAIL_WHMCS_API_TOKEN || 'dev-whmcs-token';
}

function configuredHmacSecret() {
  return process.env.WHMCS_WEBHOOK_SECRET || process.env.NEXUSEMAIL_WHMCS_WEBHOOK_SECRET || '';
}

function authorized(req) {
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (token && token === configuredToken()) return true;

  const secret = configuredHmacSecret();
  if (!secret) return false;
  const timestamp = req.headers['x-whmcs-timestamp'];
  const nonce = req.headers['x-whmcs-nonce'];
  const signature = String(req.headers['x-whmcs-signature'] || '').replace(/^sha256=/, '');
  if (!timestamp || !nonce || !signature) return false;
  if (Math.abs(Date.now() - Number(timestamp)) > 5 * 60 * 1000) return false;

  const seen = JSON.parse(db.getSetting('whmcs_seen_nonces') || '[]');
  if (seen.some(n => n.nonce === nonce)) return false;
  const body = JSON.stringify(req.body || {});
  const expected = crypto.createHmac('sha256', secret).update(`${timestamp}.${nonce}.${body}`).digest('hex');
  const ok = signature.length === expected.length && crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  if (!ok) return false;
  seen.push({ nonce, at: Date.now() });
  db.setSetting('whmcs_seen_nonces', JSON.stringify(seen.filter(n => Date.now() - n.at < 10 * 60 * 1000).slice(-500)));
  return true;
}

function requireWhmcs(req, res, next) {
  if (process.env.NODE_ENV === 'production' && configuredToken() === 'dev-whmcs-token' && !configuredHmacSecret()) {
    return res.status(500).json({ success: false, error: 'WHMCS_API_TOKEN or WHMCS_WEBHOOK_SECRET must be set in production' });
  }
  if (!authorized(req)) return res.status(401).json({ success: false, error: 'Unauthorized' });
  next();
}

function slugify(value) {
  return String(value || 'client').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 64) || `client-${Date.now()}`;
}

function orgForClient(clientId) {
  return db.getOrganizations().find(o => o.whmcs_client_id === String(clientId));
}

function userForWhmcsContact(clientId, contactId, email) {
  return db.getUsers().find(u =>
    u.whmcs_client_id === String(clientId) &&
    (contactId ? u.whmcs_contact_id === String(contactId) : u.email.toLowerCase() === String(email || '').toLowerCase())
  );
}

function ensureOrganization(payload) {
  const clientId = String(payload.clientId || payload.client_id || '').trim();
  if (!clientId) throw new Error('Missing field: clientId');
  const existing = orgForClient(clientId);
  if (existing) return existing;

  return db.addOrganization({
    slug: slugify(payload.slug || payload.companyName || payload.company || `whmcs-${clientId}`),
    name: payload.companyName || payload.company || `WHMCS Client ${clientId}`,
    whmcs_client_id: clientId,
    whmcs_service_id: payload.serviceId || payload.service_id || null,
    plan: payload.plan || 'trial'
  });
}

function ensureOwner(org, payload) {
  const email = String(payload.adminEmail || payload.email || '').toLowerCase().trim();
  if (!email) return null;
  const existing = db.getUserByEmail(email);
  if (existing) return existing;
  return db.addUser({
    org_id: org.id,
    email,
    name: payload.adminName || payload.contactName || email,
    role: 'owner',
    whmcs_client_id: org.whmcs_client_id,
    whmcs_contact_id: payload.contactId || payload.contact_id || null,
    password_hash: hashPassword(crypto.randomBytes(24).toString('base64url'))
  });
}

router.post('/provision', requireWhmcs, (req, res) => {
  try {
    const org = ensureOrganization(req.body);
    const owner = ensureOwner(org, req.body);
    res.json({ success: true, organization: org, owner: owner ? publicUser(owner) : null });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.post('/suspend', requireWhmcs, (req, res) => {
  const org = orgForClient(req.body.clientId || req.body.client_id);
  if (!org) return res.status(404).json({ success: false, error: 'Organization not found' });
  org.status = 'suspended';
  db.saveDB?.();
  res.json({ success: true, organization: org });
});

router.post('/unsuspend', requireWhmcs, (req, res) => {
  const org = orgForClient(req.body.clientId || req.body.client_id);
  if (!org) return res.status(404).json({ success: false, error: 'Organization not found' });
  org.status = 'active';
  db.saveDB?.();
  res.json({ success: true, organization: org });
});

router.post('/terminate', requireWhmcs, (req, res) => {
  const org = orgForClient(req.body.clientId || req.body.client_id);
  if (!org) return res.status(404).json({ success: false, error: 'Organization not found' });
  org.status = 'cancelled';
  db.saveDB?.();
  res.json({ success: true, organization: org });
});

router.post('/login-token', requireWhmcs, (req, res) => {
  try {
    const org = ensureOrganization(req.body);
    const email = String(req.body.email || req.body.adminEmail || '').toLowerCase().trim();
    if (!email) return res.status(400).json({ success: false, error: 'Missing field: email' });

    let user = userForWhmcsContact(org.whmcs_client_id, req.body.contactId || req.body.contact_id, email) || db.getUserByEmail(email);
    if (!user) {
      user = db.addUser({
        org_id: org.id,
        email,
        name: req.body.name || req.body.contactName || email,
        role: req.body.role || 'member',
        whmcs_client_id: org.whmcs_client_id,
        whmcs_contact_id: req.body.contactId || req.body.contact_id || null,
        password_hash: hashPassword(crypto.randomBytes(24).toString('base64url'))
      });
    }

    if (org.status && org.status !== 'active') return res.status(403).json({ success: false, error: 'Organization is not active' });
    const token = sign({ sub: user.id, org_id: user.org_id, role: user.role, source: 'whmcs' });
    res.json({ success: true, token, user: publicUser(user) });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.get('/status/:clientId', requireWhmcs, (req, res) => {
  const org = orgForClient(req.params.clientId);
  if (!org) return res.status(404).json({ success: false, error: 'Organization not found' });
  res.json({ success: true, organization: org, users: db.getUsers(org.id).map(publicUser), domains: db.getDomains(org.id).length });
});

module.exports = router;
