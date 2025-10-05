import path from 'path';

interface AppConfig {
    PUBLIC_ASSET_PATH: string | undefined;
    UPLOAD_LIMIT: string;
    UPLOAD_SIZE_LIMIT: number;
    IMAGES_ASSET_PATH: string;
    IMAGES_WITH_PUBLIC_PATH: string;
    PDFFILE_ASSET_PATH: string;
    PDFFILE_WITH_PUBLIC_PATH: string;
    IMAGES_COURSE_FILE_FORMATS: string[];
    SERVER_URL: string;

    NODEMAILER_EMAIL: string;
    NODEMAILER_WEBAPP_PASS: string;

    PUPPETEER_EXECUTABLE_PATH: string | undefined;
}

const appConfig: AppConfig = {
    SERVER_URL: process.env.SERVER_URL || 'http://localhost:5000',
    PUBLIC_ASSET_PATH: process.env.PUBLIC_ASSET_PATH,
    UPLOAD_LIMIT: '1024mb',
    UPLOAD_SIZE_LIMIT: 5, //5MB
    IMAGES_ASSET_PATH: path.join('uploads', 'images'),
    IMAGES_WITH_PUBLIC_PATH: path.join(
        process.env.PUBLIC_ASSET_PATH || 'public',
        'uploads',
        'images',
    ),
    PDFFILE_ASSET_PATH: path.join('uploads', 'pdfFiles'),
    PDFFILE_WITH_PUBLIC_PATH: path.join(
        process.env.PUBLIC_ASSET_PATH || 'public',
        'uploads',
        'pdfFiles',
    ),
    IMAGES_COURSE_FILE_FORMATS: [
        'image/png',
        'image/jpeg',
        'image/jpg',
        'image/svg+xml',
    ],

    NODEMAILER_EMAIL: process.env.NODEMAILER_EMAIL || '',
    NODEMAILER_WEBAPP_PASS: process.env.NODEMAILER_WEBAPP_PASS || '',
    PUPPETEER_EXECUTABLE_PATH: process.env.PUPPETEER_EXECUTABLE_PATH,
};

export default appConfig;
