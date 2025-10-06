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

    // ✅ Register fontkit before embedding custom fonts
    pdfDoc.registerFontkit(fontkit);

    // Embed a standard font (you can add a TTF font for Hebrew if needed)
    const fontBytes = fs.readFileSync(
        path.join(__dirname, '../fonts/DavidLibre-Regular.ttf'),
    );
    const hebrewFont = await pdfDoc.embedFont(fontBytes);

    const page = pdfDoc.addPage([595, 842]); // A4
    let y = page.getHeight() - 50;

    const drawRTLText = (text: string, fontSize = 14) => {
        const textWidth = hebrewFont.widthOfTextAtSize(text, fontSize);
        page.drawText(text, {
            x: page.getWidth() - 40 - textWidth,
            y,
            size: fontSize,
            font: hebrewFont, // use embedded TTF
            color: rgb(0, 0, 0),
        });
        y -= fontSize + 5;
    };

    const drawLTRText = (text: string, fontSize = 14) => {
        page.drawText(text, {
            x: 40,
            y,
            size: fontSize,
            font: hebrewFont, // use embedded TTF
            color: rgb(0, 0, 0),
        });
        y -= fontSize + 5;
    };

    // Title
    drawRTLText('הצהרת בריאות לקבלת עיסוי', 18);
    drawRTLText(
        'השאלון הינו סודי בהחלט וישמש למטרת הטיפול וקידום צרכי המטופל בלבד',
        12,
    );
    drawRTLText('בעיות רפואיות מיוחדות - האם את/ה סובל/ת מ...', 12);
    y -= 10;

    // Health Questions
    drawRTLText('שאלות בריאות', 14);
    data.healthQuestions.forEach((q) => {
        drawRTLText(`${q.label} ${q.value || ''}`);
        if (q.extra) drawRTLText(`- ${q.extra}`);
        y -= 5;
    });

    y -= 10;
    drawRTLText(`עוצמת טיפול: ${data.treatmentIntensity || ''}`);
    drawRTLText(`אזורי מיקוד: ${data.focusArea || ''}`);
    y -= 10;

    // Personal info
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
            value: clientBirthday
                ? new Date(clientBirthday).toLocaleDateString('he-IL', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                  })
                : '',
        },
    ];

    personalFields.forEach((f) => {
        drawRTLText(f.label);
        drawLTRText(f.value || '');
        y -= 5;
    });

    y -= 10;
    drawRTLText(
        `אני מצהיר/ה כי האחריות להחליט באם כשרי הגופני מתאים לקבלת טיפול חלה עלי בלבד, כי אינני סובל/ת מבעיות רפואיות שעלולות לסכן אותי, ומאשר/ת כי המידע שמסרתי מלא ונכון ומוותר/ת על זכותי לתבוע את המטפל/ת בעתיד בהקשר לטיפול זה.: ${data.declaration === 'true' ? 'מאושר' : 'לא מאושר'}`,
    );

    // Signature
    if (data.signature) {
        try {
            const sigBytes = Buffer.from(
                data.signature.replace(/^data:image\/\w+;base64,/, ''),
                'base64',
            );
            const sigImage = await pdfDoc.embedPng(sigBytes);
            const dims = sigImage.scale(1);
            page.drawImage(sigImage, {
                x: page.getWidth() / 2 - 125,
                y: y - 100,
                width: 250,
                height: 100,
            });
            y -= 110;
        } catch (err) {
            console.warn('Invalid signature');
        }
    }

    // Footer
    drawRTLText(
        `טופס נוצר אוטומטית על ידי מערכת SAN © ${new Date().getFullYear()}`,
        12,
    );

    const pdfBytes = await pdfDoc.save();
    const now = new Date();
    const fileNameDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
        now.getDate(),
    ).padStart(
        2,
        '0',
    )}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(
        now.getSeconds(),
    ).padStart(2, '0')}`;

    const fileName = `${data.clientName}_${fileNameDate}.pdf`;

    const pdfPath = path.join(appConfig.PDFFILE_WITH_PUBLIC_PATH, fileName);

    fs.writeFileSync(pdfPath, pdfBytes);

    const filePath = [
        appConfig.SERVER_URL,
        appConfig.PDFFILE_ASSET_PATH,
        fileName,
    ]
        .join('/')
        .replace(/\\/g, '/');

    return { filePath: filePath, fileName: fileName };
}
