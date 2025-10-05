import { NextFunction, Request, Response } from 'express';
import { inject, injectable } from 'inversify';
import { BaseController } from './BaseController';
import { PDFFileService } from '../services/pdfFileService';
import path from 'path';
import fs from 'fs';
import fontkit from 'fontkit';
import { PDFDocument, rgb } from 'pdf-lib';
import appConfig from '../config/appConfig';
import { sendMail } from '../mailer/mailer';

interface PDFRequestBody {
    clientName: string;
    clientId?: string;
    clientPhone?: string;
    clientLocation?: string;
    clientBirthday?: string;
    treatmentIntensity?: string;
    focusArea?: string;
    heartIssues?: string;
    heartIssuesText?: string;
    spineProblems?: string;
    spineProblemsText?: string;
    fracturesOrSprains?: string;
    fracturesOrSprainsText?: string;
    fluOrFever?: string;
    fluOrFeverText?: string;
    epilepsy?: string;
    pregnant?: string;
    pregnantText?: string;
    recentSurgery?: string;
    recentSurgeryText?: string;
    chronicMedication?: string;
    chronicMedicationText?: string;
    otherPhysicalProblems?: string;
    otherPhysicalProblemsText?: string;
    fungus?: string;
    fungusText?: string;
    painfulAreas?: string;
    painfulAreasText?: string;
    declaration?: string;
    signature?: string; // base64 image
    sendToSan?: string;
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

            const now = new Date();
            const fileNameDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
            const fileName = `${data.clientName}_${fileNameDate}.pdf`;
            const pdfPath = path.join(
                appConfig.PDFFILE_WITH_PUBLIC_PATH,
                fileName,
            );

            // Create a new PDF document
            const pdfDoc = await PDFDocument.create();
            pdfDoc.registerFontkit(fontkit as any);

            // Embed Hebrew font (David Libre)
            const fontBytes = fs.readFileSync(
                path.join(__dirname, '../fonts/DavidLibre-Regular.ttf'),
            );

            const hebrewFont = await pdfDoc.embedFont(fontBytes);

            // Add a page
            const page = pdfDoc.addPage([595, 842]); // A4
            let y = page.getHeight() - 50;

            const drawRTLText = (
                text: string,
                fontSize: number = 14,
                maxWidth: number = 515,
            ) => {
                // Split by spaces and wrap lines (no reversing)
                const words = text.split(' ');
                let line = '';
                const lines: string[] = [];

                for (const word of words) {
                    const testLine = line ? `${line} ${word}` : word;
                    const lineWidth = hebrewFont.widthOfTextAtSize(
                        testLine,
                        fontSize,
                    );
                    if (lineWidth < maxWidth) {
                        line = testLine;
                    } else {
                        lines.push(line);
                        line = word;
                    }
                }
                if (line) lines.push(line);

                // Draw lines (RTL alignment)
                for (const ln of lines) {
                    const textWidth = hebrewFont.widthOfTextAtSize(
                        ln,
                        fontSize,
                    );
                    page.drawText(ln, {
                        x: page.getWidth() - 40 - textWidth, // align right
                        y,
                        size: fontSize,
                        font: hebrewFont,
                        color: rgb(0, 0, 0),
                    });
                    y -= fontSize + 5;
                }
            };

            const drawLTRText = (
                text: string,
                fontSize: number = 14,
                maxWidth: number = 515,
            ) => {
                const words = text.split(' ');
                let line = '';
                const lines: string[] = [];

                // Build wrapped lines (LTR order)
                for (const word of words) {
                    const testLine = line ? `${line} ${word}` : word;
                    const lineWidth = hebrewFont.widthOfTextAtSize(
                        testLine,
                        fontSize,
                    );
                    if (lineWidth < maxWidth) {
                        line = testLine;
                    } else {
                        lines.push(line);
                        line = word;
                    }
                }
                if (line) lines.push(line);

                // Draw lines top-to-bottom
                for (const ln of lines) {
                    page.drawText(ln, {
                        x: 40, // left margin
                        y,
                        size: fontSize,
                        font: hebrewFont,
                        color: rgb(0, 0, 0),
                    });
                    y -= fontSize + 5;
                }
            };

            // Title
            drawRTLText('הצהרת בריאות לקבלת עיסוי', 18);
            drawRTLText(
                'השאלון הינו סודי בהחלט וישמש למטרת הטיפול וקידום צרכי המטופל בלבד',
                12,
            );
            drawRTLText('בעיות רפואיות מיוחדות - האם את/ה סובל/ת מ...', 12);
            y -= 10;

            // Health questions
            drawRTLText('שאלות בריאות', 14);
            const questions = [
                {
                    label: 'מחלת לב:',
                    value: data.heartIssues,
                    extra: data.heartIssuesText,
                },
                {
                    label: 'בעיות עמוד שדרה:',
                    value: data.spineProblems,
                    extra: data.spineProblemsText,
                },
                {
                    label: 'שברים/נקעים:',
                    value: data.fracturesOrSprains,
                    extra: data.fracturesOrSprainsText,
                },
                {
                    label: 'שפעת/דלקת:',
                    value: data.fluOrFever,
                    extra: data.fluOrFeverText,
                },
                { label: 'אפילפסיה:', value: data.epilepsy },
                {
                    label: 'הריון:',
                    value: data.pregnant,
                    extra: data.pregnantText,
                },
                {
                    label: 'ניתוח אחרון:',
                    value: data.recentSurgery,
                    extra: data.recentSurgeryText,
                },
                {
                    label: 'תרופות כרוניות:',
                    value: data.chronicMedication,
                    extra: data.chronicMedicationText,
                },
                {
                    label: 'בעיות גופניות אחרות:',
                    value: data.otherPhysicalProblems,
                    extra: data.otherPhysicalProblemsText,
                },
                {
                    label: 'פטריות:',
                    value: data.fungus,
                    extra: data.fungusText,
                },
                {
                    label: 'אזורים כואבים:',
                    value: data.painfulAreas,
                    extra: data.painfulAreasText,
                },
            ];

            questions.forEach((q) => {
                drawRTLText(`${q.label} ${q.value || ''}`);
                if (q.extra) drawRTLText(`- ${q.extra}`);
                y -= 5;
            });

            y -= 10;
            drawRTLText(`עוצמת טיפול: ${data.treatmentIntensity || ''}`);
            drawRTLText(`אזורי מיקוד: ${data.focusArea || ''}`);
            y -= 10;

            // Personal info
            const personalFields = [
                { label: 'שם המטופל:', value: data.clientName },
                { label: 'ת.ז:', value: data.clientId },
                { label: 'טלפון:', value: data.clientPhone },
                { label: 'כתובת:', value: data.clientLocation },
                {
                    label: 'תאריך לידה:',
                    value: data.clientBirthday
                        ? new Date(data.clientBirthday).toLocaleDateString(
                              'he-IL',
                          )
                        : '',
                },
            ];
            personalFields.forEach((f) => {
                const label = f.label || '';
                const value = f.value || '';

                // Fields that should be LTR (numbers, English, etc.)
                const isLTR = ['ת.ז', 'טלפון', 'תאריך לידה'].some((ltrKey) =>
                    label.includes(ltrKey),
                );

                if (isLTR) {
                    // Draw label RTL on the right
                    drawRTLText(label);
                    // Draw value LTR on the left side
                    drawLTRText(value);
                } else {
                    // Regular RTL combined line
                    drawRTLText(`${label} ${value}`);
                }
            });

            y -= 10;
            drawRTLText(
                'אני מצהיר/ה כי האחריות להחליט באם כשרי הגופני מתאים לקבלת טיפול חלה עלי בלבד, כי אינני סובל/ת מבעיות רפואיות שעלולות לסכן אותי, ומאשר/ת כי המידע שמסרתי מלא ונכון ומוותר/ת על זכותי לתבוע את המטפל/ת בעתיד בהקשר לטיפול זה:',
            );
            drawRTLText(
                `${data.declaration === 'true' ? 'מאושר' : 'לא מאושר'}`,
            );

            y -= 20;
            // Signature
            if (data.signature) {
                try {
                    const signatureBytes = Buffer.from(
                        data.signature.replace(/^data:image\/\w+;base64,/, ''),
                        'base64',
                    );
                    const sigImage = await pdfDoc.embedPng(signatureBytes);
                    const imgDims = sigImage.scale(1);
                    page.drawImage(sigImage, {
                        x: page.getWidth() / 2 - 125,
                        y: y - 100,
                        width: 250,
                        height: 100,
                    });
                    y -= 110;
                } catch (err) {
                    console.warn('Invalid signature image');
                }
            }

            // Footer
            drawRTLText(
                `טופס נוצר אוטומטית על ידי מערכת SAN © ${new Date().getFullYear()}`,
                12,
            );

            const pdfBytes = await pdfDoc.save();
            fs.writeFileSync(pdfPath, pdfBytes);

            const filePath = [
                appConfig.SERVER_URL,
                appConfig.PDFFILE_ASSET_PATH,
                fileName,
            ]
                .join('/')
                .replace(/\\/g, '/');

            // Send email
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

            res.status(200).json({ url: encodeURI(filePath) });
        } catch (error) {
            next(error);
        }
    }
}
