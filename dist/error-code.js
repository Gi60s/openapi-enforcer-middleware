"use strict";
class ErrorCode extends Error {
    constructor(message, code) {
        super(message);
        this.code = code;
    }
}
ErrorCode.default = ErrorCode;
module.exports = ErrorCode;
//# sourceMappingURL=error-code.js.map