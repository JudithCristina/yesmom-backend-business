import { Router } from 'express';
const router = Router();

import * as uploadCtrl from '../controllers/uploadController';

router.post('/upload-image',uploadCtrl.saveData);
router.get('/getBlog',uploadCtrl.getBlogByParameters);
router.get('/getBlogAll/:userType',uploadCtrl.getBlog);
router.get('/getBlogSpecific/:userType/:idBlog', uploadCtrl.getBlogSpecific)
router.get('/delete-blog/:idBlog', uploadCtrl.deleteBlog);
export default router;