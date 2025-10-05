import 'express';

declare module 'express-serve-static-core' {
    interface Response {
        __(key: string, ...args: any[]): string;
        setLocale(locale: string): void;
    }
}
