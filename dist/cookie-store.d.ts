import Express from 'express';
interface AnyObject {
    [key: string]: any;
}
export default function (): {
    getData(req: Express.Request, _res: Express.Response): Promise<AnyObject>;
    setData(req: Express.Request, res: Express.Response, data: AnyObject): Promise<void>;
};
export {};
