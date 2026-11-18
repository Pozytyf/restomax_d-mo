import { Router } from 'express';
import { requireAuth } from '../auth.ts';
import { authController } from '../controllers/authController.ts';

export const authRouter = Router();

authRouter.post('/login', authController.login);
authRouter.post('/register-restaurant', authController.registerRestaurant);
authRouter.get('/me', authController.me);
authRouter.post('/logout', requireAuth, authController.logout);
authRouter.post('/change-password', requireAuth, authController.changePassword);
