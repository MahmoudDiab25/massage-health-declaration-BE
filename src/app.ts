import 'reflect-metadata';
import dotenv from 'dotenv';
// Load environment variables from .env file
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

const allowedOrigins = [
    'https://massage-health-declaration.netlify.app/', // production FE domain
    'http://localhost:3000/', // local dev
];

const corsOptions = {
    origin: (origin: string | undefined, callback: Function) => {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // handle preflight

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
