import { Router } from 'express';
const router = Router();

import * as uploadCtrl from '../controllers/uploadController';

router.post('/upload-image',uploadCtrl.saveData);
router.get('/getBlogParameters',uploadCtrl.getBlogByParameters);
router.get('/getBlogAll/:userType',uploadCtrl.getBlog);
router.post('/update-blog', uploadCtrl.updateBlog);
router.get('/delete-blog/:idBlog', uploadCtrl.deleteBlog);

router.put('/test/update/:idBlog', uploadCtrl.updateTest);
router.get('/test/getImages', uploadCtrl.getImageBlogTest)
export default router;