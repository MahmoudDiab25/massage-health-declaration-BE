import multer, { StorageEngine, FileFilterCallback } from 'multer';
import path from 'path';
import fs from 'fs-extra';
import { Request, Response, NextFunction } from 'express';

import appConfig from '../config/appConfig';
import logger from './logger';

// Define allowed default file types
const allowedFileTypes = ['image/png', 'image/jpeg', 'image/jpg'];

interface UploadedFile extends Express.Multer.File {
    url?: string;
}

class FileFormatError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'FileFormatError';
    }
}

const createStorage = (destinationPath: string): StorageEngine =>
    multer.diskStorage({
        destination: (req, file, cb) => {
            fs.mkdirSync(destinationPath, { recursive: true });
            cb(null, destinationPath);
        },
        filename: (req, file, cb) => {
            const ext = path.extname(file.originalname); // e.g. ".jpg"
            const baseName = path
                .basename(file.originalname, ext)
                .replace(/\s+/g, '_'); // optional: sanitize
            const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
            const finalName = `${uniqueSuffix}${ext}`;
            cb(null, finalName);
        },
    });

// ✅ Promise-wrapped version
const uploadFile = (
    destinationPath: string,
    allowedFormats: string[] = [],
    fields: string[] = ['file'], // default to ['file']
): ((req: Request, res: Response, next: NextFunction) => Promise<void>) => {
    return async (req, res, next) => {
        if (allowedFormats.length === 0) {
            allowedFormats = allowedFileTypes;
        }
        const upload = multer({
            storage: createStorage(destinationPath),
            limits: {
                fileSize: appConfig.UPLOAD_SIZE_LIMIT * 1024 * 1024, // in MB limit
            },
            fileFilter: (req, file, cb: FileFilterCallback) => {
                logger.info('Uploading file:', file.originalname);

                const fieldName = file.fieldname;

                if (allowedFormats.includes(file.mimetype)) {
                    cb(null, true);
                } else {
                    const allowedFormatsMessage = allowedFormats
                        .map((format) => format.split('/')[1])
                        .join(', ');
                    const errorMessage = `Invalid format for field "${fieldName}". Allowed: ${allowedFormatsMessage}`;
                    const error = new FileFormatError(errorMessage);
                    cb(error as unknown as null, false);
                }
            },
        }).fields(
            fields.map((fieldName) => ({ name: fieldName, maxCount: 10 })), // allow up to 10 files for each field
        );

        try {
            await new Promise<void>((resolve, reject) => {
                upload(req, res, (err: any) => {
                    if (err instanceof multer.MulterError) {
                        if (err.code === 'LIMIT_FILE_SIZE') {
                            return reject(
                                new FileFormatError(
                                    `File too large. Maximum size allowed is ${appConfig.UPLOAD_SIZE_LIMIT}MB.`,
                                ),
                            );
                        }
                        return reject(err);
                    } else if (err instanceof FileFormatError) {
                        return reject(err);
                    } else if (err) {
                        return reject(err);
                    }

                    // add "url" property for each uploaded file
                    const filesByField = req.files as {
                        [fieldname: string]: UploadedFile[];
                    };

                    Object.values(filesByField).forEach((files) => {
                        files.forEach((file) => {
                            file.url = file.path.replace(/^public[\\/]/, '/'); // remove "public\" or "public/"
                        });
                    });

                    resolve();
                });
            });

            next(); // call next only when upload is successful
        } catch (err) {
            next(err); // pass error to error handler middleware
        }
    };
};

const removeFiles = async (filePaths: string[]): Promise<void> => {
    for (const filePath of filePaths) {
        try {
            const resolvedPath = path.resolve(filePath);
            const exists = await fs.pathExists(resolvedPath);

            if (exists) {
                await fs.remove(resolvedPath);
                logger.info(`Deleted: ${resolvedPath}`);
            }
        } catch (err) {
            logger.error(`Error deleting file: ${filePath}`, err);
        }
    }
};

export { uploadFile, removeFiles };
