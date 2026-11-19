import type { Request, Response } from 'express';
import { restaurantService } from '../services/restaurantService.ts';
import { handleControllerError } from '../services/errors.ts';

export const restaurantController = {
  getDashboard(req: Request, res: Response) {
    try {
      const data = restaurantService.getDashboard(req.auth!.restaurantId!);
      res.json(data);
    } catch (err) {
      handleControllerError(res, err, 'Erreur chargement dashboard.');
    }
  },

  getMenu(req: Request, res: Response) {
    try {
      const menu = restaurantService.getMenu(req.auth!.restaurantId!);
      res.json(menu);
    } catch (err) {
      handleControllerError(res, err, 'Erreur chargement menu.');
    }
  },

  createCategory(req: Request, res: Response) {
    try {
      const category = restaurantService.createCategory(
        req.auth!.restaurantId!,
        req.body || {},
      );
      res.status(201).json({ category });
    } catch (err) {
      handleControllerError(res, err, 'Erreur création catégorie.');
    }
  },

  createMenuItem(req: Request, res: Response) {
    try {
      const id = restaurantService.createMenuItem(req.auth!, req.body || {});
      res.status(201).json({ id });
    } catch (err) {
      handleControllerError(res, err, 'Erreur création article.');
    }
  },

  updateMenuItem(req: Request, res: Response) {
    try {
      restaurantService.updateMenuItem(
        req.auth!.restaurantId!,
        String(req.params.id),
        req.body || {},
      );
      res.json({ ok: true });
    } catch (err) {
      handleControllerError(res, err, 'Erreur mise à jour article.');
    }
  },

  getOrders(req: Request, res: Response) {
    try {
      const orders = restaurantService.getOrders(req.auth!.restaurantId!);
      res.json({ orders });
    } catch (err) {
      handleControllerError(res, err, 'Erreur chargement commandes.');
    }
  },

  createPosOrder(req: Request, res: Response) {
    try {
      const result = restaurantService.createPosOrder(
        req.auth!,
        req.body || {},
      );
      if (result.deduplicated) {
        res.status(200).json({ order: result.order, deduplicated: true });
        return;
      }
      res.status(201).json({ order: result.order });
    } catch (err) {
      handleControllerError(res, err, 'Erreur création commande.');
    }
  },

  updateOrderStatus(req: Request, res: Response) {
    try {
      restaurantService.updateOrderStatus(
        req.auth!,
        String(req.params.id),
        req.body?.status,
      );
      res.json({ ok: true });
    } catch (err) {
      handleControllerError(res, err, 'Erreur mise à jour commande.');
    }
  },

  getPayments(req: Request, res: Response) {
    try {
      const payments = restaurantService.getPayments(req.auth!.restaurantId!);
      res.json({ payments });
    } catch (err) {
      handleControllerError(res, err, 'Erreur chargement paiements.');
    }
  },

  payOrder(req: Request, res: Response) {
    try {
      const result = restaurantService.payOrder(
        req.auth!,
        String(req.params.id),
        req.body || {},
      );
      if (result.deduplicated) {
        res.status(200).json({ payment: result.payment, deduplicated: true });
        return;
      }
      res.status(201).json({ payment: result.payment });
    } catch (err) {
      handleControllerError(res, err, 'Erreur lors de l’encaissement.');
    }
  },

  refundPayment(req: Request, res: Response) {
    try {
      restaurantService.refundPayment(req.auth!, String(req.params.id));
      res.json({ ok: true });
    } catch (err) {
      handleControllerError(res, err, 'Erreur remboursement.');
    }
  },

  getTables(req: Request, res: Response) {
    try {
      const tables = restaurantService.getTables(req.auth!.restaurantId!);
      res.json({ tables });
    } catch (err) {
      handleControllerError(res, err, 'Erreur chargement tables.');
    }
  },

  createTable(req: Request, res: Response) {
    try {
      const result = restaurantService.createTable(
        req.auth!.restaurantId!,
        req.body || {},
      );
      res.status(201).json(result);
    } catch (err) {
      handleControllerError(res, err, 'Erreur création table.');
    }
  },

  updateTableStatus(req: Request, res: Response) {
    try {
      restaurantService.updateTableStatus(
        req.auth!.restaurantId!,
        String(req.params.id),
        req.body?.status,
      );
      res.json({ ok: true });
    } catch (err) {
      handleControllerError(res, err, 'Erreur mise à jour table.');
    }
  },

  regenerateTableQr(req: Request, res: Response) {
    try {
      const result = restaurantService.regenerateTableQr(
        req.auth!,
        String(req.params.id),
      );
      res.json(result);
    } catch (err) {
      handleControllerError(res, err, 'Erreur régénération QR.');
    }
  },

  getStocks(req: Request, res: Response) {
    try {
      const data = restaurantService.getStocks(req.auth!.restaurantId!);
      res.json(data);
    } catch (err) {
      handleControllerError(res, err, 'Erreur chargement stocks.');
    }
  },

  async createStockItem(req: Request, res: Response) {
    try {
      const id = await restaurantService.createStockItem(
        req.auth!,
        req.body || {},
      );
      res.status(201).json({ id });
    } catch (err) {
      handleControllerError(res, err, 'Erreur ajout ingrédient.');
    }
  },

  async moveStock(req: Request, res: Response) {
    try {
      const result = await restaurantService.moveStock(
        req.auth!,
        String(req.params.id),
        req.body || {},
      );
      res.json(result);
    } catch (err) {
      handleControllerError(res, err, 'Erreur mouvement stock.');
    }
  },

  getStockAlertConfig(req: Request, res: Response) {
    try {
      const data = restaurantService.getStockAlertConfig(
        req.auth!.restaurantId!,
      );
      res.json(data);
    } catch (err) {
      handleControllerError(
        res,
        err,
        'Erreur chargement configuration alertes stock.',
      );
    }
  },

  updateStockAlertConfig(req: Request, res: Response) {
    try {
      const settings = restaurantService.updateStockAlertConfig(
        req.auth!,
        req.body || {},
      );
      res.json({ settings });
    } catch (err) {
      handleControllerError(
        res,
        err,
        'Erreur mise à jour configuration alertes stock.',
      );
    }
  },

  async triggerManualStockAlert(req: Request, res: Response) {
    try {
      const result = await restaurantService.triggerManualStockAlert(
        req.auth!,
        String(req.params.id),
      );
      res.json(result);
    } catch (err) {
      handleControllerError(res, err, 'Erreur envoi alerte stock.');
    }
  },

  getNotifications(req: Request, res: Response) {
    try {
      const data = restaurantService.getNotifications(req.auth!.restaurantId!);
      res.json(data);
    } catch (err) {
      handleControllerError(res, err, 'Erreur chargement notifications.');
    }
  },

  markNotificationsRead(req: Request, res: Response) {
    try {
      restaurantService.markNotificationsRead(
        req.auth!.restaurantId!,
        req.body || {},
      );
      res.json({ ok: true });
    } catch (err) {
      handleControllerError(res, err, 'Erreur mise à jour notifications.');
    }
  },

  getStaff(req: Request, res: Response) {
    try {
      const data = restaurantService.getStaff(req.auth!.restaurantId!);
      res.json(data);
    } catch (err) {
      handleControllerError(res, err, 'Erreur chargement équipe.');
    }
  },

  createStaff(req: Request, res: Response) {
    try {
      const result = restaurantService.createStaff(req.auth!, req.body || {});
      res.status(201).json(result);
    } catch (err) {
      handleControllerError(res, err, 'Erreur création employé.');
    }
  },

  updateStaff(req: Request, res: Response) {
    try {
      restaurantService.updateStaff(
        req.auth!,
        String(req.params.memberId),
        req.body || {},
      );
      res.json({ ok: true });
    } catch (err) {
      handleControllerError(res, err, 'Erreur mise à jour employé.');
    }
  },

  getCustomers(req: Request, res: Response) {
    try {
      const customers = restaurantService.getCustomers(req.auth!.restaurantId!);
      res.json({ customers });
    } catch (err) {
      handleControllerError(res, err, 'Erreur chargement clients.');
    }
  },

  createCustomer(req: Request, res: Response) {
    try {
      const id = restaurantService.createCustomer(
        req.auth!.restaurantId!,
        req.body || {},
      );
      res.status(201).json({ id });
    } catch (err) {
      handleControllerError(res, err, 'Erreur création client.');
    }
  },

  getReservations(req: Request, res: Response) {
    try {
      const reservations = restaurantService.getReservations(
        req.auth!.restaurantId!,
      );
      res.json({ reservations });
    } catch (err) {
      handleControllerError(res, err, 'Erreur chargement réservations.');
    }
  },

  createReservation(req: Request, res: Response) {
    try {
      const id = restaurantService.createReservation(
        req.auth!.restaurantId!,
        req.body || {},
      );
      res.status(201).json({ id });
    } catch (err) {
      handleControllerError(res, err, 'Erreur création réservation.');
    }
  },

  updateReservationStatus(req: Request, res: Response) {
    try {
      restaurantService.updateReservationStatus(
        req.auth!.restaurantId!,
        String(req.params.id),
        req.body?.status,
      );
      res.json({ ok: true });
    } catch (err) {
      handleControllerError(res, err, 'Erreur mise à jour réservation.');
    }
  },

  getFinance(req: Request, res: Response) {
    try {
      const data = restaurantService.getFinanceSummary(req.auth!.restaurantId!);
      res.json(data);
    } catch (err) {
      handleControllerError(res, err, 'Erreur chargement finances.');
    }
  },

  createExpense(req: Request, res: Response) {
    try {
      const id = restaurantService.createExpense(
        req.auth!.restaurantId!,
        req.body || {},
      );
      res.status(201).json({ id });
    } catch (err) {
      handleControllerError(res, err, 'Erreur création dépense.');
    }
  },

  exportOrdersCsv(req: Request, res: Response) {
    try {
      const csv = restaurantService.exportOrdersCsv(req.auth!.restaurantId!);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader(
        'Content-Disposition',
        'attachment; filename="rapport-ventes-restomax.csv"',
      );
      res.send(csv);
    } catch (err) {
      handleControllerError(res, err, 'Erreur export CSV.');
    }
  },

  getSettings(req: Request, res: Response) {
    try {
      const data = restaurantService.getSettings(req.auth!.restaurantId!);
      res.json(data);
    } catch (err) {
      handleControllerError(res, err, 'Erreur chargement paramètres.');
    }
  },

  updateSettings(req: Request, res: Response) {
    try {
      restaurantService.updateSettings(req.auth!, req.body || {});
      res.json({ ok: true });
    } catch (err) {
      handleControllerError(res, err, 'Erreur mise à jour paramètres.');
    }
  },

  getTickets(req: Request, res: Response) {
    try {
      const tickets = restaurantService.getTickets(req.auth!.restaurantId!);
      res.json({ tickets });
    } catch (err) {
      handleControllerError(res, err, 'Erreur chargement tickets.');
    }
  },

  createTicket(req: Request, res: Response) {
    try {
      const id = restaurantService.createTicket(req.auth!, req.body || {});
      res.status(201).json({ id });
    } catch (err) {
      handleControllerError(res, err, 'Erreur création ticket.');
    }
  },
};
