import { NextFunction, Request, Response } from 'express';
import { inject, injectable } from 'inversify';
import { BaseController } from './BaseController';
import { PDFFileService } from '../services/pdfFileService';
import path from 'path';
import fs from 'fs';
import PDFDocument from 'pdfkit';
import appConfig from '../config/appConfig';
import { sendMail } from '../mailer/mailer';

interface PDFRequestBody {
    clientName: string;
    signature?: string; // base64 string
    sendToSan?: string;
    // add other fields here
    [key: string]: any;
}

@injectable()
export class PDFFileController extends BaseController<PDFFileService> {
    protected service: PDFFileService;

    constructor(@inject(PDFFileService) pdfFileService: PDFFileService) {
        super();
        this.service = pdfFileService;
    }

    async createFile(
        req: Request<{}, {}, PDFRequestBody>,
        res: Response,
        next: NextFunction,
    ): Promise<void> {
        try {
            const data = req.body;

            // Generate PDF filename
            const now = new Date();
            const fileNameDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
            const fileName = `${data.clientName}_${fileNameDate}.pdf`;
            const safeFileName = encodeURIComponent(
                `${data.clientName}_${fileNameDate}.pdf`,
            );
            const pdfPath = path.join(
                appConfig.PDFFILE_WITH_PUBLIC_PATH,
                safeFileName,
            );

            // Create PDF
            const doc = new PDFDocument({ margin: 25, size: 'A4' });
            doc.font(path.join(__dirname, '../fonts/DavidLibre-Regular.ttf'));
            doc.text('הצהרת בריאות לקבלת עיסוי', { align: 'right' });

            const writeStream = fs.createWriteStream(pdfPath);
            doc.pipe(writeStream);

            // Title
            doc.fontSize(18).text('הצהרת בריאות לקבלת עיסוי', {
                align: 'center',
            });
            doc.moveDown(0.5);
            doc.fontSize(12).text('השאלון סודי וישמש למטרת הטיפול בלבד', {
                align: 'center',
            });
            doc.moveDown(1);

            // Client info
            doc.fontSize(14).text(`שם המטופל: ${data.clientName}`);
            doc.moveDown(0.5);

            // Add other fields dynamically
            Object.keys(data).forEach((key) => {
                if (!['clientName', 'signature', 'sendToSan'].includes(key)) {
                    doc.text(`${key}: ${data[key]}`);
                    doc.moveDown(0.3);
                }
            });

            // Signature
            doc.moveDown(1);
            doc.text('חתימה:');
            if (data.signature) {
                try {
                    const signatureBuffer = Buffer.from(
                        data.signature.replace(/^data:image\/\w+;base64,/, ''),
                        'base64',
                    );
                    doc.image(signatureBuffer, { width: 250, height: 100 });
                } catch (err) {
                    console.warn('Invalid signature image');
                }
            }

            // Footer
            doc.moveDown(2);
            doc.fontSize(10).text(
                `טופס נוצר אוטומטית על ידי מערכת SAN © ${new Date().getFullYear()}`,
                { align: 'center' },
            );

            doc.end();

            // Wait for PDF to finish writing
            await new Promise<void>((resolve, reject) => {
                writeStream.on('finish', () => resolve());
                writeStream.on('error', reject);
            });

            // Build public URL
            const filePath = [
                appConfig.SERVER_URL,
                appConfig.PDFFILE_ASSET_PATH,
                safeFileName,
            ]
                .join('/')
                .replace(/\\/g, '/');

            // Send email
            const mailTo =
                data.sendToSan === 'true'
                    ? ['san.ajami.hs@gmail.com']
                    : ['christinemassage.111@gmail.com'];

            const encodedFilePath = encodeURI(filePath);

            await sendMail({
                to: mailTo,
                subject: `מילוי טופס הצהרת בריאות של ${data.clientName}`,
                text: '',
                attachments: [
                    { filename: safeFileName, path: encodedFilePath },
                ],
            });

            res.status(200).json({ url: encodedFilePath });
        } catch (error) {
            next(error);
        }
    }
}
