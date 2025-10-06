import { NextFunction, Request, Response } from 'express';
import { inject, injectable } from 'inversify';
import { BaseController } from './BaseController';
import { PDFFileService } from '../services/pdfFileService';
import fs from 'fs';
import path from 'path';
import appConfig from '../config/appConfig';
import { sendMail } from '../mailer/mailer';
import { launchChromium } from '../utils/chromiumHelper';

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
            // const photos = (
            //     req.files as { [fieldname: string]: Express.Multer.File[] }
            // )?.photos;

            const data = req.body;

            // 1. Build HTML from form data
            const html = `
                    <html lang="he" dir="rtl">
                    <head>
                        <meta charset="utf-8" />
                        <title>טופס בריאות</title>
                        <style>
                            body {
                                font-family: 'Segoe UI', Arial, sans-serif;
                                background-color: #fff;
                                margin: 0;
                                direction: rtl;
                                color: #333;
                                padding-inline:10px;
                            }

                            h1, h2, h5 {
                                text-align: center;
                                margin: 5px 0;
                            }

                            h1 {
                                color: #2c3e50;
                                margin-bottom: 10px;
                            }

                            h5 {
                                font-weight: normal;
                                color: #555;
                            }

                            .title{
                            margin-block-end:10px;
                            }

                            .section {
                                background: #fff;
                                border-radius: 10px;
                                padding: 20px 25px;
                                margin-bottom: 20px;
                                box-shadow: 0 2px 6px rgba(0,0,0,0.08);
                                page-break-inside: avoid;
                            }

                            .section h2 {
                                color: #3498db;
                                margin-bottom: 10px;
                                font-size: 16px;
                                text-align: start;
                            }

                            .field {
                                margin-bottom: 8px;
                                display: flex;
                                justify-content: space-between;
                                border-bottom: 1px solid #eee;
                                padding-bottom: 6px;
                            }

                            .label {
                                font-weight: bold;
                                color: #2c3e50;
                            }

                            .value {
                                color: #555;
                            }

                            ul {
                                list-style: none;
                                padding: 0;
                                margin: 0;
                            }

                            ul li {
                                padding: 6px 10px;
                                background: #f4f6f8;
                                border-radius: 6px;
                                margin-bottom: 6px;
                            }

                            ul li:nth-child(even) {
                                background: #e9ecef;
                            }

                            ul li div {
                                margin-top: 4px;
                                color: #444;
                                font-size: 0.75em;
                            }

                            .lastOne .label span{
                                font-weight: normal;
                            }

                            .lastOne .field{
                                border-bottom: unset;
                            }   

                            .signature {
                                margin-top: 30px;
                                text-align: center;
                                display:flex;
                                align-items:center;
                                justify-content:center;
                                gap:10px;
                            }
                            .signature h2 {
                            font-size: 18px;
                            }

                            .signature img {
                                width: 250px;
                                height: auto;
                                border-block-end: 2px solid #ccc;
                                margin-top: 10px;
                               
                            }

                            footer {
                                text-align: center;
                                margin-top: 40px;
                                font-size: 12px;
                                color: #888;
                            }

                            @page {
                                margin-top: 40px; /* top margin for every page */
                                margin-bottom: 40px; /* bottom margin */
                                margin-left: 15px;
                                margin-right: 15px;
                                }
                        </style>
                    </head>
                    <body>
                        <div class="title">
                        <h2>הצהרת בריאות לקבלת עיסוי</h2>
                        <h5>השאלון הינו סודי בהחלט וישמש למטרת הטיפול וקידום צרכי המטופל בלבד</h5>
                        <h5>בעיות רפואיות מיוחדות - האם את/ה סובל/ת מ...?</h5>
                        </div>

                        <!-- שאלות בריאות -->
                        <div class="section health-questions">
                            <h2>שאלות בריאות</h2>
                            <ul>
                                <li>
                                    <strong>מחלת לב:</strong> ${data.heartIssues}
                                    ${data.heartIssuesText ? `<div>${data.heartIssuesText}</div>` : ''}
                                </li>
                                <li>
                                    <strong>בעיות עמוד שדרה:</strong> ${data.spineProblems}
                                    ${data.spineProblemsText ? `<div>${data.spineProblemsText}</div>` : ''}
                                </li>
                                <li>
                                    <strong>שברים/נקעים:</strong> ${data.fracturesOrSprains}
                                    ${data.fracturesOrSprainsText ? `<div>${data.fracturesOrSprainsText}</div>` : ''}
                                </li>
                                <li>
                                    <strong>שפעת/דלקת:</strong> ${data.fluOrFever}
                                    ${data.fluOrFeverText ? `<div>${data.fluOrFeverText}</div>` : ''}
                                </li>
                                <li>
                                    <strong>אפילפסיה:</strong> ${data.epilepsy}
                                </li>
                                <li>
                                    <strong>הריון:</strong> ${data.pregnant}
                                    ${data.pregnantText ? `<div>${data.pregnantText}</div>` : ''}
                                </li>
                                <li>
                                    <strong>ניתוח אחרון:</strong> ${data.recentSurgery}
                                    ${data.recentSurgeryText ? `<div>${data.recentSurgeryText}</div>` : ''}
                                </li>
                                <li>
                                    <strong>תרופות כרוניות:</strong> ${data.chronicMedication}
                                    ${data.chronicMedicationText ? `<div>${data.chronicMedicationText}</div>` : ''}
                                </li>
                                <li>
                                    <strong>בעיות גופניות אחרות:</strong> ${data.otherPhysicalProblems}
                                    ${data.otherPhysicalProblemsText ? `<div>${data.otherPhysicalProblemsText}</div>` : ''}
                                </li>
                                <li>
                                    <strong>פטריות:</strong> ${data.fungus}
                                    ${data.fungusText ? `<div>${data.fungusText}</div>` : ''}
                                </li>
                                <li>
                                    <strong>אזורים כואבים:</strong> ${data.painfulAreas}
                                    ${data.painfulAreasText ? `<div>${data.painfulAreasText}</div>` : ''}
                                </li>
                            </ul>
                        </div>

                        <div class="section">
                            <div class="field"><span class="label">עוצמת טיפול:</span><span class="value">${data.treatmentIntensity}</span></div>
                            <div class="field"><span class="label">אזורי מיקוד:</span><span class="value">${data.focusArea}</span></div>
                        </div>

                        <!-- מידע אישי -->
                        <div class="section">
                            <div class="field"><span class="label">שם המטופל:</span><span class="value">${data.clientName}</span></div>
                            <div class="field"><span class="label">ת.ז:</span><span class="value">${data.clientId}</span></div>
                            <div class="field"><span class="label">טלפון:</span><span class="value">${data.clientPhone}</span></div>
                            <div class="field"><span class="label">כתובת:</span><span class="value">${data.clientLocation}</span></div>
                            <div class="field">
                                <span class="label">תאריך לידה:</span>
                                <span class="value">${
                                    data.clientBirthday
                                        ? new Date(
                                              data.clientBirthday,
                                          ).toLocaleDateString('he-IL', {
                                              day: '2-digit',
                                              month: '2-digit',
                                              year: 'numeric',
                                          })
                                        : ''
                                }</span>
                            </div>
                        </div>

  

                        <div class="section lastOne">
                         <div class="field"><span class="label">אני מצהיר/ה כי האחריות להחליט באם כשרי הגופני מתאים לקבלת טיפול חלה עלי בלבד, כי אינני סובל/ת מבעיות רפואיות שעלולות לסכן אותי, ומאשר/ת כי המידע שמסרתי מלא ונכון ומוותר/ת על זכותי לתבוע את המטפל/ת בעתיד בהקשר לטיפול זה:<span class="value">${data.declaration === 'true' ? 'מאושר' : 'לא מאושר'}</span></span></div>
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

            // Create filename
            const now = new Date(Date.now()); // ✅ now is a Date object

            const fileNameDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
                now.getDate(),
            ).padStart(
                2,
                '0',
            )}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(
                now.getSeconds(),
            ).padStart(2, '0')}`;
            // const fileName = `${data.projectName}_${data.visitDate}.pdf`;
            const fileName = `${data.clientName}_${fileNameDate}.pdf`;

            // // Add new page for photos
            // let photosHtml = '';
            // if (photos && photos.length > 0) {
            //     photosHtml += `
            //     <div style="page-break-before: always; text-align: center;">
            //         <div style="display:flex;flex-wrap:wrap;gap:20px">
            // `;
            //     photos.forEach((photo) => {
            //         const photoPath = `${appConfig.SERVER_URL}/${appConfig.IMAGES_ASSET_PATH}/${photo.filename}`;

            //         photosHtml += `
            //         <a href="${photoPath}" target="_blank" style="margin-bottom: 20px;">
            //             <img
            //                 src="${photoPath}"
            //                 style="width:250px; max-width: 100%; height: auto; display: block; margin: 0 auto;"
            //             />
            //         </a>
            //     `;
            //     });
            //     photosHtml += `</div></div>`;
            // }

            // Generate PDF with Puppeteer
            const pdfPath = path.join(
                appConfig.PDFFILE_WITH_PUBLIC_PATH,
                fileName,
            );

            // const browser = await puppeteer.launch({
            //     headless: true,
            //     args: ['--no-sandbox', '--disable-setuid-sandbox'],
            // });

            // const page = await browser.newPage();
            // await page.setContent(html, { waitUntil: 'networkidle0' });
            // await page.pdf({ path: pdfPath, format: 'A4' });
            // await browser.close();

            const browser = await launchChromium();
            const page = await browser.newPage();

            // ✅ Use your real HTML
            await page.setContent(html, { waitUntil: 'networkidle' });

            // ✅ Generate PDF directly to your file path
            await page.pdf({
                path: pdfPath,
                format: 'A4',
                printBackground: true,
                margin: {
                    top: '20mm',
                    bottom: '20mm',
                    left: '10mm',
                    right: '10mm',
                },
            });

            await browser.close();

            const filePath = [
                appConfig.SERVER_URL,
                appConfig.PDFFILE_ASSET_PATH,
                path.basename(pdfPath),
            ]
                .join('/') // use forward slashes
                .replace(/\\/g, '/'); // just in case
            const encodedUrl = encodeURI(filePath); // encodes special characters

            // ✅ Check if newPage/sendToSan key is true, then send to another email
            const mailTo =
                data.sendToSan === 'true'
                    ? ['san.ajami.hs@gmail.com']
                    : ['christinemassage.111@gmail.com'];
            await sendMail({
                to: mailTo,
                subject: `מילוי טופס הצהרת בריאות של ${data.clientName}`,
                text: '',
                attachments: [{ filename: fileName, path: pdfPath }],
            });

            res.status(200).json({ url: encodedUrl });
        } catch (error) {
            next(error);
        }
    }
}
