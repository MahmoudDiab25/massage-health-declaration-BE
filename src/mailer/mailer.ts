// import fs from 'fs';
// import path from 'path';
// import sgMail from '@sendgrid/mail';
// import appConfig from '../config/appConfig';

// sgMail.setApiKey(appConfig.SENDGRID_API_KEY);

// interface SendMailOptions {
//     to: string | string[];
//     subject: string;
//     text?: string;
//     html?: string;
//     attachments?: { filename: string; path: string }[];
// }

// export async function sendMail({
//     to,
//     subject,
//     text = '',
//     html = '',
//     attachments,
// }: SendMailOptions) {
//     const attachmentData =
//         attachments
//             ?.map((file) => {
//                 let localPath = file.path;

//                 try {
//                     // If it’s a full URL, strip the domain and map to the local public folder
//                     if (localPath.startsWith('http')) {
//                         const url = new URL(localPath);
//                         // decode URI for Hebrew chars like %D7%9E...
//                         const decodedPathname = decodeURIComponent(
//                             url.pathname,
//                         );
//                         // join with the local project path
//                         localPath = path.join(
//                             process.cwd(),
//                             'public',
//                             decodedPathname,
//                         );
//                     } else {
//                         // if relative, make sure it's absolute
//                         localPath = path.resolve(localPath);
//                     }

//                     // Double-check file existence
//                     if (!fs.existsSync(localPath)) {
//                         console.error('❌ File not found at:', localPath);
//                         return null;
//                     }

//                     // Read and encode to Base64
//                     const fileContent = fs
//                         .readFileSync(localPath)
//                         .toString('base64');

//                     return {
//                         filename: file.filename,
//                         type: 'application/pdf',
//                         content: fileContent,
//                         disposition: 'attachment',
//                     };
//                 } catch (error) {
//                     console.error(
//                         '⚠️ Error reading attachment file:',
//                         file.path,
//                         error,
//                     );
//                     return null;
//                 }
//             })
//             .filter((f): f is NonNullable<typeof f> => f !== null) ?? [];

//     const msg = {
//         to,
//         from: appConfig.SENDGRID_FROM_EMAIL, // must be a verified sender in SendGrid
//         subject,
//         text,
//         attachments: attachmentData,
//     };

//     try {
//         await sgMail.send(msg);
//         console.log('✅ Email sent successfully');
//     } catch (error: any) {
//         console.error('❌ SendGrid Error:', error.response?.body || error);
//         throw error;
//     }
// }

// import fs from 'fs';
// import path from 'path';
// import nodemailer from 'nodemailer';
// import appConfig from '../config/appConfig'; // use env vars for Gmail credentials

// interface SendMailOptions {
//     to: string | string[];
//     subject: string;
//     text?: string;
//     attachments?: { filename: string; path: string }[];
// }

// export async function sendMail({
//     to,
//     subject,
//     text = '',
//     attachments,
// }: SendMailOptions) {
//     // 1️⃣ Create transporter with Gmail SMTP
//     const transporter = nodemailer.createTransport({
//         host: 'smtp.gmail.com',
//         port: 587,
//         secure: false, // STARTTLS
//         auth: {
//             user: appConfig.NODEMAILER_EMAIL, // your Gmail address
//             pass: appConfig.NODEMAILER_WEBAPP_PASS, // Gmail App Password
//         },
//     });

//     // 2️⃣ Prepare attachments
//     const attachmentData =
//         attachments
//             ?.map((file) => {
//                 let localPath = file.path;

//                 try {
//                     // Handle URLs
//                     if (localPath.startsWith('http')) {
//                         const url = new URL(localPath);
//                         const decodedPathname = decodeURIComponent(
//                             url.pathname,
//                         );
//                         localPath = path.join(
//                             process.cwd(),
//                             'public',
//                             decodedPathname,
//                         );
//                     } else {
//                         localPath = path.resolve(localPath);
//                     }

//                     if (!fs.existsSync(localPath)) {
//                         console.error('❌ File not found at:', localPath);
//                         return null;
//                     }

//                     return {
//                         filename: file.filename,
//                         path: localPath,
//                     };
//                 } catch (err) {
//                     console.error(
//                         '⚠️ Error processing attachment:',
//                         file.path,
//                         err,
//                     );
//                     return null;
//                 }
//             })
//             .filter((f): f is NonNullable<typeof f> => f !== null) ?? [];

//     // 3️⃣ Send mail
//     const mailOptions = {
//         from: appConfig.NODEMAILER_EMAIL,
//         to: Array.isArray(to) ? to.join(',') : to,
//         subject,
//         text,
//         attachments: attachmentData,
//     };

//     try {
//         await transporter.sendMail(mailOptions);
//         console.log('✅ Email sent successfully via Gmail SMTP');
//     } catch (error) {
//         console.error('❌ Nodemailer Error:', error);
//         throw error;
//     }
// }

// interface SendMailOptions {
//     to: string | string[]; // single email or array
//     subject: string;
//     text?: string;
//     attachments?: { filename: string; path: string }[];
// }

// import { google } from 'googleapis';
// import nodemailer from 'nodemailer';
// import fs from 'fs';
// import path from 'path';

// export async function sendMail({
//     to,
//     subject,
//     text,
//     attachments,
// }: SendMailOptions) {
//     const oAuth2Client = new google.auth.OAuth2(
//         process.env.GMAIL_CLIENT_ID,
//         process.env.GMAIL_CLIENT_SECRET,
//     );

//     oAuth2Client.setCredentials({
//         refresh_token: process.env.GMAIL_REFRESH_TOKEN,
//     });
//     const accessToken = await oAuth2Client.getAccessToken();

//     // preprocess attachments
//     const attachmentData = attachments
//         ?.map((file) => {
//             let localPath = file.path.startsWith('http')
//                 ? path.join(
//                       process.cwd(),
//                       'public',
//                       decodeURIComponent(new URL(file.path).pathname),
//                   )
//                 : path.resolve(file.path);

//             if (!fs.existsSync(localPath)) {
//                 console.error('File not found:', localPath);
//                 return null;
//             }

//             return { filename: file.filename, path: localPath };
//         })
//         .filter((f): f is NonNullable<typeof f> => f !== null); // ✅ type-safe

//     const transporter = nodemailer.createTransport({
//         service: 'gmail',
//         auth: {
//             type: 'OAuth2',
//             user: process.env.GMAIL_EMAIL,
//             clientId: process.env.GMAIL_CLIENT_ID,
//             clientSecret: process.env.GMAIL_CLIENT_SECRET,
//             refreshToken: process.env.GMAIL_REFRESH_TOKEN,
//             accessToken: accessToken?.token,
//         },
//     });

//     const mailOptions = {
//         from: process.env.GMAIL_EMAIL,
//         to: Array.isArray(to) ? to.join(',') : to,
//         subject,
//         text: text || '',
//         attachments: attachmentData,
//     };

//     const result = await transporter.sendMail(mailOptions);
//     console.log('✅ Email sent:', result.messageId);
//     return result;
// }

import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';

export interface SendMailOptions {
    to: string | string[];
    subject: string;
    text?: string;
    attachments?: { filename: string; path: string }[];
}

function encodeRFC2047Header(str: string) {
    // Base64 encode UTF-8 string and wrap in RFC2047 format
    return `=?UTF-8?B?${Buffer.from(str, 'utf8').toString('base64')}?=`;
}

function encodeAttachment(filePath: string, filename: string) {
    const content = fs.readFileSync(filePath).toString('base64');
    return `Content-Type: application/octet-stream; name="${filename}"
Content-Transfer-Encoding: base64
Content-Disposition: attachment; filename="${filename}"

${content}`;
}

export async function sendMail({
    to,
    subject,
    text,
    attachments,
}: SendMailOptions) {
    const oAuth2Client = new google.auth.OAuth2(
        process.env.GMAIL_CLIENT_ID,
        process.env.GMAIL_CLIENT_SECRET,
    );

    oAuth2Client.setCredentials({
        refresh_token: process.env.GMAIL_REFRESH_TOKEN,
    });

    const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });

    const toList = Array.isArray(to) ? to.join(', ') : to;
    let boundary = '----=_Part_' + new Date().getTime();

    let message = '';
    message += `From: ${process.env.GMAIL_EMAIL}\r\n`;
    message += `To: ${toList}\r\n`;
    message += `Subject: ${encodeRFC2047Header(subject)}\r\n`;
    message += `MIME-Version: 1.0\r\n`;
    if (attachments && attachments.length > 0) {
        message += `Content-Type: multipart/mixed; boundary="${boundary}"\r\n\r\n`;
        message += `--${boundary}\r\n`;
        message += `Content-Type: text/plain; charset="UTF-8"\r\n\r\n`;
        message += `${text || ''}\r\n\r\n`;

        for (let file of attachments) {
            let filePath = file.path.startsWith('http')
                ? path.join(
                      process.cwd(),
                      'public',
                      decodeURIComponent(new URL(file.path).pathname),
                  )
                : path.resolve(file.path);

            if (!fs.existsSync(filePath)) {
                console.error('❌ File not found:', filePath);
                continue;
            }

            message += `--${boundary}\r\n`;
            message += encodeAttachment(filePath, file.filename);
            message += `\r\n`;
        }

        message += `--${boundary}--`;
    } else {
        message += `Content-Type: text/plain; charset="UTF-8"\r\n\r\n`;
        message += `${text || ''}`;
    }

    const raw = Buffer.from(message)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

    const res = await gmail.users.messages.send({
        userId: 'me',
        requestBody: {
            raw,
        },
    });

    console.log('✅ Email sent via Gmail API:', res.data.id);
    return res.data;
}
