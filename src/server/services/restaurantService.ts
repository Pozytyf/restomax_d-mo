import bcrypt from 'bcryptjs';
import { getDb, generateId } from '../db.ts';
import { type AuthContext, recordAudit } from '../auth.ts';
import { ROLE_PERMISSION_CEILING } from '../rbac.ts';
import {
  broadcastOrderTrackerEvent,
  broadcastRestaurantEvent,
} from '../ws.ts';
import {
  RestaurantRepository,
  restaurantRepository,
} from '../repositories/restaurantRepository.ts';
import { BaseService } from './BaseService.ts';
import { AppError } from './errors.ts';
import { sendCriticalStockAlertEmail } from './mailer.ts';
import type { Permission, Role } from '../../types/index.ts';

export class RestaurantService extends BaseService<RestaurantRepository> {
  constructor(repo = restaurantRepository) {
    super(repo);
  }

  getDashboard(rid: string) {
    this.ensureTenantId(rid);
    const {
      revenueRow,
      pendingRow,
      tablesStats,
      revenueSeries,
      topItems,
      lowStocks,
      paymentBreakdown,
      recentOrders,
      staffActivity,
      expensesRow,
      collectedRow,
    } = restaurantRepository.getDashboardMetrics(rid);

    return {
      kpis: {
        totalRevenueXof: Number(revenueRow.total_revenue),
        collectedXof: Number(collectedRow.total_paid),
        expensesXof: Number(expensesRow.total_expenses),
        ordersCount: Number(revenueRow.orders_count),
        avgBasketXof: Math.round(Number(revenueRow.avg_basket)),
        pendingOrdersCount: Number(pendingRow.c),
        tablesTotal: Number(tablesStats.total),
        tablesOccupied: Number(tablesStats.occupied || 0),
        tablesReserved: Number(tablesStats.reserved || 0),
      },
      revenueSeries,
      topItems,
      lowStocks,
      paymentBreakdown,
      recentOrders,
      staffActivity,
    };
  }

  getMenu(rid: string) {
    const categories = restaurantRepository.findMenuCategories(rid);
    const itemsRaw = restaurantRepository.findMenuItems(rid);
    return {
      categories: categories.map((c) => ({ ...c, active: Boolean(c.active) })),
      items: itemsRaw.map((r) => ({
        ...r,
        available: Boolean(r.available),
        options: JSON.parse(String(r.options_json || '[]')),
      })),
    };
  }

  createCategory(rid: string, body: Record<string, unknown>) {
    const { name, station } = body || {};
    if (typeof name !== 'string' || name.trim().length < 2) {
      throw new AppError(400, 'Nom de catégorie requis.');
    }
    const st = station === 'BAR' ? 'BAR' : 'KITCHEN';
    const count = restaurantRepository.countCategories(rid);
    const id = restaurantRepository.createCategory(
      rid,
      name.trim(),
      st,
      count + 1,
    );
    return {
      id,
      restaurantId: rid,
      name: name.trim(),
      station: st,
      sortOrder: count + 1,
      active: true,
    };
  }

  createMenuItem(auth: AuthContext, body: Record<string, unknown>) {
    const rid = auth.restaurantId!;
    const { categoryId, name, description, priceXof, costPriceXof, options } =
      body || {};
    if (
      typeof categoryId !== 'string' ||
      typeof name !== 'string' ||
      name.trim().length < 2 ||
      !Number.isFinite(Number(priceXof)) ||
      Number(priceXof) < 0
    ) {
      throw new AppError(400, 'Données du produit invalides.');
    }

    const cat = restaurantRepository.findCategory(categoryId, rid);
    if (!cat) {
      throw new AppError(404, 'Catégorie introuvable.');
    }

    const cleanOptions = Array.isArray(options)
      ? options.map((o: { label?: string; priceDeltaXof?: number }) => ({
          id: generateId('opt'),
          label: String(o.label || '').trim(),
          priceDeltaXof: Math.max(0, Math.round(Number(o.priceDeltaXof || 0))),
        }))
      : [];

    const roundedPrice = Math.round(Number(priceXof));
    const id = restaurantRepository.createMenuItem({
      rid,
      categoryId,
      name: name.trim(),
      description: String(description || '').trim(),
      priceXof: roundedPrice,
      costPriceXof: Math.max(0, Math.round(Number(costPriceXof || 0))),
      optionsJson: JSON.stringify(cleanOptions),
    });

    recordAudit(getDb(), {
      actorUserId: auth.userId,
      actorEmail: auth.email,
      actorRole: auth.role,
      restaurantId: rid,
      action: 'MENU_ITEM_CREATED',
      targetType: 'MENU_ITEM',
      targetId: id,
      details: `${name.trim()} (${roundedPrice} FCFA)`,
    });

    return id;
  }

  updateMenuItem(rid: string, itemId: string, body: Record<string, unknown>) {
    const existing = restaurantRepository.findMenuItemById(itemId, rid);
    if (!existing) {
      throw new AppError(404, 'Article introuvable.');
    }

    const { available, priceXof, name, description } = body || {};
    restaurantRepository.updateMenuItem(itemId, rid, {
      available: typeof available === 'boolean' ? available : undefined,
      priceXof:
        Number.isFinite(Number(priceXof)) && Number(priceXof) >= 0
          ? Math.round(Number(priceXof))
          : undefined,
      name:
        typeof name === 'string' && name.trim().length >= 2
          ? name.trim()
          : undefined,
      description:
        typeof description === 'string' ? description.trim() : undefined,
    });

    broadcastRestaurantEvent(rid, 'menu:updated', { itemId });
  }

  getOrders(rid: string) {
    return restaurantRepository.findOrdersWithItems(rid);
  }

  createPosOrder(auth: AuthContext, body: Record<string, unknown>) {
    const rid = auth.restaurantId!;
    const {
      orderType,
      tableId,
      customerName,
      discountXof,
      notes,
      items,
      idempotencyKey,
    } = body || {};

    if (!Array.isArray(items) || items.length === 0) {
      throw new AppError(
        400,
        'La commande doit contenir au moins un article.',
      );
    }

    if (idempotencyKey) {
      const existing = restaurantRepository.findOrderByIdempotencyKey(
        rid,
        String(idempotencyKey),
      );
      if (existing) {
        return { order: existing, deduplicated: true };
      }
    }

    const resto = restaurantRepository.findRestaurantTaxAndMode(rid);
    if (tableId) {
      const tbl = restaurantRepository.findTableById(String(tableId), rid);
      if (!tbl) {
        throw new AppError(404, 'Table introuvable pour cet établissement.');
      }
    }

    const now = new Date().toISOString();
    const orderId = generateId('ord');
    const count = restaurantRepository.countOrders(rid);
    const orderNumber = `CMD-${1001 + count}`;

    const db = getDb();
    try {
      db.exec('BEGIN IMMEDIATE');
      let grossXof = 0;
      const lines: Array<{
        id: string;
        menuItemId: string;
        name: string;
        station: string;
        unitPriceXof: number;
        optionsSummary: string;
        optionsDeltaXof: number;
        quantity: number;
        lineTotalXof: number;
        notes: string;
      }> = [];

      for (const rawLine of items) {
        const line = rawLine as {
          menuItemId?: unknown;
          quantity?: unknown;
          optionIds?: unknown;
          notes?: unknown;
        };
        const qty = Math.max(
          1,
          Math.min(100, Math.floor(Number(line.quantity) || 1)),
        );
        const menuItem = restaurantRepository.findMenuItemWithStation(
          String(line.menuItemId),
          rid,
        );
        if (!menuItem || !menuItem.available) {
          throw new AppError(400, 'Article indisponible dans le catalogue.');
        }

        const dbOptions = JSON.parse(
          String(menuItem.options_json || '[]'),
        ) as Array<{ id: string; label: string; priceDeltaXof: number }>;
        const reqOptIds: string[] = Array.isArray(line.optionIds)
          ? line.optionIds.map(String)
          : [];
        const matched = dbOptions.filter((o) => reqOptIds.includes(o.id));
        const delta = matched.reduce(
          (acc, o) => acc + Number(o.priceDeltaXof || 0),
          0,
        );
        const unit = Number(menuItem.price_xof);
        const lineTotal = (unit + delta) * qty;
        grossXof += lineTotal;

        lines.push({
          id: generateId('oi'),
          menuItemId: String(menuItem.id),
          name: String(menuItem.name),
          station: String(menuItem.station || 'KITCHEN'),
          unitPriceXof: unit,
          optionsSummary: matched.map((o) => o.label).join(', '),
          optionsDeltaXof: delta,
          quantity: qty,
          lineTotalXof: lineTotal,
          notes: String(line.notes || '').slice(0, 200),
        });
      }

      const discount = Math.max(
        0,
        Math.min(grossXof, Math.round(Number(discountXof || 0))),
      );
      const totalXof = Math.max(0, grossXof - discount);
      const taxRate = Number(resto?.tax_rate_percent || 18);
      const subtotalXof = Math.round(totalXof / (1 + taxRate / 100));
      const taxXof = totalXof - subtotalXof;

      restaurantRepository.insertPosOrder({
        orderId,
        rid,
        orderNumber,
        orderType: orderType === 'TAKEAWAY' ? 'TAKEAWAY' : 'DINE_IN',
        tableId: tableId ? String(tableId) : null,
        customerName: String(customerName || 'Client sur place').slice(0, 80),
        subtotalXof,
        discountXof: discount,
        taxXof,
        totalXof,
        notes: String(notes || '').slice(0, 300),
        idempotencyKey: idempotencyKey ? String(idempotencyKey) : null,
        userId: auth.userId,
        now,
        lines,
      });

      db.exec('COMMIT');

      broadcastRestaurantEvent(rid, 'order:created', {
        orderId,
        orderNumber,
        totalXof,
      });

      return {
        deduplicated: false,
        order: {
          id: orderId,
          orderNumber,
          totalXof,
          status: 'PENDING',
          items: lines,
        },
      };
    } catch (err) {
      db.exec('ROLLBACK');
      if (err instanceof AppError) {
        throw err;
      }
      throw new AppError(500, 'Erreur création commande.');
    }
  }

  updateOrderStatus(auth: AuthContext, orderId: string, status: unknown) {
    const rid = auth.restaurantId!;
    const valid = [
      'PENDING',
      'IN_PREPARATION',
      'READY',
      'SERVED',
      'CANCELLED',
    ];
    if (!valid.includes(String(status))) {
      throw new AppError(400, 'Statut de commande invalide.');
    }

    const canKitchenOrOrders =
      auth.permissions.includes('kitchen:write') ||
      auth.permissions.includes('orders:write') ||
      auth.permissions.includes('pos:pay');
    if (!canKitchenOrOrders) {
      throw new AppError(403, 'Permission insuffisante.');
    }

    const order = restaurantRepository.findOrderForUpdate(orderId, rid);
    if (!order) {
      throw new AppError(404, 'Commande introuvable.');
    }

    restaurantRepository.updateOrderAndPrepStatus(
      orderId,
      rid,
      String(status),
      order.table_id,
    );

    broadcastRestaurantEvent(rid, 'order:updated', { orderId, status });
    broadcastOrderTrackerEvent(orderId, 'order:updated', { orderId, status });
  }

  getPayments(rid: string) {
    return restaurantRepository.findPayments(rid);
  }

  payOrder(
    auth: AuthContext,
    orderId: string,
    body: Record<string, unknown>,
  ) {
    const rid = auth.restaurantId!;
    const { amountXof, method, idempotencyKey } = body || {};

    const validMethods = ['CASH', 'ORANGE_MONEY', 'MTN_MOMO', 'WAVE', 'CARD'];
    if (!validMethods.includes(String(method))) {
      throw new AppError(400, 'Moyen de paiement invalide.');
    }

    const payAmount = Math.round(Number(amountXof || 0));
    if (!Number.isFinite(payAmount) || payAmount <= 0) {
      throw new AppError(400, 'Montant invalide.');
    }

    if (idempotencyKey) {
      const existing = restaurantRepository.findPaymentByIdempotencyKey(
        rid,
        String(idempotencyKey),
      );
      if (existing) {
        return { payment: existing, deduplicated: true };
      }
    }

    const resto = restaurantRepository.findRestaurantTaxAndMode(rid);
    const db = getDb();
    try {
      db.exec('BEGIN IMMEDIATE');
      const order = restaurantRepository.findOrderForUpdate(orderId, rid);
      if (!order) {
        throw new AppError(404, 'Commande introuvable.');
      }
      if (order.status === 'CANCELLED') {
        throw new AppError(400, 'Impossible d’encaisser une commande annulée.');
      }

      const remaining = Number(order.total_xof) - Number(order.paid_xof);
      if (remaining <= 0) {
        throw new AppError(409, 'Cette commande est déjà intégralement payée.');
      }
      if (payAmount > remaining) {
        throw new AppError(400, 'Le montant dépasse le solde restant dû.');
      }

      const newPaid = Number(order.paid_xof) + payAmount;
      const fullyPaid = newPaid >= Number(order.total_xof);
      const now = new Date().toISOString();
      const paymentId = generateId('pay');
      const mode = resto?.paydunya_mode === 'LIVE' ? 'LIVE' : 'TEST';
      const reference = `${mode}-${String(method).slice(0, 4)}-${Math.floor(100000 + Math.random() * 900000)}`;

      restaurantRepository.insertPaymentAndSettleOrder({
        paymentId,
        rid,
        orderId,
        amountXof: payAmount,
        method: String(method),
        mode,
        reference,
        idempotencyKey: idempotencyKey ? String(idempotencyKey) : null,
        userId: auth.userId,
        newPaid,
        fullyPaid,
        tableId: order.table_id,
        now,
      });

      recordAudit(db, {
        actorUserId: auth.userId,
        actorEmail: auth.email,
        actorRole: auth.role,
        restaurantId: rid,
        action: 'PAYMENT_RECORDED',
        targetType: 'ORDER',
        targetId: orderId,
        details: `${payAmount} FCFA via ${method} (${mode})`,
      });

      db.exec('COMMIT');

      broadcastRestaurantEvent(rid, 'payment:created', {
        orderId,
        paymentId,
        amountXof: payAmount,
        fullyPaid,
      });
      broadcastOrderTrackerEvent(orderId, 'order:updated', {
        orderId,
        status: fullyPaid ? 'PAID' : order.status,
      });

      return {
        deduplicated: false,
        payment: {
          id: paymentId,
          orderId,
          amountXof: payAmount,
          method,
          mode,
          reference,
          fullyPaid,
        },
      };
    } catch (err) {
      db.exec('ROLLBACK');
      if (err instanceof AppError) {
        throw err;
      }
      throw new AppError(500, 'Erreur lors de l’encaissement.');
    }
  }

  refundPayment(auth: AuthContext, paymentId: string) {
    const rid = auth.restaurantId!;
    const db = getDb();
    try {
      db.exec('BEGIN IMMEDIATE');
      const pay = restaurantRepository.findPaymentForRefund(paymentId, rid);
      if (!pay) {
        throw new AppError(404, 'Paiement introuvable.');
      }
      if (pay.status === 'REFUNDED') {
        throw new AppError(409, 'Ce paiement a déjà été remboursé.');
      }

      restaurantRepository.markPaymentRefunded(
        paymentId,
        rid,
        pay.order_id,
        pay.amount_xof,
      );

      recordAudit(db, {
        actorUserId: auth.userId,
        actorEmail: auth.email,
        actorRole: auth.role,
        restaurantId: rid,
        action: 'PAYMENT_REFUNDED',
        targetType: 'PAYMENT',
        targetId: paymentId,
        details: `Remboursement de ${pay.amount_xof} FCFA`,
      });

      db.exec('COMMIT');
    } catch (err) {
      db.exec('ROLLBACK');
      if (err instanceof AppError) {
        throw err;
      }
      throw new AppError(500, 'Erreur remboursement.');
    }
  }

  getTables(rid: string) {
    return restaurantRepository.findTablesWithQrAndActiveOrder(rid);
  }

  createTable(rid: string, body: Record<string, unknown>) {
    const { zone, label, capacity } = body || {};
    if (typeof label !== 'string' || label.trim().length < 1) {
      throw new AppError(400, 'Nom de table requis.');
    }
    const { tableId, qrToken } = restaurantRepository.createTableWithQr(
      rid,
      String(zone || 'Salle principale').trim(),
      label.trim(),
      Math.max(1, Math.min(24, Number(capacity) || 4)),
    );
    return { id: tableId, qrToken };
  }

  updateTableStatus(rid: string, tableId: string, status: unknown) {
    if (!['AVAILABLE', 'OCCUPIED', 'RESERVED'].includes(String(status))) {
      throw new AppError(400, 'Statut de table invalide.');
    }
    restaurantRepository.updateTableStatus(tableId, rid, String(status));
    broadcastRestaurantEvent(rid, 'table:updated', { tableId, status });
  }

  regenerateTableQr(auth: AuthContext, tableId: string) {
    const rid = auth.restaurantId!;
    const tbl = restaurantRepository.findTableById(tableId, rid);
    if (!tbl) {
      throw new AppError(404, 'Table introuvable.');
    }
    const result = restaurantRepository.regenerateTableQr(tableId, rid);
    recordAudit(getDb(), {
      actorUserId: auth.userId,
      actorEmail: auth.email,
      actorRole: auth.role,
      restaurantId: rid,
      action: 'QR_REGENERATED',
      targetType: 'TABLE',
      targetId: tableId,
      details: `${tbl.label} -> version ${result.version}`,
    });
    return result;
  }

  getStocks(rid: string) {
    return restaurantRepository.findStocksAndMovements(rid);
  }

  private resolveStockAlertRecipients(
    rid: string,
    customEmailsCsv: string,
  ): string[] {
    const parsed = customEmailsCsv
      .split(/[,;\s]+/)
      .map((e) => e.trim().toLowerCase())
      .filter((e) => e.includes('@'));
    if (parsed.length > 0) {
      return Array.from(new Set(parsed));
    }
    return restaurantRepository.findManagerEmailsForRestaurant(rid);
  }

  async dispatchCriticalStockAlert(params: {
    auth: AuthContext;
    stockId: string;
    stockName: string;
    quantity: number;
    minThreshold: number;
    unit: string;
    supplierName: string;
  }) {
    const rid = params.auth.restaurantId!;
    const settings = restaurantRepository.findStockAlertSettings(rid);
    const recipients = this.resolveStockAlertRecipients(
      rid,
      settings.recipientEmails,
    );
    const restaurantName = restaurantRepository.findRestaurantNameById(rid);

    let emailResult: {
      dispatched: boolean;
      status: 'SENT' | 'QUEUED_NO_SMTP' | 'SKIPPED' | 'FAILED';
      recipients: string[];
    } = {
      dispatched: false,
      status: 'SKIPPED',
      recipients,
    };

    if (settings.emailEnabled && recipients.length > 0) {
      emailResult = await sendCriticalStockAlertEmail({
        restaurantName,
        stockName: params.stockName,
        quantity: params.quantity,
        minThreshold: params.minThreshold,
        unit: params.unit,
        supplierName: params.supplierName,
        recipients,
      });
    }

    const title = `Stock critique : ${params.stockName}`;
    const message = `${params.stockName} est à ${params.quantity} ${params.unit} (seuil minimal : ${params.minThreshold} ${params.unit}).`;

    let notification = null;
    if (settings.inAppEnabled) {
      notification = restaurantRepository.createNotification({
        rid,
        type: 'STOCK_CRITICAL',
        title,
        message,
        stockId: params.stockId,
        emailDispatched: emailResult.dispatched,
        emailRecipients: emailResult.recipients.join(', '),
        emailStatus: emailResult.status,
      });
    }

    recordAudit(getDb(), {
      actorUserId: params.auth.userId,
      actorEmail: params.auth.email,
      actorRole: params.auth.role,
      restaurantId: rid,
      action: 'STOCK_CRITICAL_ALERT',
      targetType: 'STOCK',
      targetId: params.stockId,
      details: `${params.stockName}: ${params.quantity}/${params.minThreshold} ${params.unit} (email=${emailResult.status})`,
    });

    broadcastRestaurantEvent(rid, 'stock:alert', {
      stockId: params.stockId,
      name: params.stockName,
      quantity: params.quantity,
      minThreshold: params.minThreshold,
      unit: params.unit,
      notificationId: notification?.id || null,
      emailStatus: emailResult.status,
    });

    return {
      notification,
      emailStatus: emailResult.status,
      recipients: emailResult.recipients,
    };
  }

  async createStockItem(auth: AuthContext, body: Record<string, unknown>) {
    const rid = auth.restaurantId!;
    const { name, unit, quantity, minThreshold, unitCostXof, supplierName } =
      body || {};
    if (typeof name !== 'string' || name.trim().length < 2) {
      throw new AppError(400, 'Nom d’ingrédient requis.');
    }
    const cleanName = name.trim();
    const cleanUnit = String(unit || 'kg').trim();
    const cleanQty = Math.max(0, Number(quantity || 0));
    const cleanThreshold = Math.max(0, Number(minThreshold ?? 5));
    const cleanSupplier = String(supplierName || '').trim();

    const id = restaurantRepository.createStockItem({
      rid,
      name: cleanName,
      unit: cleanUnit,
      quantity: cleanQty,
      minThreshold: cleanThreshold,
      unitCostXof: Math.round(Number(unitCostXof || 0)),
      supplierName: cleanSupplier,
    });

    if (cleanQty <= cleanThreshold) {
      await this.dispatchCriticalStockAlert({
        auth,
        stockId: id,
        stockName: cleanName,
        quantity: cleanQty,
        minThreshold: cleanThreshold,
        unit: cleanUnit,
        supplierName: cleanSupplier,
      });
    }

    return id;
  }

  async moveStock(
    auth: AuthContext,
    stockId: string,
    body: Record<string, unknown>,
  ) {
    const rid = auth.restaurantId!;
    const { movementType, quantity, reason } = body || {};
    const validTypes = ['IN', 'OUT', 'LOSS', 'INVENTORY'];
    if (!validTypes.includes(String(movementType))) {
      throw new AppError(400, 'Type de mouvement invalide.');
    }
    const qty = Number(quantity);
    if (!Number.isFinite(qty) || qty < 0) {
      throw new AppError(400, 'Quantité invalide.');
    }

    const stock = restaurantRepository.findStockById(stockId, rid);
    if (!stock) {
      throw new AppError(404, 'Article de stock introuvable.');
    }

    const delta =
      movementType === 'IN'
        ? qty
        : movementType === 'INVENTORY'
          ? qty - stock.quantity
          : -qty;
    const nextQty = Math.max(0, stock.quantity + delta);

    restaurantRepository.applyStockMovement({
      rid,
      stockId: stock.id,
      nextQty,
      movementType: String(movementType),
      delta,
      reason: String(reason || '').trim(),
      userId: auth.userId,
    });

    let alertTriggered = false;
    if (nextQty <= stock.min_threshold && nextQty !== stock.quantity) {
      alertTriggered = true;
      await this.dispatchCriticalStockAlert({
        auth,
        stockId: stock.id,
        stockName: stock.name,
        quantity: nextQty,
        minThreshold: stock.min_threshold,
        unit: stock.unit,
        supplierName: stock.supplier_name,
      });
    }

    return { quantity: nextQty, alertTriggered };
  }

  getStockAlertConfig(rid: string) {
    this.ensureTenantId(rid);
    const settings = restaurantRepository.findStockAlertSettings(rid);
    const resolvedRecipients = this.resolveStockAlertRecipients(
      rid,
      settings.recipientEmails,
    );
    const recentAlerts = restaurantRepository.findRecentStockAlerts(rid);
    return {
      settings: {
        ...settings,
        resolvedRecipients,
      },
      recentAlerts,
    };
  }

  updateStockAlertConfig(auth: AuthContext, body: Record<string, unknown>) {
    const rid = auth.restaurantId!;
    const { inAppEnabled, emailEnabled, recipientEmails } = body || {};
    const current = restaurantRepository.findStockAlertSettings(rid);

    const updated = restaurantRepository.upsertStockAlertSettings({
      rid,
      inAppEnabled:
        typeof inAppEnabled === 'boolean' ? inAppEnabled : current.inAppEnabled,
      emailEnabled:
        typeof emailEnabled === 'boolean' ? emailEnabled : current.emailEnabled,
      recipientEmails:
        typeof recipientEmails === 'string'
          ? recipientEmails.trim()
          : current.recipientEmails,
    });

    recordAudit(getDb(), {
      actorUserId: auth.userId,
      actorEmail: auth.email,
      actorRole: auth.role,
      restaurantId: rid,
      action: 'STOCK_ALERT_CONFIG_UPDATED',
      targetType: 'RESTAURANT',
      targetId: rid,
      details: `inApp=${updated.inAppEnabled} email=${updated.emailEnabled}`,
    });

    return {
      ...updated,
      resolvedRecipients: this.resolveStockAlertRecipients(
        rid,
        updated.recipientEmails,
      ),
    };
  }

  async triggerManualStockAlert(auth: AuthContext, stockId: string) {
    const rid = auth.restaurantId!;
    const stock = restaurantRepository.findStockById(stockId, rid);
    if (!stock) {
      throw new AppError(404, 'Article de stock introuvable.');
    }
    return this.dispatchCriticalStockAlert({
      auth,
      stockId: stock.id,
      stockName: stock.name,
      quantity: stock.quantity,
      minThreshold: stock.min_threshold,
      unit: stock.unit,
      supplierName: stock.supplier_name,
    });
  }

  getNotifications(rid: string) {
    this.ensureTenantId(rid);
    const notifications =
      restaurantRepository.findNotificationsForRestaurant(rid);
    const unreadCount = notifications.filter((n) => !n.isRead).length;
    return { notifications, unreadCount };
  }

  markNotificationsRead(rid: string, body: Record<string, unknown>) {
    this.ensureTenantId(rid);
    const id = typeof body?.id === 'string' ? body.id : undefined;
    restaurantRepository.markNotificationsRead(rid, id);
    broadcastRestaurantEvent(rid, 'notifications:updated', {
      id: id || null,
    });
  }

  getStaff(rid: string) {
    const rows = restaurantRepository.findStaffMembers(rid);
    const staff = rows.map((r) => ({
      ...r,
      customPermissions: JSON.parse(String(r.custom_permissions_json || '[]')),
    }));
    return { staff, roleCeilings: ROLE_PERMISSION_CEILING };
  }

  createStaff(auth: AuthContext, body: Record<string, unknown>) {
    const rid = auth.restaurantId!;
    const { fullName, email, phone, role, password, customPermissions } =
      body || {};
    const allowedRoles: Role[] = [
      'MANAGER',
      'CASHIER',
      'WAITER',
      'KITCHEN_BAR',
    ];
    if (
      typeof fullName !== 'string' ||
      fullName.trim().length < 2 ||
      typeof email !== 'string' ||
      !email.includes('@') ||
      !allowedRoles.includes(role as Role)
    ) {
      throw new AppError(400, 'Informations employé ou rôle invalide.');
    }

    const cleanEmail = email.trim().toLowerCase();
    const existing = restaurantRepository.findUserByEmail(cleanEmail);
    if (existing) {
      throw new AppError(
        409,
        'Un compte utilisateur existe déjà avec cet email.',
      );
    }

    const pwd =
      typeof password === 'string' && password.length >= 8
        ? password
        : 'RestoMax2026!';
    const ceiling = ROLE_PERMISSION_CEILING[role as Role];
    const safeCustom: Permission[] = Array.isArray(customPermissions)
      ? customPermissions.filter((p) => ceiling.includes(p))
      : [];

    const { memberId, userId } = restaurantRepository.createStaffUserAndMember({
      rid,
      email: cleanEmail,
      passwordHash: bcrypt.hashSync(pwd, 10),
      fullName: fullName.trim(),
      phone: String(phone || '').trim() || null,
      role: role as Role,
      customPermissions: safeCustom,
    });

    recordAudit(getDb(), {
      actorUserId: auth.userId,
      actorEmail: auth.email,
      actorRole: auth.role,
      restaurantId: rid,
      action: 'STAFF_CREATED',
      targetType: 'USER',
      targetId: userId,
      details: `${fullName.trim()} (${role})`,
    });

    return { id: memberId, userId };
  }

  updateStaff(
    auth: AuthContext,
    memberId: string,
    body: Record<string, unknown>,
  ) {
    const rid = auth.restaurantId!;
    const member = restaurantRepository.findMemberById(memberId, rid);
    if (!member) {
      throw new AppError(404, 'Membre introuvable.');
    }
    if (member.role === 'OWNER') {
      throw new AppError(
        400,
        'Impossible de suspendre le propriétaire principal ici.',
      );
    }

    const { status, role, customPermissions } = body || {};
    const validStatus =
      status && ['ACTIVE', 'SUSPENDED', 'REVOKED'].includes(String(status))
        ? String(status)
        : undefined;
    const validRole =
      role &&
      ['MANAGER', 'CASHIER', 'WAITER', 'KITCHEN_BAR'].includes(String(role))
        ? (String(role) as Role)
        : undefined;

    let boundedPerms: Permission[] | undefined;
    if (Array.isArray(customPermissions)) {
      const targetRole = (validRole || member.role) as Role;
      const ceiling = ROLE_PERMISSION_CEILING[targetRole] || [];
      boundedPerms = customPermissions.filter((p) => ceiling.includes(p));
    }

    restaurantRepository.updateStaffMember(member.id, rid, member.user_id, {
      status: validStatus,
      role: validRole,
      customPermissions: boundedPerms,
    });

    recordAudit(getDb(), {
      actorUserId: auth.userId,
      actorEmail: auth.email,
      actorRole: auth.role,
      restaurantId: rid,
      action: 'STAFF_UPDATED',
      targetType: 'MEMBER',
      targetId: member.id,
      details: `status=${status || 'unchanged'} role=${role || 'unchanged'}`,
    });
  }

  getCustomers(rid: string) {
    return restaurantRepository.findCustomers(rid);
  }

  createCustomer(rid: string, body: Record<string, unknown>) {
    const { fullName, phone, email, preferences } = body || {};
    if (typeof fullName !== 'string' || typeof phone !== 'string') {
      throw new AppError(400, 'Nom et téléphone requis.');
    }
    return restaurantRepository.createCustomer({
      rid,
      fullName: fullName.trim(),
      phone: phone.trim(),
      email: String(email || '').trim(),
      preferences: String(preferences || '').trim(),
    });
  }

  getReservations(rid: string) {
    return restaurantRepository.findReservations(rid);
  }

  createReservation(rid: string, body: Record<string, unknown>) {
    const { customerName, customerPhone, partySize, reservedAt, tableId, notes } =
      body || {};
    if (
      typeof customerName !== 'string' ||
      typeof customerPhone !== 'string' ||
      typeof reservedAt !== 'string'
    ) {
      throw new AppError(400, 'Champs de réservation incomplets.');
    }
    return restaurantRepository.createReservation({
      rid,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      partySize: Math.max(1, Number(partySize || 2)),
      reservedAt,
      tableId: tableId ? String(tableId) : null,
      notes: String(notes || '').trim(),
    });
  }

  updateReservationStatus(rid: string, id: string, status: unknown) {
    if (
      !['PENDING', 'CONFIRMED', 'SEATED', 'CANCELLED'].includes(String(status))
    ) {
      throw new AppError(400, 'Statut invalide.');
    }
    restaurantRepository.updateReservationStatus(id, rid, String(status));
  }

  getFinanceSummary(rid: string) {
    const {
      sales,
      todayDate,
      todaySales,
      todayPayments,
      cogsRow,
      expenses,
      byMethod,
    } = restaurantRepository.findFinanceSummary(rid);
    const totalExpenses = expenses.reduce(
      (acc, e) => acc + Number(e.amountXof || 0),
      0,
    );
    return {
      summary: {
        grossSalesXof: Number(sales.gross_sales),
        collectedXof: Number(sales.collected),
        taxCollectedXof: Number(sales.total_tax),
        cogsXof: Number(cogsRow.total_cogs),
        expensesXof: totalExpenses,
        netEstimatedMarginXof:
          Number(sales.gross_sales) - Number(cogsRow.total_cogs) - totalExpenses,
      },
      today: {
        date: todayDate,
        revenueXof: Number(todaySales.revenue_xof),
        collectedXof: Number(todayPayments.collected_xof),
        ordersCount: Number(todaySales.orders_count),
        avgBasketXof: Math.round(Number(todaySales.avg_basket)),
      },
      expenses,
      byMethod,
    };
  }

  createExpense(rid: string, body: Record<string, unknown>) {
    const { category, description, amountXof, expenseDate } = body || {};
    if (
      typeof category !== 'string' ||
      typeof description !== 'string' ||
      !Number.isFinite(Number(amountXof)) ||
      Number(amountXof) <= 0
    ) {
      throw new AppError(400, 'Dépense invalide.');
    }
    return restaurantRepository.createExpense({
      rid,
      category: category.trim(),
      description: description.trim(),
      amountXof: Math.round(Number(amountXof)),
      expenseDate: expenseDate ? String(expenseDate) : undefined,
    });
  }

  exportOrdersCsv(rid: string): string {
    const rows = restaurantRepository.findOrdersForCsvExport(rid);
    const header = 'Numero,Type,Client,Statut,Total_FCFA,Paye_FCFA,Date';
    const lines = rows.map(
      (r) =>
        `"${r.order_number}","${r.order_type}","${String(r.customer_name).replace(/"/g, '""')}","${r.status}",${r.total_xof},${r.paid_xof},"${r.created_at}"`,
    );
    return [header, ...lines].join('\n');
  }

  getSettings(rid: string) {
    const { resto, sub } = restaurantRepository.findRestaurantSettings(rid);
    return {
      restaurant: {
        id: resto.id,
        name: resto.name,
        slug: resto.slug,
        email: resto.email,
        phone: resto.phone,
        address: resto.address,
        city: resto.city,
        country: resto.country,
        currency: resto.currency,
        timezone: resto.timezone,
        taxRatePercent: resto.taxRatePercent,
        serviceFeePercent: resto.serviceFeePercent,
        openingHours: resto.openingHours,
        paydunyaMode: resto.paydunyaMode,
        paydunyaConfigured: Boolean(
          resto.paydunya_public_key &&
            resto.paydunya_private_key &&
            resto.paydunya_token,
        ),
        status: resto.status,
        createdAt: resto.createdAt,
      },
      subscription: sub || null,
    };
  }

  updateSettings(auth: AuthContext, body: Record<string, unknown>) {
    const rid = auth.restaurantId!;
    const {
      name,
      phone,
      address,
      city,
      openingHours,
      taxRatePercent,
      paydunyaMode,
      paydunyaPublicKey,
      paydunyaPrivateKey,
      paydunyaToken,
    } = body || {};

    restaurantRepository.updateRestaurantSettings(rid, {
      name: name ? String(name).trim() : null,
      phone: phone !== undefined ? String(phone).trim() : null,
      address: address !== undefined ? String(address).trim() : null,
      city: city ? String(city).trim() : null,
      openingHours: openingHours ? String(openingHours).trim() : null,
      taxRatePercent: Number.isFinite(Number(taxRatePercent))
        ? Number(taxRatePercent)
        : null,
      paydunyaMode:
        paydunyaMode === 'LIVE' || paydunyaMode === 'TEST'
          ? paydunyaMode
          : null,
      paydunyaPublicKey: paydunyaPublicKey ? String(paydunyaPublicKey) : undefined,
      paydunyaPrivateKey: paydunyaPrivateKey
        ? String(paydunyaPrivateKey)
        : undefined,
      paydunyaToken: paydunyaToken ? String(paydunyaToken) : undefined,
    });

    recordAudit(getDb(), {
      actorUserId: auth.userId,
      actorEmail: auth.email,
      actorRole: auth.role,
      restaurantId: rid,
      action: 'SETTINGS_UPDATED',
      targetType: 'RESTAURANT',
      targetId: rid,
    });
  }

  getTickets(rid: string) {
    return restaurantRepository.findTicketsForRestaurant(rid);
  }

  createTicket(auth: AuthContext, body: Record<string, unknown>) {
    const { subject, category, priority, message } = body || {};
    if (typeof subject !== 'string' || typeof message !== 'string') {
      throw new AppError(400, 'Sujet et message requis.');
    }
    return restaurantRepository.createSupportTicket({
      rid: auth.restaurantId!,
      email: auth.email,
      fullName: auth.fullName,
      role: auth.role,
      subject: subject.trim(),
      category: String(category || 'Général'),
      priority: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'].includes(String(priority))
        ? String(priority)
        : 'MEDIUM',
      message: message.trim(),
    });
  }
}

export const restaurantService = new RestaurantService();
