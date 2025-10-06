import sgMail from '@sendgrid/mail';
import appConfig from '../config/appConfig';

interface SendMailOptions {
    to: string | string[];
    subject: string;
    text: string;
    attachments?: { filename: string; path: string }[];
}

sgMail.setApiKey(appConfig.SENDGRID_API_KEY); // Add SendGrid API key in your config

export async function sendMail({
    to,
    subject,
    text,
    attachments,
}: SendMailOptions) {
    try {
        const msg: sgMail.MailDataRequired = {
            from: appConfig.SENDGRID_FROM_EMAIL, // verified sender
            to: Array.isArray(to) ? to : [to],
            subject,
            text,
            attachments: attachments?.map((att) => ({
                filename: att.filename,
                path: att.path,
            })),
        };

        const result = await sgMail.send(msg); // returns array of responses
        return result;
    } catch (error: any) {
        console.error('SendGrid Error:', error);
        throw new Error(error?.message || 'Error sending email via SendGrid');
    }
}
