import { Router } from 'express';
import * as controller from '../controllers/notification.controller';

const router: Router = Router();

router.get('/', controller.getNotifications);
router.get('/unread-count', controller.getUnreadCount);
router.get('/unread', controller.getUnreadNotifications);
router.patch('/read-all', controller.markAllRead);
router.patch('/:id/read', controller.markRead);
router.delete('/', controller.deleteAll);
router.delete('/:id', controller.deleteById);

export default router;
