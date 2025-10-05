import 'reflect-metadata';
import dotenv from 'dotenv';
// Load environment variables from .env file
dotenv.config();

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import i18n from './config/i18n';
import v1Routes from './routes/v1';
import { PrismaClient } from '@prisma/client';
import setupSwagger from './config/swagger/swaggerConfig';
import { errorHandler } from './middlewares/errorHandler';
import { CorsOptions } from 'cors';
import path from 'path';
import appConfig from './config/appConfig';
import prisma from './config/prismaClient';

const app = express();

app.use(
    cors({
        origin: (
            origin: string | undefined,
            callback: (err: Error | null, allow?: boolean) => void,
        ) => {
            const allowedOrigins = [
                'https://massage-health-declaration.netlify.app', // ✅ production
                'http://localhost:3000', // ✅ local dev
            ];

            if (!origin) return callback(null, true); // allow server-to-server, like cron jobs
            if (allowedOrigins.includes(origin)) return callback(null, true);

            return callback(new Error(`Origin ${origin} not allowed by CORS`));
        },
        credentials: true,
    }),
);

if (process.env.NODE_ENV == 'development') {
    app.use(
        express.static(
            path.join(__dirname, '..', appConfig.PUBLIC_ASSET_PATH || 'public'),
        ),
    );
} else {
    app.use(express.static(path.join(appConfig.PUBLIC_ASSET_PATH || 'public')));
}

app.use(express.json({ limit: appConfig.UPLOAD_LIMIT }));
app.use(express.urlencoded({ limit: appConfig.UPLOAD_LIMIT, extended: true }));

//locale init
app.use(i18n.init);
//set locale from lang param
app.use((req, res, next) => {
    const lang = req.query.lang as string;
    if (lang) {
        res.setLocale(lang);
    } else {
        res.setLocale('en');
    }
    next();
});
//

app.use(express.json());

// app.use((req: Request, res: Response, next: NextFunction) => {
//     res.setHeader('Access-Control-Allow-Origin', '*');
//     next();
// });

app.use(v1Routes);
// Swagger setup
setupSwagger(app);

app.use(errorHandler);
// Prisma clean shutdown
process.on('SIGINT', async () => {
    await prisma.$disconnect();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    await prisma.$disconnect();
    process.exit(0);
});

export default app;
