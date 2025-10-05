import { NextFunction, Request, Response } from 'express';
import { inject, injectable } from 'inversify';
import { BaseController } from './BaseController';
import { PDFFileService } from '../services/pdfFileService';
import path from 'path';
import fs from 'fs';
import { chromium } from 'playwright';
import appConfig from '../config/appConfig';
import { sendMail } from '../mailer/mailer';

@injectable()
export class PDFFileController extends BaseController<PDFFileService> {
    protected service: PDFFileService;

    constructor(@inject(PDFFileService) pdfFileService: PDFFileService) {
        super();
        this.service = pdfFileService;
    }

    async createFile(
        req: Request,
        res: Response,
        next: NextFunction,
    ): Promise<void> {
        try {
            const data = req.body;

            // Build HTML (reuse your existing HTML)
            const html = `
                <html lang="he" dir="rtl">
                <head>
                    <meta charset="utf-8" />
                    <title>טופס בריאות</title>
                    <style>
                        body { font-family: 'Segoe UI', Arial, sans-serif; background-color: #fff; margin: 0; direction: rtl; color: #333; padding-inline:10px; }
                        h1,h2,h5 { text-align: center; margin:5px 0; }
                        h1 { color: #2c3e50; margin-bottom: 10px; }
                        h5 { font-weight: normal; color: #555; }
                        .title { margin-block-end:10px; }
                        .section { background:#fff; border-radius:10px; padding:20px 25px; margin-bottom:20px; box-shadow:0 2px 6px rgba(0,0,0,0.08); page-break-inside: avoid; }
                        .section h2 { color:#3498db; margin-bottom:10px; font-size:16px; text-align:start; }
                        .field { margin-bottom:8px; display:flex; justify-content:space-between; border-bottom:1px solid #eee; padding-bottom:6px; }
                        .label { font-weight:bold; color:#2c3e50; }
                        .value { color:#555; }
                        ul { list-style:none; padding:0; margin:0; }
                        ul li { padding:6px 10px; background:#f4f6f8; border-radius:6px; margin-bottom:6px; }
                        ul li:nth-child(even){ background:#e9ecef; }
                        ul li div { margin-top:4px; color:#444; font-size:0.75em; }
                        .lastOne .label span { font-weight: normal; }
                        .lastOne .field { border-bottom: unset; }
                        .signature { margin-top:30px; text-align:center; display:flex; align-items:center; justify-content:center; gap:10px; }
                        .signature h2 { font-size:18px; }
                        .signature img { width:250px; height:auto; border-block-end:2px solid #ccc; margin-top:10px; }
                        footer { text-align:center; margin-top:40px; font-size:12px; color:#888; }
                        @page { margin-top:40px; margin-bottom:40px; margin-left:15px; margin-right:15px; }
                    </style>
                </head>
                <body>
                    <div class="title">
                        <h2>הצהרת בריאות לקבלת עיסוי</h2>
                        <h5>השאלון סודי וישמש למטרת הטיפול בלבד</h5>
                    </div>
                    <!-- Reuse all your sections here -->
                    <div class="section">
                        <div class="field"><span class="label">שם המטופל:</span><span class="value">${data.clientName}</span></div>
                        <!-- ... add other fields ... -->
                    </div>
                    <div class="section lastOne">
                        <div class="signature">
                            <h2>חתימה</h2>
                            <img src="${data.signature}" alt="חתימה" />
                        </div>
                    </div>
                    <footer>
                        טופס נוצר אוטומטית על ידי מערכת SAN &copy; ${new Date().getFullYear()}
                    </footer>
                </body>
                </html>
            `;

            // Generate PDF filename
            const now = new Date();
            const fileNameDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
            const fileName = `${data.clientName}_${fileNameDate}.pdf`;
            const pdfPath = path.join(
                appConfig.PDFFILE_WITH_PUBLIC_PATH,
                fileName,
            );

            // Launch Playwright and generate PDF
            const browser = await chromium.launch({
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox'], // required for many cloud hosts
            });
            const page = await browser.newPage();
            await page.setContent(html, { waitUntil: 'networkidle' });
            await page.pdf({ path: pdfPath, format: 'A4' });
            await browser.close();

            const filePath = [
                appConfig.SERVER_URL,
                appConfig.PDFFILE_ASSET_PATH,
                fileName,
            ]
                .join('/')
                .replace(/\\/g, '/');

            // Send email if needed
            const mailTo =
                data.sendToSan === 'true'
                    ? ['san.ajami.hs@gmail.com']
                    : ['christinemassage.111@gmail.com'];

            await sendMail({
                to: mailTo,
                subject: `מילוי טופס הצהרת בריאות של ${data.clientName}`,
                text: '',
                attachments: [{ filename: fileName, path: filePath }],
            });

            res.status(200).json({ url: encodeURI(filePath) });
        } catch (error) {
            next(error);
        }
    }
}
