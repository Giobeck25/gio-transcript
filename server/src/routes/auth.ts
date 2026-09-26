import { Router, Request, Response } from 'express';
import { db } from '../db/index.js';

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
  const { tenantId, userId } = req.body;
  const targetTenantId = tenantId || 'tenant-enterprise-1';
  const targetUserId = userId || 'user-gio';

  const tenant = db.getTenant(targetTenantId);
  const user = db.getUser(targetUserId);

  if (!tenant || !user) {
    res.status(404).json({ success: false, error: 'Tenant or user not found' });
    return;
  }

  db.logAudit(targetTenantId, targetUserId, 'USER_LOGIN', { email: user.email });

  res.json({
    success: true,
    token: `bearer-${targetTenantId}-${targetUserId}`,
    tenant,
    user,
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
