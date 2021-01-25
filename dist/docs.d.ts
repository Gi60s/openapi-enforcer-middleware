import Express from 'express';
export declare function docsMiddleware(enforcerPromise: Promise<any>, specUrlPath: string, serverPort: number, redocOptions?: Record<string, unknown>): (req: Express.Request, res: Express.Response, next: Express.NextFunction) => void;
