import { injectable } from 'inversify';
import { BaseService } from './BaseService';
import prisma from '../config/prismaClient';

@injectable()
export class PDFFileService extends BaseService<PDFFileService> {
    protected model: any;
    protected relatedModels: any;
    constructor() {
        super();
        // this.model = prisma.pdfFilePermission;
    }
}
