import { Router, Request, Response, NextFunction } from 'express';

import { validate } from '../middlewares/validate';
import container from '../config/inversifyConfig';
import authMiddleware from '../middlewares/authMiddleware';
import { PDFFileController } from '../controllers/pdfFileController';
import { createRouter, RouteConfig } from './BaseRouter';
import appConfig from '../config/appConfig';
import { uploadFile } from '../utils/uploadFile';

const pdfFileController = container.get<PDFFileController>(PDFFileController);

const pdfFileRoutes: RouteConfig<PDFFileController>[] = [
    {
        method: 'post',
        path: '/createFile',
        action: 'createFile',
        middlewares: [
            uploadFile(
                appConfig.IMAGES_WITH_PUBLIC_PATH,
                appConfig.IMAGES_COURSE_FILE_FORMATS,
                ['photos'],
                // Accept multiple files under 'photos'
            ),
        ],
    },
];

const pdfFileRouter = createRouter(pdfFileController, pdfFileRoutes);
export default pdfFileRouter;
