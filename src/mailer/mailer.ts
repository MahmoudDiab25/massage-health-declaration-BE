import fs from 'fs';
import path from 'path';
import sgMail from '@sendgrid/mail';
import appConfig from '../config/appConfig';

sgMail.setApiKey(appConfig.SENDGRID_API_KEY);

interface SendMailOptions {
    to: string | string[];
    subject: string;
    text?: string;
    attachments?: { filename: string; path: string }[];
}

export async function sendMail({
    to,
    subject,
    text = '',
    attachments,
}: SendMailOptions) {
    const attachmentData =
        attachments?.map((file) => {
            // If it's a full URL, strip the domain and use local file path instead
            let localPath = file.path;

            if (file.path.startsWith('http')) {
                // e.g. https://massage-health-declaration-be.onrender.com/uploads/pdfFiles/xxx.pdf
                const url = new URL(file.path);
                localPath = path.join('public', url.pathname); // => public/uploads/pdfFiles/xxx.pdf
            }

            const fileContent = fs
                .readFileSync(path.resolve(localPath))
                .toString('base64');
            return {
                filename: file.filename,
                type: 'application/pdf',
                content: fileContent,
                disposition: 'attachment',
            };
        }) ?? [];

    const msg = {
        to,
        from: appConfig.SENDGRID_FROM_EMAIL, // must be verified sender in SendGrid
        subject,
        text,
        attachments: attachmentData,
    };

    await sgMail.send(msg);
    console.log('✅ Email sent successfully');
}
