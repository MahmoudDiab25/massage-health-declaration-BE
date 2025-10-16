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

            // Inside createFile:
            const { fileName, filePath } = await pdfLibGenerator({
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
                        ...(data.heartIssuesText
                            ? { extra: data.heartIssuesText }
                            : {}),
                    },
                    {
                        label: 'בעיות עמוד שדרה:',
                        value: data.spineProblems,
                        ...(data.spineProblemsText
                            ? { extra: data.spineProblemsText }
                            : {}),
                    },
                    {
                        label: 'שברים/נקעים:',
                        value: data.fracturesOrSprains,
                        ...(data.fracturesOrSprainsText
                            ? { extra: data.fracturesOrSprainsText }
                            : {}),
                    },
                    {
                        label: 'שפעת/דלקת:',
                        value: data.fluOrFever,
                        ...(data.fluOrFeverText
                            ? { extra: data.fluOrFeverText }
                            : {}),
                    },
                    { label: 'אפילפסיה:', value: data.epilepsy },
                    {
                        label: 'הריון:',
                        value: data.pregnant,
                        ...(data.pregnantText
                            ? { extra: data.pregnantText }
                            : {}),
                    },
                    {
                        label: 'ניתוח אחרון:',
                        value: data.recentSurgery,
                        ...(data.recentSurgeryText
                            ? { extra: data.recentSurgeryText }
                            : {}),
                    },
                    {
                        label: 'תרופות כרוניות:',
                        value: data.chronicMedication,
                        ...(data.chronicMedicationText
                            ? { extra: data.chronicMedicationText }
                            : {}),
                    },
                    {
                        label: 'בעיות גופניות אחרות:',
                        value: data.otherPhysicalProblems,
                        ...(data.otherPhysicalProblemsText
                            ? { extra: data.otherPhysicalProblemsText }
                            : {}),
                    },
                    {
                        label: 'פטריות:',
                        value: data.fungus,
                        ...(data.fungusText ? { extra: data.fungusText } : {}),
                    },
                    {
                        label: 'אזורים כואבים:',
                        value: data.painfulAreas,
                        ...(data.painfulAreasText
                            ? { extra: data.painfulAreasText }
                            : {}),
                    },
                ],
                treatmentIntensity: data.treatmentIntensity,
                focusArea: data.focusArea,
                declaration: data.declaration,
                signature: data.signature,
                clientName: data.clientName,
            });

            const encodedFilePath = encodeURI(filePath); // encodes Hebrew characters
            const encodedFileName = encodeURI(fileName); // encodes Hebrew characters

            // ✅ Check if newPage/sendToSan key is true, then send to another email
            const mailTo =
                data.sendToSan === 'true'
                    ? ['san.ajami.hs@gmail.com']
                    : ['christinemassage.111@gmail.com'];

            await sendMail({
                to: mailTo,
                subject: `מילוי טופס הצהרת בריאות של ${data.clientName}`,
                text: `מצורף טופס הצהרת הבריאות ${data.clientName}. תודה!`,
                // html: '<p>מצורף <strong>טופס הצהרת הבריאות</strong> שלך. תודה!</p>',
                attachments: [
                    { filename: encodedFileName, path: encodedFilePath },
                ],
            });

            res.status(200).json({ url: encodedFilePath });
        } catch (error) {
            next(error);
        }
    }
}
