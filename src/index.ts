import { on } from './events'
import { routeBuilder, IDependencies } from './route-builder'
import { init } from "./init"
import { mockMiddleware } from "./mock"
import * as I from './interfaces'
import { docsMiddleware } from './docs'

export = OpenAPIEnforcerMiddleware

function OpenAPIEnforcerMiddleware (enforcerPromise: Promise<any>) {
    return {
        // TODO: Uses the RedocRawOptions object (from redoc pacakge) instead of Record.
        docs(specUrlPath: string, serverPort: number, redocOptions: Record<string, unknown>) {
            return docsMiddleware(enforcerPromise, specUrlPath, serverPort, redocOptions)
        },
        init (options?: I.MiddlewareOptions): I.Middleware {
            return init(enforcerPromise, options)
        },
        mock () {
            return mockMiddleware()
        },
        on,
        route (controllersDir: string, dependencies?: IDependencies, options?: I.RouteBuilderOptions) {
            return routeBuilder(enforcerPromise, controllersDir, dependencies, options)
        }
    }
}

OpenAPIEnforcerMiddleware.default = OpenAPIEnforcerMiddleware
