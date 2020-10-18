"use strict";
const events_1 = require("./events");
const route_builder_1 = require("./route-builder");
const init_1 = require("./init");
const mock_1 = require("./mock");
function OpenAPIEnforcerMiddleware(enforcerPromise) {
    return {
        init(options) {
            return init_1.init(enforcerPromise, options);
        },
        mock() {
            return mock_1.mockMiddleware();
        },
        on: events_1.on,
        route(controllersDir, options) {
            return route_builder_1.routeBuilder(enforcerPromise, controllersDir, options);
        }
    };
}
OpenAPIEnforcerMiddleware.default = OpenAPIEnforcerMiddleware;
module.exports = OpenAPIEnforcerMiddleware;
//# sourceMappingURL=index.js.map