"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.init = exports.getInitStatus = void 0;
const debug_1 = __importDefault(require("debug"));
const util2_1 = require("./util2");
const mock_1 = require("./mock");
const cookie_store_1 = __importDefault(require("./cookie-store"));
const { validatorBoolean, validatorString, validatorNonEmptyString, validatorQueryParams } = util2_1.optionValidators;
const activeRequestMap = new WeakMap();
const debug = debug_1.default('openapi-enforcer-middleware:init');
function getInitStatus(req) {
    const path = activeRequestMap.get(req);
    debug('Comparing initialized base URL ' + path + ' to original URL ' + req.originalUrl);
    return {
        initialized: path !== undefined,
        basePathMatch: req.originalUrl.startsWith(path || '')
    };
}
exports.getInitStatus = getInitStatus;
function init(openapi, options) {
    const opts = util2_1.normalizeOptions(options, {
        defaults: {
            allowOtherQueryParameters: false,
            baseUrl: null,
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
            baseUrl: v => typeof v !== 'string' && v !== null ? 'Expected a string or null' : '',
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
    debug('Initialized with options: ' + JSON.stringify(opts, null, 2));
    return function (req, res, next) {
        const baseUrl = typeof opts.baseUrl === 'string' ? opts.baseUrl : req.baseUrl;
        debug('Register request base URL: ' + baseUrl);
        activeRequestMap.set(req, baseUrl);
        const relativePath = ('/' + req.originalUrl.substring(baseUrl.length)).replace(/^\/{2}/, '/');
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
            debug('Request failed validation', error);
        }
        else {
            debug('Request valid');
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
                send: util2_1.sender(opts, req, res, next),
                status(code) {
                    res.status(code);
                    return this;
                }
            };
            const mockMode = mock_1.getMockMode(req);
            if (mockMode) {
                const mockStore = opts.mockStore;
                debug('Request is for mocked data');
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
                    debug('Request has implemented mock');
                    next();
                }
                else {
                    debug('Request being auto mocked');
                    mock_1.mockHandler(req, res, next, mockMode);
                }
            }
            else {
                next();
            }
        }
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