declare class ErrorCode extends Error {
    code: string;
    constructor(message: string, code: string);
    static default: typeof ErrorCode;
}
export = ErrorCode;
