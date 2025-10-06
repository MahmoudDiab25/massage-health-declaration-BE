import fontkit from '@pdf-lib/fontkit';
import { PDFDocument, rgb } from 'pdf-lib';
import fs from 'fs';
import path from 'path';
import appConfig from '../config/appConfig';

interface PersonalInfo {
    clientName: string;
    clientId?: string;
    clientPhone?: string;
    clientLocation?: string;
    clientBirthday?: string;
}

interface HealthQuestion {
    label: string;
    value?: string;
    extra?: string;
}

interface PDFData {
    personalInfo: PersonalInfo;
    healthQuestions: HealthQuestion[];
    treatmentIntensity?: string;
    focusArea?: string;
    declaration?: string;
    signature?: string; // base64 image
    clientName: string;
}

export async function pdfLibGenerator(
    data: PDFData,
): Promise<{ fileName: string; filePath: string }> {
    const pdfDoc = await PDFDocument.create();
    pdfDoc.registerFontkit(fontkit);

    const fontBytes = fs.readFileSync(
        path.join(__dirname, '../fonts/DavidLibre-Regular.ttf'),
    );
    const font = await pdfDoc.embedFont(fontBytes);

    const pageWidth = 595;
    const pageHeight = 842;
    const margin = 40;
    const topMargin = 50;
    const bottomMargin = 50;
    const lineSpacing = 6;

    let page = pdfDoc.addPage([pageWidth, pageHeight]);
    let y = pageHeight - topMargin;

    const footerTextRTL = 'טופס נוצר אוטומטית על ידי מערכת';
    const footerTextLTR = `SAN © ${new Date().getFullYear()}`;
    const footerFontSize = 10;

    const addNewPage = () => {
        page = pdfDoc.addPage([pageWidth, pageHeight]);
        y = pageHeight - topMargin;
    };

    const wrapText = (text: string, maxWidth: number, fontSize: number) => {
        const lines: string[] = [];
        let line = '';
        for (const word of text.split(' ')) {
            const testLine = line ? `${line} ${word}` : word;
            if (font.widthOfTextAtSize(testLine, fontSize) > maxWidth) {
                if (line) lines.push(line);
                let subLine = '';
                for (const char of word) {
                    if (
                        font.widthOfTextAtSize(subLine + char, fontSize) >
                        maxWidth
                    ) {
                        lines.push(subLine);
                        subLine = char;
                    } else subLine += char;
                }
                line = subLine;
            } else {
                line = testLine;
            }
        }
        if (line) lines.push(line);
        return lines;
    };

    const drawText = (text: string, fontSize = 14, rtl = false) => {
        if (!text) return;
        const lines = wrapText(text, pageWidth - margin * 2, fontSize);
        for (const lineText of lines) {
            if (y - fontSize < bottomMargin) addNewPage();
            const textWidth = font.widthOfTextAtSize(lineText, fontSize);
            page.drawText(lineText, {
                x: rtl ? pageWidth - margin - textWidth : margin,
                y,
                size: fontSize,
                font,
                color: rgb(0, 0, 0),
            });
            y -= fontSize + lineSpacing;
        }
    };

    // --- Title ---
    drawText('הצהרת בריאות לקבלת עיסוי', 18, true);
    drawText(
        'השאלון הינו סודי בהחלט וישמש למטרת הטיפול וקידום צרכי המטופל בלבד',
        12,
        true,
    );
    drawText('בעיות רפואיות מיוחדות - האם את/ה סובל/ת מ...', 12, true);
    y -= 10;

    // --- Health Questions ---
    data.healthQuestions.forEach((q) => {
        drawText(`${q.label} ${q.value || ''}`, 12, true);
        if (q.extra) drawText(`- ${q.extra}`, 12, true);
        y -= 10; // extra spacing between questions
    });

    y -= 10;

    // --- Treatment Info ---
    drawText(`עוצמת טיפול: ${data.treatmentIntensity || ''}`, 12, true);
    drawText(`אזורי מיקוד: ${data.focusArea || ''}`, 12, true);

    // --- Personal Info --- new page
    addNewPage();
    const {
        clientName,
        clientId,
        clientPhone,
        clientLocation,
        clientBirthday,
    } = data.personalInfo;

    const personalFields: { label: string; value?: string }[] = [
        { label: 'שם המטופל:', value: clientName },
        { label: 'ת.ז:', value: clientId },
        { label: 'טלפון:', value: clientPhone },
        { label: 'כתובת:', value: clientLocation },
        {
            label: 'תאריך לידה:',
            value: clientBirthday,
        },
    ];

    personalFields.forEach((f) => {
        drawText(f.label, 12, true);
        drawText(f.value || '', 12, false);
    });

    y -= 10;

    // --- Declaration ---
    if (data.declaration) {
        drawText(
            `אני מצהיר/ה כי האחריות להחליט באם כשרי הגופני מתאים לקבלת טיפול חלה עלי בלבד, כי אינני סובל/ת מבעיות רפואיות שעלולות לסכן אותי, ומאשר/ת כי המידע שמסרתי מלא ונכון ומוותר/ת על זכותי לתבוע את המטפל/ת בעתיד בהקשר לטיפול זה: ${data.declaration === 'true' ? 'מאושר' : 'לא מאושר'}`,
            12,
            true,
        );
    }

    // --- Signature --- new page
    if (data.signature) {
        // addNewPage();
        drawText('חתימה', 12, true);

        try {
            const sigBytes = Buffer.from(
                data.signature.replace(/^data:image\/\w+;base64,/, ''),
                'base64',
            );
            const sigImage = await pdfDoc.embedPng(sigBytes);

            const sigHeight = 100;
            const sigWidth = 250;
            const sigSpacing = 5;

            page.drawImage(sigImage, {
                x: pageWidth / 2 - sigWidth / 2,
                y: y - sigHeight,
                width: sigWidth,
                height: sigHeight,
            });

            y -= sigHeight + sigSpacing;

            // Underline
            const lineY = y;
            page.drawLine({
                start: { x: pageWidth / 2 - sigWidth / 2, y: lineY },
                end: { x: pageWidth / 2 + sigWidth / 2, y: lineY },
                thickness: 1,
                color: rgb(0, 0, 0),
            });

            y -= 10;
        } catch {
            console.warn('Invalid signature image.');
        }
    }

    // Footer
    // Hebrew (RTL) – right-aligned
    const rtlWidth = font.widthOfTextAtSize(footerTextRTL, footerFontSize);
    page.drawText(footerTextRTL, {
        x: page.getWidth() - margin - rtlWidth,
        y: bottomMargin - footerFontSize - 5,
        size: footerFontSize,
        font: font,
        color: rgb(0.5, 0.5, 0.5),
    });

    // English (LTR) – immediately after Hebrew
    const ltrWidth = font.widthOfTextAtSize(footerTextLTR, footerFontSize);
    page.drawText(footerTextLTR, {
        x: page.getWidth() - margin + 5, // small spacing after Hebrew
        y: bottomMargin - footerFontSize - 5,
        size: footerFontSize,
        font: font,
        color: rgb(0.5, 0.5, 0.5),
    });
    // Save PDF
    const pdfBytes = await pdfDoc.save();

    const now = new Date();

    const fileNameDate = `${now.getFullYear()}-${String(
        now.getMonth() + 1,
    ).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}_${String(
        now.getHours(),
    ).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(
        now.getSeconds(),
    ).padStart(2, '0')}`;

    const fileName = `${data.clientName}_${fileNameDate}.pdf`;

    const pdfDir = path.join(appConfig.PDFFILE_WITH_PUBLIC_PATH);

    // Ensure the folder exists
    if (!fs.existsSync(pdfDir)) {
        fs.mkdirSync(pdfDir, { recursive: true });
    }

    const pdfPath = path.join(pdfDir, fileName);
    fs.writeFileSync(pdfPath, pdfBytes);

    const filePath = [
        appConfig.SERVER_URL,
        appConfig.PDFFILE_ASSET_PATH,
        fileName,
    ]
        .join('/')
        .replace(/\\/g, '/');

    return { fileName, filePath };
}
