import type { Request, Response } from 'express';
import { publicService } from '../services/publicService.ts';
import { handleControllerError } from '../services/errors.ts';

export const publicController = {
  getPlans(_req: Request, res: Response) {
    try {
      const plans = publicService.getActivePlans();
      res.json({ plans });
    } catch (err) {
      handleControllerError(res, err, 'Erreur lors du chargement des offres.');
    }
  },

  getSettings(_req: Request, res: Response) {
    try {
      const settings = publicService.getPlatformSettings();
      res.json({ settings });
    } catch (err) {
      handleControllerError(res, err, 'Erreur chargement paramètres.');
    }
  },

  submitContact(req: Request, res: Response) {
    try {
      const result = publicService.submitContactLead(req.body || {});
      if (result.honeypot) {
        res.status(200).json({ ok: true });
        return;
      }
      res.status(201).json(result);
    } catch (err) {
      handleControllerError(res, err, 'Erreur lors de l’envoi du message.');
    }
  },

  submitDemoRequest(req: Request, res: Response) {
    try {
      const result = publicService.submitDemoRequest(req.body || {});
      if (result.honeypot) {
        res.status(200).json({ ok: true });
        return;
      }
      res.status(201).json(result);
    } catch (err) {
      handleControllerError(
        res,
        err,
        'Erreur lors de l’enregistrement de la demande.',
      );
    }
  },

  async getQrImage(req: Request, res: Response) {
    try {
      const token = String(req.params.token);
      const host = req.get('host');
      const baseUrl = host
        ? `${req.protocol}://${host}`
        : process.env.APP_URL || 'http://localhost:3000';
      const svg = await publicService.generateQrSvg(token, baseUrl);
      res.setHeader('Content-Type', 'image/svg+xml');
      res.setHeader('Cache-Control', 'no-store');
      res.send(svg);
    } catch (err) {
      handleControllerError(res, err, 'Impossible de générer le QR code.');
    }
  },

  getQrMenuContext(req: Request, res: Response) {
    try {
      const context = publicService.getQrMenuContext(String(req.params.token));
      res.json(context);
    } catch (err) {
      handleControllerError(res, err, 'Erreur chargement menu QR.');
    }
  },

  submitQrOrder(req: Request, res: Response) {
    try {
      const result = publicService.submitQrOrder(
        String(req.params.token),
        req.body || {},
      );
      if (result.deduplicated) {
        res.status(200).json({ order: result.order, deduplicated: true });
        return;
      }
      res.status(201).json({ order: result.order });
    } catch (err) {
      handleControllerError(res, err, 'Erreur lors de l’envoi de la commande.');
    }
  },

  trackQrOrder(req: Request, res: Response) {
    try {
      const order = publicService.trackQrOrder(
        String(req.params.token),
        String(req.params.orderId),
      );
      res.json({ order });
    } catch (err) {
      handleControllerError(res, err, 'Erreur suivi de commande.');
    }
  },
};
