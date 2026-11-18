import { Router } from 'express';
import { requireAuth, requireSuperAdmin } from '../auth.ts';
import { superadminController } from '../controllers/superadminController.ts';

export const superAdminRouter = Router();

superAdminRouter.use(requireAuth, requireSuperAdmin);

// 1. PLATFORM SUPER-ADMIN DASHBOARD
superAdminRouter.get('/dashboard', superadminController.getDashboard);

// 2. RESTAURANTS MANAGEMENT
superAdminRouter.get('/restaurants', superadminController.listRestaurants);
superAdminRouter.post('/restaurants', superadminController.createRestaurant);
superAdminRouter.patch(
  '/restaurants/:id/status',
  superadminController.updateRestaurantStatus,
);

// 3. PLANS & SUBSCRIPTIONS
superAdminRouter.get('/plans', superadminController.listPlans);
superAdminRouter.patch('/plans/:id', superadminController.updatePlan);
superAdminRouter.get('/subscriptions', superadminController.listSubscriptions);

// 4. PLATFORM BILLING (Circuit A)
superAdminRouter.get('/billing', superadminController.listInvoices);
superAdminRouter.post(
  '/billing/:id/mark-paid',
  superadminController.markInvoicePaid,
);

// 5. USERS & SESSION REVOCATION
superAdminRouter.get('/users', superadminController.listUsers);
superAdminRouter.patch('/users/:id/status', superadminController.updateUserStatus);

// 6. SUPPORT TICKETS & LEADS
superAdminRouter.get('/tickets', superadminController.listTickets);
superAdminRouter.post(
  '/tickets/:id/reply',
  superadminController.replyToTicket,
);

// 7. AUDIT LOGS & PLATFORM SETTINGS
superAdminRouter.get('/audit', superadminController.listAuditLogs);
superAdminRouter.get('/settings', superadminController.getSettings);
superAdminRouter.patch('/settings', superadminController.updateSettings);
