import { Router } from 'express';
import { publicController } from '../controllers/publicController.ts';

export const publicRouter = Router();

publicRouter.get('/plans', publicController.getPlans);
publicRouter.get('/settings', publicController.getSettings);
publicRouter.post('/contact', publicController.submitContact);
publicRouter.post('/demo-requests', publicController.submitDemoRequest);
publicRouter.get('/qr-image/:token', publicController.getQrImage);
publicRouter.get('/qr/:token', publicController.getQrMenuContext);
publicRouter.post('/qr/:token/orders', publicController.submitQrOrder);
publicRouter.get('/qr/:token/orders/:orderId', publicController.trackQrOrder);
