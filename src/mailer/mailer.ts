import fs from 'fs';
import path from 'path';
import sgMail from '@sendgrid/mail';
import appConfig from '../config/appConfig';

sgMail.setApiKey(appConfig.SENDGRID_API_KEY);

interface SendMailOptions {
    to: string | string[];
    subject: string;
    text?: string;
    html?: string;
    attachments?: { filename: string; path: string }[];
}

export async function sendMail({
    to,
    subject,
    text = '',
    html = '',
    attachments,
}: SendMailOptions) {
    const attachmentData =
        attachments
            ?.map((file) => {
                let localPath = file.path;

                try {
                    // If it’s a full URL, strip the domain and map to the local public folder
                    if (localPath.startsWith('http')) {
                        const url = new URL(localPath);
                        // decode URI for Hebrew chars like %D7%9E...
                        const decodedPathname = decodeURIComponent(
                            url.pathname,
                        );
                        // join with the local project path
                        localPath = path.join(
                            process.cwd(),
                            'public',
                            decodedPathname,
                        );
                    } else {
                        // if relative, make sure it's absolute
                        localPath = path.resolve(localPath);
                    }

                    // Double-check file existence
                    if (!fs.existsSync(localPath)) {
                        console.error('❌ File not found at:', localPath);
                        return null;
                    }

                    // Read and encode to Base64
                    const fileContent = fs
                        .readFileSync(localPath)
                        .toString('base64');

                    return {
                        filename: file.filename,
                        type: 'application/pdf',
                        content: fileContent,
                        disposition: 'attachment',
                    };
                } catch (error) {
                    console.error(
                        '⚠️ Error reading attachment file:',
                        file.path,
                        error,
                    );
                    return null;
                }
            })
            .filter((f): f is NonNullable<typeof f> => f !== null) ?? [];

    const msg = {
        to,
        from: appConfig.SENDGRID_FROM_EMAIL, // must be a verified sender in SendGrid
        subject,
        text,
        html,
        attachments: attachmentData,
    };

    try {
        await sgMail.send(msg);
        console.log('✅ Email sent successfully');
    } catch (error: any) {
        console.error('❌ SendGrid Error:', error.response?.body || error);
        throw error;
    }
}

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
//         service: 'gmail',
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
