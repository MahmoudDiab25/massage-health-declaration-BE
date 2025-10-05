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
    signature?: string;
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

            const doc = new PDFDocument({ margin: 25, size: 'A4' });
            const writeStream = fs.createWriteStream(pdfPath);
            doc.pipe(writeStream);

            // Register Hebrew font
            const fontPath = path.join(
                __dirname,
                '../fonts/DavidLibre-Regular.ttf',
            );
            doc.registerFont('David', fontPath);
            doc.font('David');

            // Title
            doc.fontSize(18).text('הצהרת בריאות לקבלת עיסוי', {
                align: 'center',
            });
            doc.moveDown(0.5);
            doc.fontSize(12).text(
                'השאלון הינו סודי בהחלט וישמש למטרת הטיפול וקידום צרכי המטופל בלבד',
                { align: 'center' },
            );
            doc.moveDown(0.5);
            doc.text('בעיות רפואיות מיוחדות - האם את/ה סובל/ת מ...', {
                align: 'center',
            });
            doc.moveDown(1);

            // Health questions
            doc.fontSize(14).text('שאלות בריאות', { align: 'right' });
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
                doc.text(`${q.label} ${q.value || ''}`, { align: 'right' });
                if (q.extra) doc.text(`- ${q.extra}`, { align: 'right' });
                doc.moveDown(0.3);
            });

            doc.moveDown(1);

            // Treatment info
            doc.text(`עוצמת טיפול: ${data.treatmentIntensity || ''}`, {
                align: 'right',
            });
            doc.text(`אזורי מיקוד: ${data.focusArea || ''}`, {
                align: 'right',
            });
            doc.moveDown(1);

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
                doc.text(`${f.label} ${f.value || ''}`, { align: 'right' });
                doc.moveDown(0.3);
            });

            doc.moveDown(1);

            // Declaration
            doc.text(
                'אני מצהיר/ה כי האחריות להחליט באם כשרי הגופני מתאים לקבלת טיפול חלה עלי בלבד, כי אינני סובל/ת מבעיות רפואיות שעלולות לסכן אותי, ומאשר/ת כי המידע שמסרתי מלא ונכון ומוותר/ת על זכותי לתבוע את המטפל/ת בעתיד בהקשר לטיפול זה:',
                { align: 'right' },
            );
            doc.text(`${data.declaration === 'true' ? 'מאושר' : 'לא מאושר'}`, {
                align: 'right',
            });
            doc.moveDown(1);

            // Signature
            if (data.signature) {
                try {
                    const signatureBuffer = Buffer.from(
                        data.signature.replace(/^data:image\/\w+;base64,/, ''),
                        'base64',
                    );
                    doc.text('חתימה:', { align: 'center' });
                    doc.image(
                        signatureBuffer,
                        doc.page.width / 2 - 125,
                        doc.y,
                        { width: 250, height: 100 },
                    );
                    doc.moveDown(1);
                } catch (err) {
                    console.warn('Invalid signature image');
                }
            }

            // Footer
            doc.text(
                `טופס נוצר אוטומטית על ידי מערכת SAN © ${new Date().getFullYear()}`,
                { align: 'center' },
            );

            doc.end();

            await new Promise<void>((resolve, reject) => {
                writeStream.on('finish', () => resolve());
                writeStream.on('error', reject);
            });

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
