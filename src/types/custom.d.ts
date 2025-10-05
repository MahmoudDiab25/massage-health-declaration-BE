declare module 'i18n';
declare module 'cors';
declare module 'nodemailer';
declare module 'fs-extra';
declare module 'archiver';
declare module 'swagger-ui-express';

declare module 'fontkit' {
    interface Fontkit {
        create: any;
    }
    const fontkit: Fontkit;
    export default fontkit;
}
