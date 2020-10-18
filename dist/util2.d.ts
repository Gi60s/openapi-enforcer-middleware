import Express from 'express';
import * as I from './interfaces';
interface OptionTemplate {
    defaults: {
        [key: string]: any;
    };
    required: Array<string>;
    validators: {
        [key: string]: (v: any) => string;
    };
}
export declare function copy(value: any): any;
export declare function errorFromException(exception: any): I.StatusError;
export declare function findEnforcerParentComponent(current: any, name: string): any;
export declare function handleRequestError(opts: I.MiddlewareOptions, error: I.StatusError, res: Express.Response, next: Express.NextFunction): void;
export declare function initialized(req: Express.Request, next?: Express.NextFunction): boolean;
export declare function normalizeOptions<T>(options: T, template: OptionTemplate): T;
export declare function reqHasBody(req: any): boolean;
export declare function sender(opts: I.MiddlewareOptions, req: Express.Request, res: Express.Response, next: Express.NextFunction): (this: I.MiddlewareRequestData, body: any) => void;
export declare const optionValidators: {
    validatorQueryParams: typeof validatorQueryParams;
    validatorBoolean: typeof validatorBoolean;
    validatorNonEmptyString: typeof validatorNonEmptyString;
    validatorString: typeof validatorString;
};
declare function validatorQueryParams(v: any): string;
declare function validatorBoolean(v: any): string;
declare function validatorNonEmptyString(v: any): string;
declare function validatorString(v: any): string;
export {};
