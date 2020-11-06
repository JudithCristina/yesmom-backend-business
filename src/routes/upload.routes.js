import { Router } from 'express';
const router = Router();

import * as uploadCtrl from '../controllers/uploadController';

router.post('/upload-image',uploadCtrl.saveData);
router.get('/getBlog',uploadCtrl.getBlogByParameters);
router.get('/getBlogAll',uploadCtrl.getBlog);
export default router;