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
export declare type PartialDocsOptions = Partial<DocsOptions>;
export declare function docsMiddleware(openapi: any, options?: Partial<DocsOptions>): (req: Express.Request, res: Express.Response) => Promise<void>;
