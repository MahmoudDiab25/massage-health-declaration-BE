import nodemailer from 'nodemailer';
import { google } from 'googleapis';
import appConfig from '../config/appConfig';

interface SendMailOptions {
    to: string | string[]; // <--- allow array
    subject: string;
    text: string;
    attachments?: { filename: string; path: string }[];
}

export async function sendMail({
    to,
    subject,
    text,
    attachments,
}: SendMailOptions) {
    const transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        auth: {
            user: appConfig.NODEMAILER_EMAIL,
            pass: appConfig.NODEMAILER_WEBAPP_PASS, //this is webapp pass, not gmail pass (https://myaccount.google.com/ > Sign-in & Security > App Passwords)
        },
        debug: true, // prints SMTP traffic
        logger: true,
    });

    const mailOptions = {
        from: appConfig.NODEMAILER_EMAIL,
        to: Array.isArray(to) ? to.join(',') : to, // <--- convert array to comma-separated string
        subject,
        text,
        attachments,
    };

    const result = await transporter.sendMail(mailOptions);
    return result;
}
