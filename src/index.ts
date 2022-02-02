import { on } from './events'
import { routeBuilder, Controllers } from './route-builder'
import { init } from "./init"
import { mockMiddleware } from "./mock"
import * as I from './interfaces'
import { docsMiddleware, PartialDocsOptions } from './docs'

export { Controllers as RouteControllersMap, ControllersMap as RouteControllerMap } from './route-builder'
export { RouteBuilderOptions as RouteOptions, MiddlewareOptions as InitOptions } from './interfaces'
export { PartialDocsOptions as DocsOptions } from './docs'

export default function OpenAPIEnforcerMiddleware (openapi: any) {
    return {
        docs (options?: Partial<PartialDocsOptions>) {
            return docsMiddleware(openapi, options)
        },
        init (options?: I.MiddlewareOptions): I.Middleware {
            return init(openapi, options)
        },
        mock () {
            return mockMiddleware()
        },
        on,
        route (controllers: Controllers, options?: I.RouteBuilderOptions) {
            return routeBuilder(openapi, controllers, options)
        }
    }
}

module.exports = OpenAPIEnforcerMiddleware
