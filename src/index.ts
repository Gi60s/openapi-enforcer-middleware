import { on } from './events'
import { routeBuilder, ControllerReference, IDependencies } from './route-builder'
import { init } from "./init"
import { mockMiddleware } from "./mock"
import * as I from './interfaces'
import { docsMiddleware, DocsOptions } from './docs'

export = OpenAPIEnforcerMiddleware

function OpenAPIEnforcerMiddleware (enforcerPromise: Promise<any>) {
    return {
        // TODO: Uses the RedocRawOptions object (from redoc pacakge) instead of Record.
        docs(options?: Partial<DocsOptions>) {
            return docsMiddleware(enforcerPromise, options)
        },
        init (options?: I.MiddlewareOptions): I.Middleware {
            return init(enforcerPromise, options)
        },
        mock () {
            return mockMiddleware()
        },
        on,
        route (controllers: string | Record<string, ControllerReference>, dependencies?: IDependencies, options?: I.RouteBuilderOptions) {
            return routeBuilder(enforcerPromise, controllers, dependencies, options)
        }
    }
}

OpenAPIEnforcerMiddleware.default = OpenAPIEnforcerMiddleware
