import type { Request, Response } from 'express';
import { superadminService } from '../services/superadminService.ts';
import { handleControllerError } from '../services/errors.ts';

export const superadminController = {
  getDashboard(_req: Request, res: Response) {
    try {
      const data = superadminService.getDashboard();
      res.json(data);
    } catch (err) {
      handleControllerError(res, err, 'Erreur chargement dashboard plateforme.');
    }
  },

  listRestaurants(_req: Request, res: Response) {
    try {
      const restaurants = superadminService.listRestaurants();
      res.json({ restaurants });
    } catch (err) {
      handleControllerError(res, err, 'Erreur chargement restaurants.');
    }
  },

  createRestaurant(req: Request, res: Response) {
    try {
      const id = superadminService.createRestaurant(req.auth!, req.body || {});
      res.status(201).json({ id });
    } catch (err) {
      handleControllerError(res, err, 'Erreur création restaurant.');
    }
  },

  updateRestaurantStatus(req: Request, res: Response) {
    try {
      superadminService.updateRestaurantStatus(
        req.auth!,
        String(req.params.id),
        req.body || {},
      );
      res.json({ ok: true });
    } catch (err) {
      handleControllerError(res, err, 'Erreur mise à jour statut restaurant.');
    }
  },

  listPlans(_req: Request, res: Response) {
    try {
      const plans = superadminService.listPlans();
      res.json({ plans });
    } catch (err) {
      handleControllerError(res, err, 'Erreur chargement plans.');
    }
  },

  updatePlan(req: Request, res: Response) {
    try {
      superadminService.updatePlan(
        req.auth!,
        String(req.params.id),
        req.body || {},
      );
      res.json({ ok: true });
    } catch (err) {
      handleControllerError(res, err, 'Erreur mise à jour plan.');
    }
  },

  listSubscriptions(_req: Request, res: Response) {
    try {
      const subscriptions = superadminService.listSubscriptions();
      res.json({ subscriptions });
    } catch (err) {
      handleControllerError(res, err, 'Erreur chargement abonnements.');
    }
  },

  listInvoices(_req: Request, res: Response) {
    try {
      const invoices = superadminService.listInvoices();
      res.json({ invoices });
    } catch (err) {
      handleControllerError(res, err, 'Erreur chargement facturation.');
    }
  },

  markInvoicePaid(req: Request, res: Response) {
    try {
      superadminService.markInvoicePaid(req.auth!, String(req.params.id));
      res.json({ ok: true });
    } catch (err) {
      handleControllerError(res, err, 'Erreur validation facture.');
    }
  },

  listUsers(_req: Request, res: Response) {
    try {
      const users = superadminService.listUsers();
      res.json({ users });
    } catch (err) {
      handleControllerError(res, err, 'Erreur chargement utilisateurs.');
    }
  },

  updateUserStatus(req: Request, res: Response) {
    try {
      superadminService.updateUserStatus(
        req.auth!,
        String(req.params.id),
        req.body?.status,
      );
      res.json({ ok: true });
    } catch (err) {
      handleControllerError(res, err, 'Erreur mise à jour utilisateur.');
    }
  },

  listTickets(_req: Request, res: Response) {
    try {
      const data = superadminService.listTicketsAndLeads();
      res.json(data);
    } catch (err) {
      handleControllerError(res, err, 'Erreur chargement support.');
    }
  },

  replyToTicket(req: Request, res: Response) {
    try {
      superadminService.replyToTicket(
        req.auth!,
        String(req.params.id),
        req.body || {},
      );
      res.json({ ok: true });
    } catch (err) {
      handleControllerError(res, err, 'Erreur réponse ticket.');
    }
  },

  listAuditLogs(_req: Request, res: Response) {
    try {
      const logs = superadminService.listAuditLogs();
      res.json({ logs });
    } catch (err) {
      handleControllerError(res, err, 'Erreur chargement journal audit.');
    }
  },

  getSettings(_req: Request, res: Response) {
    try {
      const settings = superadminService.getPlatformSettings();
      res.json({ settings });
    } catch (err) {
      handleControllerError(res, err, 'Erreur chargement paramètres.');
    }
  },

  updateSettings(req: Request, res: Response) {
    try {
      superadminService.updatePlatformSettings(req.auth!, req.body || {});
      res.json({ ok: true });
    } catch (err) {
      handleControllerError(res, err, 'Erreur mise à jour paramètres.');
    }
  },
};
