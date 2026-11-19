import { Router } from 'express';
import {
  requireActiveRestaurant,
  requireAuth,
  requirePermission,
} from '../auth.ts';
import { restaurantController } from '../controllers/restaurantController.ts';

export const restaurantRouter = Router();

restaurantRouter.use(requireAuth, requireActiveRestaurant);

// 1. OWNER / MANAGEMENT DASHBOARD
restaurantRouter.get(
  '/dashboard',
  requirePermission('dashboard:read'),
  restaurantController.getDashboard,
);

// 2. MENU & CATALOG
restaurantRouter.get(
  '/menu',
  requirePermission('menu:read'),
  restaurantController.getMenu,
);
restaurantRouter.post(
  '/menu/categories',
  requirePermission('menu:write'),
  restaurantController.createCategory,
);
restaurantRouter.post(
  '/menu/items',
  requirePermission('menu:write'),
  restaurantController.createMenuItem,
);
restaurantRouter.patch(
  '/menu/items/:id',
  requirePermission('menu:write'),
  restaurantController.updateMenuItem,
);

// 3. ORDERS & KDS
restaurantRouter.get(
  '/orders',
  requirePermission('orders:read'),
  restaurantController.getOrders,
);
restaurantRouter.post(
  '/orders',
  requirePermission('orders:write'),
  restaurantController.createPosOrder,
);
restaurantRouter.patch(
  '/orders/:id/status',
  requirePermission('orders:read'),
  restaurantController.updateOrderStatus,
);

// 4. POS PAYMENTS & REFUNDS
restaurantRouter.get(
  '/payments',
  requirePermission('pos:use'),
  restaurantController.getPayments,
);
restaurantRouter.post(
  '/orders/:id/pay',
  requirePermission('pos:pay'),
  restaurantController.payOrder,
);
restaurantRouter.post(
  '/payments/:id/refund',
  requirePermission('pos:refund'),
  restaurantController.refundPayment,
);

// 5. TABLES & QR CODES
restaurantRouter.get(
  '/tables',
  requirePermission('floor:read'),
  restaurantController.getTables,
);
restaurantRouter.post(
  '/tables',
  requirePermission('floor:write'),
  restaurantController.createTable,
);
restaurantRouter.patch(
  '/tables/:id/status',
  requirePermission('floor:write'),
  restaurantController.updateTableStatus,
);
restaurantRouter.post(
  '/tables/:id/qr-regenerate',
  requirePermission('qr:manage'),
  restaurantController.regenerateTableQr,
);

// 6. STOCKS, MOVEMENTS & AUTOMATED ALERTS
restaurantRouter.get(
  '/stocks',
  requirePermission('stocks:read'),
  restaurantController.getStocks,
);
restaurantRouter.post(
  '/stocks',
  requirePermission('stocks:write'),
  restaurantController.createStockItem,
);
restaurantRouter.post(
  '/stocks/:id/move',
  requirePermission('stocks:write'),
  restaurantController.moveStock,
);
restaurantRouter.get(
  '/stocks/alerts/config',
  requirePermission('stocks:read'),
  restaurantController.getStockAlertConfig,
);
restaurantRouter.patch(
  '/stocks/alerts/config',
  requirePermission('stocks:write'),
  restaurantController.updateStockAlertConfig,
);
restaurantRouter.post(
  '/stocks/:id/alert-test',
  requirePermission('stocks:write'),
  restaurantController.triggerManualStockAlert,
);

// IN-APP NOTIFICATIONS
restaurantRouter.get(
  '/notifications',
  restaurantController.getNotifications,
);
restaurantRouter.patch(
  '/notifications/read',
  restaurantController.markNotificationsRead,
);

// 7. STAFF & GRANULAR PERMISSIONS
restaurantRouter.get(
  '/staff',
  requirePermission('staff:read'),
  restaurantController.getStaff,
);
restaurantRouter.post(
  '/staff',
  requirePermission('staff:manage'),
  restaurantController.createStaff,
);
restaurantRouter.patch(
  '/staff/:memberId',
  requirePermission('staff:manage'),
  restaurantController.updateStaff,
);

// 8. CUSTOMERS & RESERVATIONS
restaurantRouter.get(
  '/customers',
  requirePermission('customers:read'),
  restaurantController.getCustomers,
);
restaurantRouter.post(
  '/customers',
  requirePermission('customers:write'),
  restaurantController.createCustomer,
);
restaurantRouter.get(
  '/reservations',
  requirePermission('reservations:read'),
  restaurantController.getReservations,
);
restaurantRouter.post(
  '/reservations',
  requirePermission('reservations:write'),
  restaurantController.createReservation,
);
restaurantRouter.patch(
  '/reservations/:id/status',
  requirePermission('reservations:write'),
  restaurantController.updateReservationStatus,
);

// 9. FINANCE, EXPENSES, REPORTS & CSV EXPORT
restaurantRouter.get(
  '/finance',
  requirePermission('finance:read'),
  restaurantController.getFinance,
);
restaurantRouter.post(
  '/expenses',
  requirePermission('finance:read'),
  restaurantController.createExpense,
);
restaurantRouter.get(
  '/reports/export',
  requirePermission('reports:read'),
  restaurantController.exportOrdersCsv,
);

// 10. SETTINGS & SUPPORT TICKETS
restaurantRouter.get(
  '/settings',
  requirePermission('settings:read'),
  restaurantController.getSettings,
);
restaurantRouter.patch(
  '/settings',
  requirePermission('settings:write'),
  restaurantController.updateSettings,
);
restaurantRouter.get(
  '/tickets',
  requirePermission('settings:read'),
  restaurantController.getTickets,
);
restaurantRouter.post(
  '/tickets',
  requirePermission('settings:read'),
  restaurantController.createTicket,
);
