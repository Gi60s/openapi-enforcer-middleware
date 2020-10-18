"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.optionValidators = exports.sender = exports.reqHasBody = exports.normalizeOptions = exports.initialized = exports.handleRequestError = exports.findEnforcerParentComponent = exports.errorFromException = exports.copy = void 0;
const openapi_enforcer_1 = __importDefault(require("openapi-enforcer"));
const extractValue = openapi_enforcer_1.default.v3_0.Schema.extractValue;
function copy(value) {
    return copy2(value, new Map());
}
exports.copy = copy;
function errorFromException(exception) {
    const err = Error(exception.toString());
    err.exception = exception;
    if (exception.hasOwnProperty('statusCode'))
        err.statusCode = exception.statusCode;
    return err;
}
exports.errorFromException = errorFromException;
function findEnforcerParentComponent(current, name) {
    let data = current.enforcerData;
    while (data) {
        data = data.parent;
        if (data.result.constructor.name === name)
            return data.result;
    }
}
exports.findEnforcerParentComponent = findEnforcerParentComponent;
function handleRequestError(opts, error, res, next) {
    const statusCode = error.statusCode;
    if (statusCode === 404) {
        if (opts.handleNotFound) {
            res.status(404);
            res.set('content-type', 'text/plain');
            res.send(error.toString());
        }
        else {
            next();
        }
    }
    else if (statusCode === 405) {
        if (opts.handleMethodNotAllowed) {
            res.status(405);
            res.set('content-type', 'text/plain');
            res.send(error.toString());
        }
        else {
            next();
        }
    }
    else if (!statusCode || statusCode < 500) {
        if (opts.handleBadRequest) {
            res.status(statusCode || 400);
            res.set('content-type', 'text/plain');
            res.send(error.toString());
        }
        else {
            next();
        }
    }
    else {
        next(errorFromException(error));
    }
}
exports.handleRequestError = handleRequestError;
function initialized(req, next) {
    if (!req.enforcer) {
        if (next) {
            next(new Error('Unable to perform operation. Remember to initialize the openapi-enforcer-middleware.'));
        }
        return false;
    }
    return true;
}
exports.initialized = initialized;
function normalizeOptions(options, template) {
    const defaults = Object.assign({}, template.defaults);
    const required = template.required;
    const validators = Object.assign({}, template.validators);
    const result = Object.assign({}, defaults, options || {});
    required.forEach(key => {
        if (!(key in result))
            throw Error('Missing required option: ' + key);
    });
    Object.keys(validators).forEach(key => {
        if (result.hasOwnProperty(key)) {
            const error = validators[key](result[key]);
            if (error)
                throw Error('Invalid option "' + key + '". ' + error + '. Received: ' + result[key]);
        }
    });
    return result;
}
exports.normalizeOptions = normalizeOptions;
function reqHasBody(req) {
    if (!req.hasOwnProperty('body'))
        return false;
    return req.headers['transfer-encoding'] !== undefined ||
        (!isNaN(req.headers['content-length']) && req.headers['content-length'] > 0);
}
exports.reqHasBody = reqHasBody;
function sender(opts, req, res, next) {
    return function (body) {
        const { openapi, operation } = req.enforcer;
        const code = res.statusCode || 200;
        const headers = res.getHeaders();
        const v2 = openapi.hasOwnProperty('swagger');
        if (!headers['content-type'] && !v2) {
            const [types] = operation.getResponseContentTypeMatches(code, req.headers.accept || '*/*');
            if (types) {
                const type = types[0];
                res.set('content-type', type);
                headers['content-type'] = type;
            }
        }
        const bodyValue = openapi.enforcerData.context.Schema.Value(body);
        const [response, exception] = operation.response(code, bodyValue, Object.assign({}, headers));
        if (exception) {
            res.status(500);
            if (opts.handleBadResponse) {
                const err = Error(exception.toString());
                console.error(err.stack);
                res.set('content-type', 'text/plain');
                res.send('Internal server error');
            }
            else {
                next(errorFromException(exception));
            }
            return;
        }
        Object.keys(response.headers).forEach(header => res.set(header, extractValue(response.headers[header])));
        if (response.hasOwnProperty('body')) {
            const sendObject = response.schema && response.schema.type
                ? ['array', 'object'].indexOf(response.schema.type) !== -1
                : typeof response.body === 'object';
            res.send(sendObject ? response.body : String(response.body));
        }
        else {
            res.send();
        }
    };
}
exports.sender = sender;
exports.optionValidators = {
    validatorQueryParams,
    validatorBoolean,
    validatorNonEmptyString,
    validatorString
};
function copy2(value, map) {
    const exists = map.get(value);
    if (exists)
        return exists;
    if (Array.isArray(value)) {
        const result = [];
        map.set(value, result);
        value.forEach(v => {
            result.push(copy2(v, map));
        });
        return result;
    }
    else if (value && typeof value === 'object' && value.constructor.name === 'Object') {
        const result = {};
        map.set(value, result);
        Object.keys(value).forEach(key => {
            result[key] = copy2(value, map);
        });
        return result;
    }
    else {
        return value;
    }
}
function isArrayOf(value, type) {
    if (!Array.isArray(value))
        return false;
    const length = value.length;
    for (let i = 0; i < length; i++) {
        const t = typeof value[i];
        if (t !== type)
            return false;
    }
    return true;
}
function validatorQueryParams(v) {
    if (typeof v === 'boolean' || isArrayOf(v, 'string'))
        return '';
    return 'Expected a boolean or an array of strings.';
}
function validatorBoolean(v) {
    return typeof v !== 'boolean' ? 'Expected a boolean' : '';
}
function validatorNonEmptyString(v) {
    return (!v || typeof v !== 'string') ? 'Expected a non-empty string' : '';
}
function validatorString(v) {
    return typeof v !== 'string' ? 'Expected a string' : '';
}
//# sourceMappingURL=util2.js.map