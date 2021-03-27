"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const debug_1 = __importDefault(require("debug"));
const debug = debug_1.default('openapi-enforcer-middleware:cookie-store');
const store = {};
let cookieIndex = 0;
let lastCookieTimeStamp = 0;
function default_1() {
    return {
        async get(req, res, key) {
            const id = getCookie(req.headers);
            if (id) {
                debug('ID retrieved from cookie: ' + id);
                const data = store[id];
                if (!data) {
                    debug('Nothing in store for ID: ' + id);
                }
                else if (key in data) {
                    return data[key];
                }
                else {
                    debug('No data for ID ' + id + ' at key: ' + key);
                }
            }
            else {
                createStore(res);
            }
        },
        async set(req, res, key, value) {
            let id = getCookie(req.headers) || createStore(res);
            if (!store[id]) {
                store[id] = {};
                debug('Store initialized for ID: ' + id);
            }
            store[id][key] = value;
            debug('Stored data for ID ' + id + ' at key: ' + key);
        }
    };
}
exports.default = default_1;
function createStore(res) {
    const now = Date.now();
    if (now !== lastCookieTimeStamp) {
        cookieIndex = 0;
        lastCookieTimeStamp = now;
    }
    const id = now + '-' + cookieIndex++;
    res.cookie('enforcer-store', id);
    store[id] = {};
    debug('Store created for id: ' + id);
    return id;
}
function getCookie(headers) {
    const name = "enforcer-store=";
    const decodedCookie = decodeURIComponent(headers.cookie || '');
    const ca = decodedCookie.split(';');
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) === ' ')
            c = c.substring(1);
        if (c.indexOf(name) === 0)
            return c.substring(name.length, c.length);
    }
    return "";
}
//# sourceMappingURL=cookie-store.js.map