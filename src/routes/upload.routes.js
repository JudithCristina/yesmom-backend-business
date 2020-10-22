import { Router } from 'express';
const router = Router();

import * as uploadCtrl from '../controllers/uploadController';

router.post('/upload-image',uploadCtrl.saveData);

export default router;