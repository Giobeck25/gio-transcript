import { Router, Request, Response } from 'express';
import { db, Tenant, User } from '../db/index.js';
import crypto from 'crypto';

export const authRouter = Router();

function hashPassword(password: string, salt: string) {
  return crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha256').toString('hex');
}

// Get available tenants
authRouter.get('/tenants', (req: Request, res: Response) => {
  const tenants = db.getTenants();
  res.json({ success: true, tenants });
});

// Signup
authRouter.post('/signup', (req: Request, res: Response) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    res.status(400).json({ success: false, error: 'Name, email, and password are required' });
    return;
  }

  const existingUser = db.getUserByEmail(email);
  if (existingUser) {
    res.status(400).json({ success: false, error: 'User with this email already exists' });
    return;
  }

  const salt = crypto.randomBytes(16).toString('hex');
  const passwordHash = hashPassword(password, salt);

  const tenantName = `${name}'s Workspace`;
  const slug = tenantName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const tenantId = `tenant-${Date.now()}`;
  const userId = `user-${Date.now()}`;

  const newTenant: Tenant = {
    id: tenantId,
    name: tenantName,
    slug,
    plan: 'Individual Pro',
    createdAt: new Date().toISOString(),
  };

  const newUser: User = {
    id: userId,
    tenantId,
    email: email.toLowerCase(),
    name,
    role: 'admin',
    avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`,
    passwordHash,
    salt,
  };

  // Save to database
  const allData = (db as any).data;
  allData.tenants.push(newTenant);
  allData.users.push(newUser);
  db.saveLocalData();

  db.logAudit(tenantId, userId, 'USER_SIGNUP', { email });

  res.status(201).json({
    success: true,
    token: `bearer-${tenantId}-${userId}`,
    tenant: newTenant,
    user: newUser,
  });
});

// Login
authRouter.post('/login', (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ success: false, error: 'Email and password are required' });
    return;
  }

  const user = db.getUserByEmail(email);

  if (!user || !user.passwordHash || !user.salt) {
    res.status(401).json({ success: false, error: 'Invalid credentials' });
    return;
  }

  const inputHash = hashPassword(password, user.salt);
  if (inputHash !== user.passwordHash) {
    res.status(401).json({ success: false, error: 'Invalid credentials' });
    return;
  }

  const tenant = db.getTenant(user.tenantId);
  if (!tenant) {
    res.status(401).json({ success: false, error: 'Tenant not found' });
    return;
  }

  db.logAudit(tenant.id, user.id, 'USER_LOGIN', { email: user.email });

  res.json({
    success: true,
    token: `bearer-${tenant.id}-${user.id}`,
    tenant,
    user,
  });
});

// Current user profile
authRouter.get('/me', (req: Request, res: Response) => {
  const tenantId = (req.headers['x-tenant-id'] as string);
  const userId = (req.headers['x-user-id'] as string);

  if (!tenantId || !userId) {
    res.status(401).json({ success: false, error: 'Unauthorized' });
    return;
  }

  const tenant = db.getTenant(tenantId);
  const user = db.getUser(userId);

  if (!tenant || !user) {
    res.status(401).json({ success: false, error: 'Unauthorized' });
    return;
  }

  res.json({
    success: true,
    tenant,
    user,
  });
});
