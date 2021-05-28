"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.on = exports.emit = void 0;
const debug_1 = __importDefault(require("debug"));
const debug = debug_1.default('openapi-enforcer-middleware:events');
const handlers = {};
function emit(type, ...args) {
    debug('Event emitted: ' + type, ...args);
    process.nextTick(() => {
        if (handlers[type]) {
            handlers[type].forEach(f => {
                f(...args);
            });
        }
    });
}
exports.emit = emit;
function on(type, handler) {
    if (!handlers[type])
        handlers[type] = [];
    handlers[type].push(handler);
    debug('Subscribed to event: ' + type + ' ' + handler.toString());
}
exports.on = on;
//# sourceMappingURL=events.js.map