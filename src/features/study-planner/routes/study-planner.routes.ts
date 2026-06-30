import { Router } from 'express';
import * as controller from '../controllers/study-planner.controller';

const router: Router = Router();

router.post('/generate', controller.generatePlan);
router.get('/tasks', controller.getTasks);
router.patch('/tasks/:id/status', controller.updateTaskStatus);
router.get('/statistics', controller.getStatistics);
router.delete('/plan/:planId', controller.archivePlan);

export default router;
