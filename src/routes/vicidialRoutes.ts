import { Router } from 'express';
import { addLead, updateLead, handleCallStatus, getAllGHLContacts, getGHLContactByPhone } from '../controllers/vicidialController';

const router = Router();

router.post('/vici/add-lead', addLead);
router.post('/vici/update-lead', updateLead);
router.post('/vicidial-call-status', handleCallStatus);
router.get('/ghl/contacts', getAllGHLContacts);
router.get('/ghl/contact-by-phone', getGHLContactByPhone)

export default router;