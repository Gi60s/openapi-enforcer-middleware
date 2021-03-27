"use strict";
const events_1 = require("./events");
const route_builder_1 = require("./route-builder");
const init_1 = require("./init");
const mock_1 = require("./mock");
const docs_1 = require("./docs");
function OpenAPIEnforcerMiddleware(enforcerPromise) {
    return {
        docs(options) {
            return docs_1.docsMiddleware(enforcerPromise, options);
        },
        init(options) {
            return init_1.init(enforcerPromise, options);
        },
        mock() {
            return mock_1.mockMiddleware();
        },
        on: events_1.on,
        route(controllers, dependencies, options) {
            return route_builder_1.routeBuilder(enforcerPromise, controllers, dependencies, options);
        }
    };
}
OpenAPIEnforcerMiddleware.default = OpenAPIEnforcerMiddleware;
module.exports = OpenAPIEnforcerMiddleware;
//# sourceMappingURL=index.js.map