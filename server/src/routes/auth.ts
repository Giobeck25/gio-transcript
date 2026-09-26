import { Router, Request, Response } from 'express';
import { db, Tenant, User } from '../db/index.js';

export const authRouter = Router();

// Get available tenants & users for switching/login
authRouter.get('/tenants', (req: Request, res: Response) => {
  const tenants = db.getTenants();
  res.json({ success: true, tenants });
});

authRouter.get('/users', (req: Request, res: Response) => {
  const tenantId = (req.query.tenantId as string) || 'tenant-enterprise-1';
  const users = db.getUsers(tenantId);
  res.json({ success: true, users });
});

// Login / Switch tenant session
authRouter.post('/login', (req: Request, res: Response) => {
  const { tenantId, userId, email } = req.body;

  let tenant: Tenant | undefined;
  let user: User | undefined;

  if (tenantId && userId) {
    tenant = db.getTenant(tenantId);
    user = db.getUser(userId);
  } else if (email) {
    const allUsers = db.getTenants().flatMap((t) => db.getUsers(t.id));
    user = allUsers.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (user) {
      tenant = db.getTenant(user.tenantId);
    }
  }

  if (!tenant || !user) {
    res.status(401).json({ success: false, error: 'Invalid credentials or tenant not found' });
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

// Register New Enterprise Tenant Workspace
authRouter.post('/register-tenant', (req: Request, res: Response) => {
  const { tenantName, adminName, adminEmail, plan = 'Enterprise Pro' } = req.body;

  if (!tenantName || !adminName || !adminEmail) {
    res.status(400).json({ success: false, error: 'Tenant name, admin name, and admin email are required' });
    return;
  }

  const slug = tenantName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const tenantId = `tenant-${Date.now()}`;
  const userId = `user-${Date.now()}`;

  const newTenant: Tenant = {
    id: tenantId,
    name: tenantName,
    slug,
    plan,
    createdAt: new Date().toISOString(),
  };

  const newAdmin: User = {
    id: userId,
    tenantId,
    email: adminEmail,
    name: adminName,
    role: 'admin',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80',
  };

  // Save to database
  const allData = (db as any).data;
  allData.tenants.push(newTenant);
  allData.users.push(newAdmin);
  db.saveLocalData();

  db.logAudit(tenantId, userId, 'TENANT_REGISTERED', { tenantName, adminEmail });

  res.status(201).json({
    success: true,
    token: `bearer-${tenantId}-${userId}`,
    tenant: newTenant,
    user: newAdmin,
    message: `Enterprise workspace "${tenantName}" successfully provisioned with dedicated tenant isolation!`,
  });
});

// Current user profile
authRouter.get('/me', (req: Request, res: Response) => {
  const tenantId = (req.headers['x-tenant-id'] as string) || 'tenant-enterprise-1';
  const userId = (req.headers['x-user-id'] as string) || 'user-gio';

  const tenant = db.getTenant(tenantId);
  const user = db.getUser(userId);

  res.json({
    success: true,
    tenant,
    user,
  });
});
