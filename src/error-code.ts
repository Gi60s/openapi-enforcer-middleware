
class ErrorCode extends Error {
    public code: string

    constructor(message: string, code: string) {
        super(message)
        this.code = code
    }

    static default = ErrorCode
}

export = ErrorCode