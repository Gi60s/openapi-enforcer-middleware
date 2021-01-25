import Express from 'express';
export declare function docsMiddleware(specUrlPath: string, serverPort: number): (req: Express.Request, res: Express.Response, next: Express.NextFunction) => void;
