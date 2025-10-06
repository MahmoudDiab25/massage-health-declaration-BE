import { NextFunction, Request, Response } from 'express';
import { inject, injectable } from 'inversify';
import { BaseController } from './BaseController';
import { PDFFileService } from '../services/pdfFileService';
import fs from 'fs';
import path from 'path';
import appConfig from '../config/appConfig';
import { sendMail } from '../mailer/mailer';
import { pdfLibGenerator } from '../utils/pdfLibGenerator';

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

            // Generate PDF with Puppeteer
            const pdfPath = path.join(
                appConfig.PDFFILE_WITH_PUBLIC_PATH,
                fileName,
            );

            // Inside createFile:
            const encodedUrl = await pdfLibGenerator({
                personalInfo: {
                    clientName: data.clientName,
                    clientId: data.clientId,
                    clientPhone: data.clientPhone,
                    clientLocation: data.clientLocation,
                    clientBirthday: data.clientBirthday,
                },
                healthQuestions: [
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
                ],
                treatmentIntensity: data.treatmentIntensity,
                focusArea: data.focusArea,
                declaration: data.declaration,
                signature: data.signature,
                clientName: data.clientName,
            });

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
