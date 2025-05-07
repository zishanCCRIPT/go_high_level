import { Router } from 'express';
import { addLead, updateLead, handleCallStatus } from '../controllers/vicidialController';

const router = Router();

router.post('/vici/add-lead', addLead);
router.post('/vici/update-lead', updateLead);
router.post('/vicidial-call-status', handleCallStatus);

export default router;