"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.on = exports.emit = void 0;
const handlers = {};
function emit(type, ...args) {
    if (handlers[type]) {
        process.nextTick(() => {
            handlers[type].forEach(f => {
                f(...args);
            });
        });
    }
}
exports.emit = emit;
function on(type, handler) {
    if (!handlers[type])
        handlers[type] = [];
    handlers[type].push(handler);
}
exports.on = on;
//# sourceMappingURL=events.js.map