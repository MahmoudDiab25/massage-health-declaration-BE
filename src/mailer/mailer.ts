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
            const fileContent = fs
                .readFileSync(path.resolve(file.path))
                .toString('base64');
            return {
                filename: file.filename,
                type: 'application/pdf', // or detect dynamically
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
