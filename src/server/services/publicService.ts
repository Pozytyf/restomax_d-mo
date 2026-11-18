import QRCode from 'qrcode';
import { getDb, generateId } from '../db.ts';
import { publicRepository } from '../repositories/publicRepository.ts';
import { broadcastRestaurantEvent } from '../ws.ts';
import { AppError } from './errors.ts';

export const publicService = {
  getActivePlans() {
    const rows = publicRepository.findActivePlans();
    return rows.map((r) => ({
      id: r.id,
      code: r.code,
      name: r.name,
      tagline: r.tagline,
      priceMonthlyXof: Number(r.price_monthly_xof),
      priceYearlyXof: Number(r.price_yearly_xof),
      trialDays: Number(r.trial_days),
      maxTables: Number(r.max_tables),
      maxStaff: Number(r.max_staff),
      maxMenuItems: Number(r.max_menu_items),
      isDemoPricing: Boolean(r.is_demo_pricing),
      isFeatured: Boolean(r.is_featured),
      features: JSON.parse(String(r.features_json || '[]')),
      active: Boolean(r.active),
    }));
  },

  getPlatformSettings(): Record<string, string> {
    const rows = publicRepository.findAllPlatformSettings();
    const settings: Record<string, string> = {};
    for (const row of rows) {
      settings[row.key] = row.value;
    }
    return settings;
  },

  submitContactLead(body: Record<string, unknown>) {
    const { fullName, email, phone, restaurantName, city, message, website } =
      body || {};
    if (website) {
      return { ok: true, honeypot: true };
    }
    if (
      typeof fullName !== 'string' ||
      fullName.trim().length < 2 ||
      typeof email !== 'string' ||
      !email.includes('@') ||
      typeof message !== 'string' ||
      message.trim().length < 5
    ) {
      throw new AppError(
        400,
        'Veuillez renseigner votre nom, un email valide et un message.',
      );
    }

    const id = publicRepository.createLead({
      leadType: 'CONTACT',
      fullName: fullName.trim(),
      email: email.trim().toLowerCase(),
      phone: String(phone || '').trim(),
      restaurantName: String(restaurantName || '').trim(),
      city: String(city || '').trim(),
      message: message.trim(),
    });

    return {
      ok: true,
      id,
      message:
        'Votre message a bien été enregistré. Notre équipe vous répondra rapidement.',
    };
  },

  submitDemoRequest(body: Record<string, unknown>) {
    const { fullName, email, phone, restaurantName, city, message, website } =
      body || {};
    if (website) {
      return { ok: true, honeypot: true };
    }
    if (
      typeof fullName !== 'string' ||
      fullName.trim().length < 2 ||
      typeof email !== 'string' ||
      !email.includes('@') ||
      typeof restaurantName !== 'string' ||
      restaurantName.trim().length < 2
    ) {
      throw new AppError(
        400,
        'Veuillez renseigner votre nom, email et le nom du restaurant.',
      );
    }

    const id = publicRepository.createLead({
      leadType: 'DEMO_REQUEST',
      fullName: fullName.trim(),
      email: email.trim().toLowerCase(),
      phone: String(phone || '').trim(),
      restaurantName: restaurantName.trim(),
      city: String(city || 'Abidjan').trim(),
      message: String(message || 'Demande de démonstration guidée').trim(),
    });

    return {
      ok: true,
      id,
      message: 'Demande de démonstration enregistrée avec succès.',
    };
  },

  async generateQrSvg(token: string, baseUrl: string): Promise<string> {
    try {
      const targetUrl = `${baseUrl}/q/${encodeURIComponent(token)}`;
      return await QRCode.toString(targetUrl, {
        type: 'svg',
        margin: 2,
        color: { dark: '#182333', light: '#FFFFFF' },
      });
    } catch {
      throw new AppError(500, 'Impossible de générer le QR code.');
    }
  },

  getQrMenuContext(token: string) {
    const qrRow = publicRepository.findQrContextByToken(token);
    if (!qrRow) {
      throw new AppError(404, 'QR code introuvable ou invalide.');
    }
    if (qrRow.qr_status !== 'ACTIVE') {
      throw new AppError(
        410,
        'Ce QR code a été révoqué. Veuillez demander le nouveau QR code de votre table.',
      );
    }
    if (
      qrRow.deleted_at ||
      qrRow.restaurant_status === 'SUSPENDED' ||
      qrRow.restaurant_status === 'DELETED'
    ) {
      throw new AppError(
        403,
        'Cet établissement n’accepte pas de commandes en ligne actuellement.',
      );
    }

    const restaurantId = String(qrRow.restaurant_id);
    const tableId = String(qrRow.table_id);
    const expiresAt = new Date(Date.now() + 4 * 3600 * 1000).toISOString();
    const sessionId = publicRepository.createQrTableSession({
      restaurantId,
      tableId,
      qrToken: token,
      expiresAt,
    });

    const categories = publicRepository.findActiveCategories(restaurantId);
    const itemsRaw = publicRepository.findAvailableMenuItems(restaurantId);
    const items = itemsRaw.map((it) => ({
      id: it.id,
      categoryId: it.category_id,
      name: it.name,
      description: it.description,
      priceXof: Number(it.price_xof),
      imageUrl: it.image_url,
      options: JSON.parse(String(it.options_json || '[]')),
    }));

    return {
      sessionId,
      restaurant: {
        id: restaurantId,
        name: qrRow.restaurant_name,
        city: qrRow.city,
        currency: qrRow.currency,
        taxRatePercent: Number(qrRow.tax_rate_percent),
        openingHours: qrRow.opening_hours,
      },
      table: {
        id: tableId,
        label: qrRow.table_label,
        zone: qrRow.table_zone,
      },
      categories,
      items,
    };
  },

  submitQrOrder(token: string, body: Record<string, unknown>) {
    const { sessionId, customerName, notes, items, idempotencyKey } = body || {};

    if (!Array.isArray(items) || items.length === 0) {
      throw new AppError(400, 'Votre panier est vide.');
    }

    const qrRow = publicRepository.findQrContextByToken(token);
    if (!qrRow || qrRow.qr_status !== 'ACTIVE') {
      throw new AppError(410, 'QR code révoqué ou invalide.');
    }
    if (
      qrRow.deleted_at ||
      qrRow.restaurant_status === 'SUSPENDED' ||
      qrRow.restaurant_status === 'DELETED'
    ) {
      throw new AppError(403, 'Restaurant indisponible.');
    }

    const restaurantId = String(qrRow.restaurant_id);
    const tableId = String(qrRow.table_id);

    if (sessionId) {
      const sess = publicRepository.findQrTableSession(String(sessionId));
      if (
        !sess ||
        sess.restaurant_id !== restaurantId ||
        sess.table_id !== tableId ||
        new Date(String(sess.expires_at)).getTime() < Date.now()
      ) {
        throw new AppError(
          403,
          'Session de table invalide ou expirée. Veuillez rescanner le QR code.',
        );
      }
    }

    if (idempotencyKey) {
      const existing = publicRepository.findOrderByIdempotencyKey(
        restaurantId,
        String(idempotencyKey),
      );
      if (existing) {
        return {
          deduplicated: true,
          order: {
            id: existing.id,
            orderNumber: existing.order_number,
            totalXof: Number(existing.total_xof),
            status: existing.status,
          },
        };
      }
    }

    const db = getDb();
    const now = new Date().toISOString();
    const orderId = generateId('ord');
    const orderCount = publicRepository.countOrdersForRestaurant(restaurantId);
    const orderNumber = `CMD-${1001 + orderCount}`;

    try {
      db.exec('BEGIN IMMEDIATE');

      let subtotalXof = 0;
      const preparedLines: Array<{
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
          Math.min(50, Math.floor(Number(line.quantity) || 1)),
        );
        const menuItem = publicRepository.findMenuItemWithStation(
          String(line.menuItemId),
          restaurantId,
        );

        if (!menuItem || !menuItem.available) {
          throw new AppError(
            400,
            'Un ou plusieurs articles sélectionnés ne sont plus disponibles.',
          );
        }

        const dbOptions = JSON.parse(
          String(menuItem.options_json || '[]'),
        ) as Array<{ id: string; label: string; priceDeltaXof: number }>;

        const selectedOptionIds: string[] = Array.isArray(line.optionIds)
          ? line.optionIds.map(String)
          : [];
        const matchedOptions = dbOptions.filter((o) =>
          selectedOptionIds.includes(o.id),
        );
        const optionsDeltaXof = matchedOptions.reduce(
          (acc, o) => acc + Number(o.priceDeltaXof || 0),
          0,
        );
        const optionsSummary = matchedOptions.map((o) => o.label).join(', ');
        const unitPriceXof = Number(menuItem.price_xof);
        const lineTotalXof = (unitPriceXof + optionsDeltaXof) * qty;
        subtotalXof += lineTotalXof;

        preparedLines.push({
          id: generateId('oi'),
          menuItemId: String(menuItem.id),
          name: String(menuItem.name),
          station: String(menuItem.station || 'KITCHEN'),
          unitPriceXof,
          optionsSummary,
          optionsDeltaXof,
          quantity: qty,
          lineTotalXof,
          notes: String(line.notes || '').slice(0, 200),
        });
      }

      const totalXof = subtotalXof;
      const taxRate = Number(qrRow.tax_rate_percent || 18);
      const ht = Math.round(totalXof / (1 + taxRate / 100));
      const taxXof = totalXof - ht;

      publicRepository.insertQrOrderTransaction({
        orderId,
        restaurantId,
        orderNumber,
        tableId,
        customerName: String(
          customerName || `${qrRow.table_label} (Client QR)`,
        ).slice(0, 80),
        subtotalHtXof: ht,
        taxXof,
        totalXof,
        notes: String(notes || '').slice(0, 300),
        idempotencyKey: idempotencyKey ? String(idempotencyKey) : null,
        now,
        lines: preparedLines,
      });

      db.exec('COMMIT');

      broadcastRestaurantEvent(restaurantId, 'order:created', {
        orderId,
        orderNumber,
        orderType: 'QR_TABLE',
        tableId,
        totalXof,
      });
      broadcastRestaurantEvent(restaurantId, 'table:updated', {
        tableId,
        status: 'OCCUPIED',
      });

      return {
        deduplicated: false,
        order: {
          id: orderId,
          orderNumber,
          tableLabel: qrRow.table_label,
          totalXof,
          status: 'PENDING',
          createdAt: now,
          items: preparedLines,
        },
      };
    } catch (err) {
      db.exec('ROLLBACK');
      if (err instanceof AppError) {
        throw err;
      }
      throw new AppError(500, 'Erreur lors de l’envoi de la commande.');
    }
  },

  trackQrOrder(token: string, orderId: string) {
    const result = publicRepository.findTrackedQrOrder(token, orderId);
    if (!result) {
      throw new AppError(404, 'Commande introuvable pour cette table.');
    }
    const { order, items } = result;
    return {
      id: order.id,
      orderNumber: order.order_number,
      status: order.status,
      totalXof: Number(order.total_xof),
      paidXof: Number(order.paid_xof),
      tableLabel: order.table_label,
      restaurantName: order.restaurant_name,
      createdAt: order.created_at,
      updatedAt: order.updated_at,
      items,
    };
  },
};
