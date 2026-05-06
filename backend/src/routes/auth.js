const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { sign, verifyPassword, publicUser, requireAuth, requireRole, requirePlatformAdmin, hashPassword } = require('../auth');

router.post('/login', (req, res) => {
  const { email, password } = req.body;
  const user = db.getUserByEmail(email || '');
  if (!user || user.status !== 'active' || !verifyPassword(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }
  if (process.env.AUTH_MODE === 'whmcs' && user.platform_role !== 'platform_admin') {
    return res.status(403).json({ error: 'Hosted clients must sign in through WHMCS' });
  }
  const token = sign({ sub: user.id, org_id: user.org_id, role: user.role });
  res.json({ token, user: publicUser(user) });
});

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: publicUser(req.user) });
});

router.get('/organization/users', requireAuth, requireRole('owner', 'admin'), (req, res) => {
  res.json(db.getUsers(req.orgId).map(publicUser));
});

router.post('/organization/users', requireAuth, requireRole('owner', 'admin'), (req, res) => {
  const { email, name, role, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });
  if (db.getUserByEmail(email)) return res.status(409).json({ error: 'User already exists' });
  const user = db.addUser({
    org_id: req.orgId,
    email: email.toLowerCase().trim(),
    name: name || email,
    role: ['owner', 'admin', 'member'].includes(role) ? role : 'member',
    password_hash: hashPassword(password)
  });
  res.status(201).json(publicUser(user));
});

// Segbytes-hosted admin: create a client organization and first owner.
router.post('/organizations', requireAuth, requirePlatformAdmin, (req, res) => {
  const { name, slug, owner_email, owner_name, owner_password } = req.body;
  if (!name || !slug || !owner_email || !owner_password) {
    return res.status(400).json({ error: 'name, slug, owner_email and owner_password are required' });
  }
  if (db.getOrganization(slug)) return res.status(409).json({ error: 'Organization already exists' });
  if (db.getUserByEmail(owner_email)) return res.status(409).json({ error: 'Owner user already exists' });

  const org = db.addOrganization({ slug: slug.toLowerCase().trim(), name: name.trim() });
  const owner = db.addUser({
    org_id: org.id,
    email: owner_email.toLowerCase().trim(),
    name: owner_name || owner_email,
    role: 'owner',
    password_hash: hashPassword(owner_password)
  });
  res.status(201).json({ organization: org, owner: publicUser(owner) });
});

module.exports = router;
