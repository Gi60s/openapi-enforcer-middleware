"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const store = {};
let cookieIndex = 0;
let lastCookieTimeStamp = 0;
function default_1() {
    return {
        async getData(req, _res) {
            const id = getCookie(req.headers);
            if (!id)
                return {};
            const data = store[id];
            return JSON.parse(data);
        },
        async setData(req, res, data) {
            let id = getCookie(req.headers);
            if (!id) {
                const now = Date.now();
                if (now !== lastCookieTimeStamp) {
                    cookieIndex = 0;
                    lastCookieTimeStamp = now;
                }
                id = now + '-' + cookieIndex++;
                res.cookie('enforcer-store', id);
            }
            store[id] = data;
        }
    };
}
exports.default = default_1;
function getCookie(headers) {
    const name = "enforcer-store=";
    const decodedCookie = decodeURIComponent(headers.cookie || '');
    const ca = decodedCookie.split(';');
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) == ' ')
            c = c.substring(1);
        if (c.indexOf(name) === 0)
            return c.substring(name.length, c.length);
    }
    return "";
}
//# sourceMappingURL=cookie-store.js.map