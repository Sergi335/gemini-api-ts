import { Router } from 'express';
import { extractArticle } from '../../controllers/articleExtractorController';
import { validate } from '../../middlewares/validation/zodValidator';
import { articleExtractorSchema } from '../../validation/articleExtractorZodSchema';

const router = Router();

router.post('/extract', validate(articleExtractorSchema), extractArticle);

export default router;
