"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const events_1 = require("./events");
const route_builder_1 = require("./route-builder");
const init_1 = require("./init");
const mock_1 = require("./mock");
const docs_1 = require("./docs");
function OpenAPIEnforcerMiddleware(openapi) {
    return {
        docs(options) {
            return docs_1.docsMiddleware(openapi, options);
        },
        init(options) {
            return init_1.init(openapi, options);
        },
        mock() {
            return mock_1.mockMiddleware();
        },
        on: events_1.on,
        route(controllers, options) {
            return route_builder_1.routeBuilder(openapi, controllers, options);
        }
    };
}
exports.default = OpenAPIEnforcerMiddleware;
module.exports = OpenAPIEnforcerMiddleware;
//# sourceMappingURL=index.js.map