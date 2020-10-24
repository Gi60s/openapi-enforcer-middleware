"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.init = void 0;
const util2_1 = require("./util2");
const mock_1 = require("./mock");
const cookie_store_1 = __importDefault(require("./cookie-store"));
const { validatorBoolean, validatorString, validatorNonEmptyString, validatorQueryParams } = util2_1.optionValidators;
function init(enforcerPromise, options) {
    const opts = util2_1.normalizeOptions(options, {
        defaults: {
            allowOtherQueryParameters: false,
            handleBadRequest: true,
            handleBadResponse: true,
            handleNotFound: true,
            handleMethodNotAllowed: true,
            mockHeader: 'x-mock',
            mockQuery: 'x-mock',
            mockStore: cookie_store_1.default(),
            xMockImplemented: 'x-mock-implemented'
        },
        required: [],
        validators: {
            allowOtherQueryParameters: validatorQueryParams,
            handleBadRequest: validatorBoolean,
            handleBadResponse: validatorBoolean,
            handleNotFound: validatorBoolean,
            handleMethodNotAllowed: validatorBoolean,
            mockHeader: validatorString,
            mockQuery: validatorString,
            mockStore: (v) => {
                const message = 'Expected an object with the properties get and set as functions.';
                if (!v || typeof v !== 'object')
                    return message;
                if (typeof v.get !== 'function')
                    return message;
                if (typeof v.set !== 'function')
                    return message;
                return '';
            },
            xMockImplemented: validatorNonEmptyString
        }
    });
    return function (req, res, next) {
        enforcerPromise
            .then(openapi => {
            const relativePath = ('/' + req.originalUrl.substring(req.baseUrl.length)).replace(/^\/{2}/, '/');
            const hasBody = util2_1.reqHasBody(req);
            const requestObj = {
                headers: req.headers,
                method: req.method,
                path: relativePath
            };
            if (hasBody)
                requestObj.body = req.body;
            if (opts.allowOtherQueryParameters === false)
                opts.allowOtherQueryParameters = [];
            if (opts.allowOtherQueryParameters !== true && opts.mockQuery)
                opts.allowOtherQueryParameters.push(opts.mockQuery);
            const [request, error] = openapi.request(requestObj, { allowOtherQueryParameters: opts.allowOtherQueryParameters });
            if (request) {
                if (req.cookies)
                    mergeNewProperties(req.cookies, request.cookie);
                mergeNewProperties(req.headers, request.headers);
                mergeNewProperties(req.query, request.query);
            }
            if (error) {
                util2_1.handleRequestError(opts, error, res, next);
            }
            else {
                const { body, cookie, headers, operation, path, query, response } = request;
                req.enforcer = {
                    accepts(responseCode) {
                        return operation.getResponseContentTypeMatches(responseCode, headers.accept || '*/*');
                    },
                    cookies: cookie,
                    headers,
                    openapi,
                    operation,
                    options: opts,
                    params: path,
                    response,
                    query
                };
                if (hasBody)
                    req.enforcer.body = body;
                res.enforcer = {
                    send: util2_1.sender(opts, req, res, next)
                };
                const mockMode = mock_1.getMockMode(req);
                if (mockMode) {
                    const mockStore = opts.mockStore;
                    req.enforcer.mockMode = mockMode;
                    req.enforcer.mockStore = {
                        get(key) {
                            return mockStore.get(req, res, key);
                        },
                        set(key, value) {
                            return mockStore.set(req, res, key, value);
                        }
                    };
                    if (hasImplementedMock(opts.xMockImplemented, operation) && (mockMode.source === 'implemented' || mockMode.source === '')) {
                        next();
                    }
                    else {
                        mock_1.mockHandler(req, res, next, mockMode);
                    }
                }
                else {
                    next();
                }
            }
        })
            .catch(err => {
            next(err);
        });
    };
}
exports.init = init;
function mergeNewProperties(src, dest) {
    Object.keys(src).forEach(key => {
        if (!dest.hasOwnProperty(key))
            dest[key] = src[key];
    });
}
function hasImplementedMock(mockKey, operation) {
    if (mockKey in operation)
        return !!operation[mockKey];
    let data = operation.enforcerData;
    while (data) {
        data = data.parent;
        if (data && mockKey in data.result)
            return !!data.result[mockKey];
    }
    return false;
}
//# sourceMappingURL=init.js.map