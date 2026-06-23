import { Router } from 'express'
import { getAllCareers, getCareerById } from '../controllers/careers-controller'
const router: Router = Router()

router.get('/', getAllCareers)
router.get('/:id', getCareerById)

export default router
