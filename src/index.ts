import { controller } from './controller'
import { routeEnforcer } from "./route-enforcer"
import { mockMiddleware } from "./mock"

export default {
    buildRoutes: controller,
    init: routeEnforcer,
    mock
}

export const buildRoutes = controller

export const init = routeEnforcer

export function mock () {
    return mockMiddleware
}