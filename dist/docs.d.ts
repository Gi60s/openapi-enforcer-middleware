import Express from 'express';
export interface DocsOptions {
    padding?: string;
    preRedocInitScripts: string[];
    postRedocInitScripts: string[];
    redoc: {
        cdnVersion?: string;
        options?: Record<string, unknown>;
    };
    styleSheets: string[];
    title: string;
}
export declare function docsMiddleware(enforcerPromise: Promise<any>, options?: Partial<DocsOptions>): (req: Express.Request, res: Express.Response, next: Express.NextFunction) => void;
