import 'reflect-metadata';
import dotenv from 'dotenv';
dotenv.config();

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import i18n from './config/i18n';
import v1Routes from './routes/v1';
import setupSwagger from './config/swagger/swaggerConfig';
import { errorHandler } from './middlewares/errorHandler';
import path from 'path';
import appConfig from './config/appConfig';
import prisma from './config/prismaClient';

const app = express();

// ---------------------
// CORS configuration
// ---------------------
const allowedOrigins = [
    'https://massage-health-declaration.netlify.app', // frontend prod
    'http://localhost:3000', // frontend dev
];

const corsOptions = {
    origin: (
        origin: string | undefined,
        callback: (err: Error | null, allow?: boolean) => void,
    ) => {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error(`Origin ${origin} not allowed by CORS`));
        }
    },
    credentials: true,
    optionsSuccessStatus: 200, // preflight for legacy browsers
};

// Apply CORS middleware BEFORE routes
app.use(cors(corsOptions));

// Handle OPTIONS preflight requests globally
app.options('*', cors(corsOptions));
// ---------------------
// Static files
// ---------------------
if (process.env.NODE_ENV === 'development') {
    app.use(
        express.static(
            path.join(__dirname, '..', appConfig.PUBLIC_ASSET_PATH || 'public'),
        ),
    );
} else {
    app.use(express.static(path.join(appConfig.PUBLIC_ASSET_PATH || 'public')));
}

// ---------------------
// Body parsing
// ---------------------
app.use(express.json({ limit: appConfig.UPLOAD_LIMIT }));
app.use(express.urlencoded({ limit: appConfig.UPLOAD_LIMIT, extended: true }));

// ---------------------
// i18n locale setup
// ---------------------
app.use(i18n.init);

app.use((req: Request, res: Response, next: NextFunction) => {
    const lang = req.query.lang as string;
    if (lang && typeof res.setLocale === 'function') {
        res.setLocale(lang);
    } else if (typeof res.setLocale === 'function') {
        res.setLocale('en');
    }
    next();
});

// ---------------------
// API routes
// ---------------------
app.use(v1Routes);

// ---------------------
// Swagger setup
// ---------------------
setupSwagger(app);

// ---------------------
// Error handling
// ---------------------
app.use(errorHandler);

// ---------------------
// Prisma shutdown
// ---------------------
process.on('SIGINT', async () => {
    await prisma.$disconnect();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    await prisma.$disconnect();
    process.exit(0);
});

export default app;
